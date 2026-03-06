"use client";
import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DiceRollerProps {
  campaignId: string;
  onReady: (rollFunction: (diceType: string, isSecret: boolean) => Promise<number | null>) => void;
  isDM: boolean;
  currentUserId: string | null;
}

interface ActiveRoll {
  id: string;
  diceType: string;
  value: number;
  isSecret: boolean;
  phase: 'rolling' | 'result';
}

const DICE_COLORS: Record<string, string> = {
  d20: '#ef4444', d12: '#f97316', d10: '#eab308',
  d8:  '#22c55e', d6:  '#3b82f6', d4:  '#a855f7', d100: '#9ca3af',
};

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const supabase       = createClient();
  const initializedRef = useRef(false);
  const diceBoxRef     = useRef<any>(null);
  const clearTimerRef  = useRef<NodeJS.Timeout | null>(null);

  const [activeRolls, setActiveRolls] = useState<ActiveRoll[]>([]);

  // Refs para manter os valores corretos dentro dos handlers do canal Realtime
  const isDMRef          = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; },                [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // Animação CSS para receptores — exibe o emoji girando e depois revela o número
  const showRemoteAnimation = useCallback((diceType: string, value: number, isSecret: boolean) => {
    const id = `${Date.now()}-${Math.random()}`;

    setActiveRolls(prev => [...prev, { id, diceType, value, isSecret, phase: 'rolling' }]);

    setTimeout(() => {
      setActiveRolls(prev => prev.map(r => r.id === id ? { ...r, phase: 'result' } : r));
    }, 1200);

    setTimeout(() => {
      setActiveRolls(prev => prev.filter(r => r.id !== id));
    }, 3500);
  }, []);

  // Animação 3D via dice-box — usada apenas por quem rolou
  const triggerLocalRoll = useCallback(async (diceType: string, isSecret: boolean) => {
    if (!diceBoxRef.current) return null;

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    await diceBoxRef.current.clear();

    const themeColor = isSecret ? '#ef4444' : (DICE_COLORS[diceType] ?? '#00ff66');
    const sides      = parseInt(diceType.replace('d', ''));

    const result = await diceBoxRef.current.roll([{ qty: 1, sides, themeColor }]);

    clearTimerRef.current = setTimeout(() => diceBoxRef.current?.clear(), 4000);

    return result[0].value as number;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        // Inicializa o motor 3D de dados
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

        // Canal por campanha — broadcasts de outras mesas nunca chegam aqui
        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId, value } = payload.payload;

            // Ignora o próprio eco — quem rolou já viu o dado 3D localmente
            if (senderId === currentUserIdRef.current) return;

            // Rolagem secreta de jogador: só o mestre recebe
            if (isSecret && !isDMRef.current) return;

            showRemoteAnimation(diceType, value, isSecret);
          })
          .subscribe();

        onReady(async (diceType: string, isSecret: boolean) => {
          // Quem rola vê o dado 3D — resultado vem da física local
          const value = await triggerLocalRoll(diceType, isSecret);
          if (value === null) return null;

          // Rolagem secreta do mestre: não envia ao canal, só ele vê
          if (isSecret && isDMRef.current) return value;

          // Envia o resultado para os receptores elegíveis
          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserIdRef.current, value },
          });

          return value;
        });

        return () => { supabase.removeChannel(channel); };
      } catch (e) {
        console.error('[DiceRoller] Falha na inicialização:', e);
      }
    };

    init();
  }, [campaignId, onReady, triggerLocalRoll, showRemoteAnimation, supabase]);

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

        @keyframes diceRoll {
          0%   { transform: translate(-50%, -50%) scale(0.3) rotate(-30deg); opacity: 0; }
          20%  { transform: translate(-50%, -50%) scale(1.2) rotate(15deg);  opacity: 1; }
          50%  { transform: translate(-50%, -50%) scale(0.9) rotate(-8deg);  opacity: 1; }
          70%  { transform: translate(-50%, -50%) scale(1.05) rotate(3deg);  opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1)   rotate(0deg);   opacity: 1; }
        }

        @keyframes resultPop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }

        @keyframes fadeOut {
          0%   { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
        }

        .dice-anim-wrap {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9998;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .dice-anim-wrap.rolling {
          animation: diceRoll 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        .dice-anim-wrap.result {
          animation: fadeOut 2.3s ease-in 0s forwards;
        }

        .dice-anim-icon {
          font-size: 96px;
          line-height: 1;
          filter: drop-shadow(0 0 40px currentColor);
        }

        .dice-anim-rolling-dots {
          font-size: 48px;
          letter-spacing: 8px;
          filter: drop-shadow(0 0 20px currentColor);
        }

        .dice-anim-value {
          font-size: 80px;
          font-weight: 900;
          font-family: serif;
          line-height: 1;
          text-shadow:
            0 0 40px currentColor,
            0 0 80px currentColor,
            0 2px 10px rgba(0,0,0,0.9);
          animation: resultPop 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        .dice-anim-label {
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 6px;
          opacity: 0.8;
        }

        .dice-anim-secret-badge {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 4px;
          opacity: 0.6;
          border: 1px solid currentColor;
          padding: 2px 8px;
          border-radius: 999px;
        }
      `}</style>

      {/* Canvas do dice-box — usado apenas por quem rola */}
      <div id="dice-box" className="fixed inset-0 pointer-events-none z-[9999]" />

      {/* Animação CSS para receptores */}
      {activeRolls.map(roll => {
        const color = roll.isSecret ? '#ef4444' : (DICE_COLORS[roll.diceType] ?? '#00ff66');
        return (
          <div key={roll.id} className={`dice-anim-wrap ${roll.phase}`} style={{ color }}>
            {roll.phase === 'rolling' ? (
              <>
                <div className="dice-anim-icon">🎲</div>
                <div className="dice-anim-rolling-dots">• • •</div>
                <div className="dice-anim-label">{roll.diceType}</div>
              </>
            ) : (
              <>
                <div className="dice-anim-value">{roll.value}</div>
                <div className="dice-anim-label">{roll.diceType}</div>
                {roll.isSecret && <div className="dice-anim-secret-badge">secreto</div>}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}