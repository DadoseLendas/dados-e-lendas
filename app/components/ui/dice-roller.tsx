"use client";
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DiceRollerProps {
  campaignId: string;
  onReady: (rollFunction: (diceType: string, isSecret: boolean) => Promise<number | null>) => void;
  isDM: boolean;
  currentUserId: string | null;
}

// Mapeamento das cores para combinar com os botões do seu chat
const DICE_COLORS: Record<string, string> = {
  d20: '#ef4444', // Vermelho
  d12: '#f97316', // Laranja
  d10: '#eab308', // Amarelo
  d8:  '#22c55e', // Verde
  d6:  '#3b82f6', // Azul
  d4:  '#a855f7', // Roxo
  d100:'#9ca3af'  // Cinza
};

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const initializedRef = useRef(false);
  const diceBoxRef     = useRef<any>(null);
  const supabase       = createClient();

  const dmIdRef = useRef<string | null>(null);

  const triggerVisualRoll = useCallback(async (diceType: string, isSecret: boolean) => {
    if (!diceBoxRef.current) return null;
    const sides  = parseInt(diceType.replace('d', ''));
    
    // Se for secreto, o dado 3D fica vermelho escuro/vivo. Se não, usa a cor padrão dele.
    const themeColor = isSecret ? '#ef4444' : (DICE_COLORS[diceType] || '#00ff66');

    const result = await diceBoxRef.current.roll([{ qty: 1, sides, themeColor }]);
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

        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId } = payload.payload;

            if (senderId === currentUserId) return; // Ignora o eco de si mesmo

            // REGRA DEFINITIVA DE VISIBILIDADE:
            // Se for secreto e eu não for o Mestre, eu não vejo o dado caindo.
            if (isSecret && !isDM) return;

            triggerVisualRoll(diceType, isSecret);
          })
          .subscribe();

        onReady(async (diceType: string, isSecret: boolean) => {
          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserId },
          });

          return await triggerVisualRoll(diceType, isSecret);
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