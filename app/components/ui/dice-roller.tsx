"use client";
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DiceRollerProps {
  campaignId: string;
  onReady: (rollFunction: (diceType: string, isSecret: boolean) => Promise<number | null>) => void;
  isDM: boolean;
  currentUserId: string | null;
}

const DICE_COLORS: Record<string, string> = {
  d20: '#ef4444', d12: '#f97316', d10: '#eab308',
  d8:  '#22c55e', d6:  '#3b82f6', d4:  '#a855f7', d100:'#9ca3af'
};

interface RollPhysics {
  value: number;
  spinForce: number;
  throwForce: number;
}

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const initializedRef = useRef(false);
  const diceBoxRef     = useRef<any>(null);
  const clearTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const supabase       = createClient();

  // MANTÉM AS REGRAS DE VISIBILIDADE SEMPRE ATUALIZADAS PARA O WEBSOCKET
  const isDMRef = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; }, [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const triggerVisualRoll = useCallback(async (
  diceType: string,
  isSecret: boolean,
  physics: RollPhysics,
) => {
  if (!diceBoxRef.current) return null;

  if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
  await diceBoxRef.current.clear();

  const themeColor = isSecret ? '#ef4444' : (DICE_COLORS[diceType] ?? '#00ff66');
  const sides      = parseInt(diceType.replace('d', ''));

  // Sincroniza a física antes de rolar — garante animação idêntica em todos os clientes
  diceBoxRef.current.spinForce  = physics.spinForce;
  diceBoxRef.current.throwForce = physics.throwForce;

  const result = await diceBoxRef.current.roll([{
    qty: 1,
    sides,
    themeColor,
    value: physics.value,
  }]);

  clearTimerRef.current = setTimeout(() => diceBoxRef.current?.clear(), 4000);

  return result[0].value as number;
}, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
      try {
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
            const { diceType, isSecret, senderId, physics } = payload.payload;

            if (senderId === currentUserIdRef.current) return;
            if (isSecret && !isDMRef.current) return;

            triggerVisualRoll(diceType, isSecret, physics);
          })
          .subscribe();

        onReady(async (diceType: string, isSecret: boolean) => {
          const sides = parseInt(diceType.replace('d', ''));

          // Parâmetros gerados localmente — aleatórios para quem rola,
          // replicados nos outros para garantir a mesma animação
          const physics: RollPhysics = {
            value:      Math.floor(Math.random() * sides) + 1,
            spinForce:  3 + Math.random() * 6,
            throwForce: 3 + Math.random() * 5,
          };

          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserIdRef.current, physics },
          });

          return await triggerVisualRoll(diceType, isSecret, physics);
        });

        return () => { supabase.removeChannel(channel); };
      } catch (e) {
        console.error('[DiceRoller] Falha na inicialização:', e);
      }
    };

    initDice();
  }, [campaignId, onReady, triggerVisualRoll, supabase]);

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