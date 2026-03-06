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
  phase: 'intro' | 'spinning' | 'result' | 'outro';
}

const DICE_COLORS: Record<string, string> = {
  d20: '#ef4444', d12: '#f97316', d10: '#eab308',
  d8:  '#22c55e', d6:  '#3b82f6', d4:  '#a855f7', d100: '#9ca3af',
};

const D6_FACE_ROTATIONS: Record<number, string> = {
  1: 'rotateY(0deg)   rotateX(0deg)',
  2: 'rotateY(180deg) rotateX(0deg)',
  3: 'rotateY(-90deg) rotateX(0deg)',
  4: 'rotateY(90deg)  rotateX(0deg)',
  5: 'rotateX(-90deg) rotateY(0deg)',
  6: 'rotateX(90deg)  rotateY(0deg)',
};

const isCubic = (diceType: string) => diceType === 'd6';

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const supabase       = createClient();
  const initializedRef = useRef(false);
  const [activeRolls, setActiveRolls] = useState<ActiveRoll[]>([]);

  const isDMRef          = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; },                [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const showAnimation = useCallback((diceType: string, value: number, isSecret: boolean) => {
    const id = `${Date.now()}-${Math.random()}`;

    setActiveRolls(prev => [...prev, { id, diceType, value, isSecret, phase: 'intro' }]);

    setTimeout(() => {
      setActiveRolls(prev => prev.map(r => r.id === id ? { ...r, phase: 'spinning' } : r));
    }, 300);

    setTimeout(() => {
      setActiveRolls(prev => prev.map(r => r.id === id ? { ...r, phase: 'result' } : r));
    }, 1800);

    setTimeout(() => {
      setActiveRolls(prev => prev.map(r => r.id === id ? { ...r, phase: 'outro' } : r));
    }, 3800);

    setTimeout(() => {
      setActiveRolls(prev => prev.filter(r => r.id !== id));
    }, 4300);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      try {
        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId, value } = payload.payload;

            /**
             * O canal é a fonte de verdade para todos — inclusive o próprio rolador.
             * Regras de visibilidade aplicadas aqui:
             * - Pública:            todos veem
             * - Secreta de jogador: só o próprio jogador e o mestre veem
             * - Secreta do mestre:  não chega ao canal (tratado no onReady)
             */
            const isOwnRoll = senderId === currentUserIdRef.current;
            const userIsDM  = isDMRef.current;

            if (isSecret && !isOwnRoll && !userIsDM) return;

            showAnimation(diceType, value, isSecret);
          })
          .subscribe();

        onReady(async (diceType: string, isSecret: boolean) => {
          const sides = parseInt(diceType.replace('d', ''));
          const value = Math.floor(Math.random() * sides) + 1;

          // Rolagem secreta do mestre: não entra no canal, só ele anima
          if (isSecret && isDMRef.current) {
            showAnimation(diceType, value, true);
            return value;
          }

          // Todos os outros casos: o canal dispara a animação para todos,
          // inclusive o próprio rolador — ninguém anima localmente
          await channel.send({
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
  }, [campaignId, onReady, showAnimation, supabase]);

  return (
    <>
      <style jsx global>{`
        .dr-wrap {
          position: fixed;
          top: 50%;
          left: 50%;
          z-index: 9999;
          pointer-events: none;
          perspective: 600px;
          transform: translate(-50%, -50%);
        }

        .dr-scene {
          width: 120px;
          height: 120px;
          position: relative;
          transform-style: preserve-3d;
        }

        .dr-wrap.intro .dr-scene {
          animation: drIntro 0.3s ease-out forwards;
        }

        .dr-wrap.spinning .dr-scene {
          animation: drSpin 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .dr-wrap.result .dr-scene {
          animation: none;
        }

        .dr-wrap.outro .dr-scene {
          animation: drOutro 0.5s ease-in forwards;
        }

        @keyframes drIntro {
          0%   { transform: scale(0.2) rotateX(-60deg) rotateY(-60deg); opacity: 0; }
          100% { transform: scale(1)   rotateX(-20deg) rotateY(-20deg); opacity: 1; }
        }

        @keyframes drSpin {
          0%   { transform: scale(1)    rotateX(-20deg)  rotateY(-20deg);  }
          30%  { transform: scale(1.15) rotateX(-400deg) rotateY(380deg);  }
          60%  { transform: scale(1.05) rotateX(-680deg) rotateY(720deg);  }
          100% { transform: scale(1)    rotateX(-720deg) rotateY(1080deg); }
        }

        @keyframes drOutro {
          0%   { transform: scale(1)   translateY(0);     opacity: 1; }
          100% { transform: scale(0.6) translateY(-40px); opacity: 0; }
        }

        .dr-face {
          position: absolute;
          width: 120px;
          height: 120px;
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: 900;
          font-family: serif;
          backface-visibility: visible;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }

        .dr-face-front  { transform: translateZ(60px); }
        .dr-face-back   { transform: rotateY(180deg) translateZ(60px); }
        .dr-face-right  { transform: rotateY(90deg)  translateZ(60px); }
        .dr-face-left   { transform: rotateY(-90deg) translateZ(60px); }
        .dr-face-top    { transform: rotateX(90deg)  translateZ(60px); }
        .dr-face-bottom { transform: rotateX(-90deg) translateZ(60px); }

        .dr-poly {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          border-radius: 50%;
          background: rgba(0,0,0,0.8);
          border: 2px solid rgba(255,255,255,0.15);
          box-shadow: inset 0 0 30px rgba(0,0,0,0.6);
        }

        .dr-poly-value {
          font-size: 48px;
          font-weight: 900;
          font-family: serif;
          line-height: 1;
        }

        .dr-poly-label {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 4px;
          opacity: 0.7;
        }

        .dr-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 180px;
          height: 180px;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.35;
          pointer-events: none;
          z-index: -1;
        }

        .dr-secret-badge {
          position: absolute;
          bottom: -36px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 3px;
          white-space: nowrap;
          border: 1px solid currentColor;
          padding: 2px 10px;
          border-radius: 999px;
          opacity: 0.75;
        }

        .dr-wrap.result .dr-face,
        .dr-wrap.outro  .dr-face {
          box-shadow:
            inset 0 0 20px rgba(0,0,0,0.5),
            0 0 30px var(--dice-color),
            0 0 60px var(--dice-color);
        }

        .dr-wrap.result .dr-glow,
        .dr-wrap.outro  .dr-glow {
          opacity: 0.5;
        }
      `}</style>

      {activeRolls.map(roll => {
        const color  = roll.isSecret ? '#ef4444' : (DICE_COLORS[roll.diceType] ?? '#00ff66');
        const cubic  = isCubic(roll.diceType);
        const sides  = parseInt(roll.diceType.replace('d', ''));

        const finalRotation = cubic
          ? (D6_FACE_ROTATIONS[roll.value] ?? D6_FACE_ROTATIONS[1])
          : 'rotateX(0deg)';

        const faceValues = cubic ? (() => {
          const others = Array.from({ length: sides }, (_, i) => i + 1).filter(n => n !== roll.value);
          return {
            front:  roll.value,
            back:   others[0] ?? 2,
            right:  others[1] ?? 3,
            left:   others[2] ?? 4,
            top:    others[3] ?? 5,
            bottom: others[4] ?? 6,
          };
        })() : null;

        return (
          <div
            key={roll.id}
            className={`dr-wrap ${roll.phase}`}
            style={{ '--dice-color': color } as React.CSSProperties}
          >
            <div className="dr-glow" style={{ background: color }} />

            <div
              className="dr-scene"
              style={
                roll.phase === 'result' || roll.phase === 'outro'
                  ? { transform: finalRotation }
                  : undefined
              }
            >
              {cubic && faceValues ? (
                <>
                  <div className="dr-face dr-face-front"  style={{ color, borderColor: `${color}40` }}>{faceValues.front}</div>
                  <div className="dr-face dr-face-back"   style={{ color, borderColor: `${color}40` }}>{faceValues.back}</div>
                  <div className="dr-face dr-face-right"  style={{ color, borderColor: `${color}40` }}>{faceValues.right}</div>
                  <div className="dr-face dr-face-left"   style={{ color, borderColor: `${color}40` }}>{faceValues.left}</div>
                  <div className="dr-face dr-face-top"    style={{ color, borderColor: `${color}40` }}>{faceValues.top}</div>
                  <div className="dr-face dr-face-bottom" style={{ color, borderColor: `${color}40` }}>{faceValues.bottom}</div>
                </>
              ) : (
                <div className="dr-poly" style={{ borderColor: `${color}40` }}>
                  <div className="dr-poly-value" style={{ color }}>
                    {roll.phase === 'spinning' || roll.phase === 'intro' ? '?' : roll.value}
                  </div>
                  <div className="dr-poly-label" style={{ color }}>{roll.diceType}</div>
                </div>
              )}
            </div>

            {roll.isSecret && (
              <div className="dr-secret-badge" style={{ color, borderColor: color }}>
                secreto
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}