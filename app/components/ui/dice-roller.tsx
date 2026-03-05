"use client";
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DiceRollerProps {
  campaignId: string;
  onReady: (rollFunction: (diceType: string, isSecret: boolean) => Promise<number | null>) => void;
  isDM: boolean;
  currentUserId: string | null;
}

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const initializedRef = useRef(false);
  const diceBoxRef     = useRef<any>(null);
  const supabase       = createClient();

  // Cacheado na inicialização para evitar query a cada rolagem
  const dmIdRef = useRef<string | null>(null);

  const triggerVisualRoll = useCallback(async (diceType: string) => {
    if (!diceBoxRef.current) return null;
    const sides  = parseInt(diceType.replace('d', ''));
    const result = await diceBoxRef.current.roll([{ qty: 1, sides }]);
    setTimeout(() => diceBoxRef.current?.clear(), 3000);
    return result[0].value as number;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
      try {
        if (campaignId && campaignId !== '00000000-0000-0000-0000-000000000000') {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('dm_id')
            .eq('id', campaignId)
            .single();
          dmIdRef.current = campaign?.dm_id ?? null;
        }

        const { default: DiceBox } = await import('@3d-dice/dice-box');
        const box = new DiceBox({
          container: '#dice-box',
          assetPath: '/dice-box-assets/assets/',
          theme: 'default',
          scale: 5,
          gravity: 2.5,
          spinForce: 6,
          throwForce: 5,
        });
        await box.init();
        diceBoxRef.current = box;

        // Canal por campanha — impede que broadcasts de mesas distintas se cruzem
        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId } = payload.payload;

            if (senderId === currentUserId) return; // eco do próprio usuário

            const senderIsDM = senderId === dmIdRef.current;

            // Rolagem secreta do mestre: só ele vê
            // Rolagem secreta de jogador: só o mestre vê
            if (isSecret) {
              if (senderIsDM) return;
              if (!isDM) return;
            }

            triggerVisualRoll(diceType);
          })
          .subscribe();

        // Expõe a função ao componente pai; o retorno é o valor numérico do dado
        onReady(async (diceType: string, isSecret: boolean) => {
          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserId },
          });

          return await triggerVisualRoll(diceType);
        });

        return () => { supabase.removeChannel(channel); };
      } catch (e) {
        console.error('[DiceRoller] Falha na inicialização:', e);
      }
    };

    initDice();
  }, [campaignId, onReady, triggerVisualRoll, isDM, currentUserId, supabase]);

  return (
    <>
      <style jsx global>{`
        .dice-box-canvas {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 100vw !important;
          height: 100vh !important;
          object-fit: contain !important;
          pointer-events: none !important;
        }
      `}</style>
      <div id="dice-box" className="fixed inset-0 pointer-events-none z-[9999]" />
    </>
  );
}