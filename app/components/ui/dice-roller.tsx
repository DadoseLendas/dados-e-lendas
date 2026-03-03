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
  const diceBoxRef = useRef<any>(null);
  const supabase = createClient();

  // Função que executa a animação visual
  const triggerVisualRoll = useCallback(async (diceType: string) => {
    if (!diceBoxRef.current) return null;
    const result = await diceBoxRef.current.roll([{ qty: 1, sides: parseInt(diceType.replace('d', '')) }]);
    setTimeout(() => diceBoxRef.current.clear(), 3000);
    return result[0].value;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box');
        const box = new DiceBox({
          container: "#dice-box",
          assetPath: "/dice-box-assets/assets/",
          theme: "default",
          scale: 5,
          gravity: 2.5,
          spinForce: 6,
          throwForce: 5,
        });

        await box.init();
        diceBoxRef.current = box;

        // Inscrição no Realtime para ouvir rolagens de outros jogadores
        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId } = payload.payload;

            // Lógica de Visibilidade:
            // 1. Se não for secreta, todos rolam.
            // 2. Se for secreta, apenas o Mestre ou o próprio dono rolam.
            const shouldSee = !isSecret || isDM || senderId === currentUserId;

            if (shouldSee && senderId !== currentUserId) {
              triggerVisualRoll(diceType);
            }
          })
          .subscribe();

        // Passa a função de rolar para a Mesa, incluindo o envio do Broadcast
        onReady(async (diceType: string, isSecret: boolean) => {
          // Envia para os outros via Broadcast
          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserId },
          });

          // Rola para mim mesmo
          return await triggerVisualRoll(diceType);
        });

        return () => { supabase.removeChannel(channel); };
      } catch (e) { console.error(e); }
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
      <div id="dice-box" className="fixed inset-0 pointer-events-none z-[9999]"></div>
    </>
  );
}