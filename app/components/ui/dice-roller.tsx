"use client";
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DiceRollerProps {
  campaignId: string;
  onReady: (rollFunction: (diceType: string, isSecret: boolean) => Promise<number | null>) => void;
  isDM: boolean;
  currentUserId: string | null;
}

const COLORSETS: Record<string, string> = {
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
  const clearTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const rollCounterRef = useRef(0);
  const supabase       = createClient();

  const isDMRef = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; }, [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const triggerVisualRoll = useCallback(async (diceType: string, isSecret: boolean, forcedValue: number) => {
    if (!diceBoxRef.current) return null;

    const currentRollId = ++rollCounterRef.current;

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    
    if (diceBoxRef.current.clearDice) diceBoxRef.current.clearDice();
    else if (diceBoxRef.current.clear) diceBoxRef.current.clear();

    const hexColor = isSecret ? '#ef4444' : (COLORSETS[diceType] || '#ffffff');
    
    if (diceBoxRef.current.updateConfig) {
      await diceBoxRef.current.updateConfig({ 
        theme_colorset: "custom",
        theme_customColorset: {
          background: hexColor,
          foreground: '#ffffff',
          texture: 'none'
        }
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    } else if (diceBoxRef.current.config) {
      diceBoxRef.current.config.theme_customColorset = { background: hexColor, foreground: '#ffffff', texture: 'none' };
    }

    let notation = `1${diceType}@${forcedValue}`;
    
    if (diceType === 'd100') {
      const tens = Math.floor((forcedValue % 100) / 10) * 10;
      const ones = forcedValue % 10 === 0 ? 10 : (forcedValue % 10);
      notation = `1d100+1d10@${tens},${ones}`;
    }

    await diceBoxRef.current.roll(notation);

    if (currentRollId === rollCounterRef.current) {
      clearTimerRef.current = setTimeout(() => {
        if (diceBoxRef.current?.clearDice) diceBoxRef.current.clearDice();
        else if (diceBoxRef.current?.clear) diceBoxRef.current.clear();
      }, 4000); 
    }

    return forcedValue;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box-threejs');
        
        const box = new DiceBox("#dice-box", {
          assetPath: '/',
          framerate: (1/60),
          sounds: true,
          volume: 50,
          color_spotlight: 0xefdfd5,
          shadows: true,
          theme_material: "glass",
          theme_colorset: "white",
          gravity_multiplier: 600,
          baseScale: 80,
          strength: 2
        });
        
        await box.initialize();
        diceBoxRef.current = box;

        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId, value } = payload.payload;
            if (senderId === currentUserIdRef.current) return;
            if (isSecret && !isDMRef.current) return;
            triggerVisualRoll(diceType, isSecret, value);
          })
          .subscribe();

        // --- ABAIXO A LÓGICA ATUALIZADA PARA ACEITAR FÓRMULAS ---
        onReady(async (formula: string, isSecret: boolean) => {
          // 1. Limpa a string e tenta identificar se é uma fórmula (ex: 2d6+3)
          const cleanFormula = formula.toLowerCase().replace(/\s+/g, '');
          const regex = /^(\d+)d(\d+)([+-]\d+)?$/;
          const match = cleanFormula.match(regex);

          let diceType: string;
          let rollValue: number;

          if (match) {
            // Caso seja uma fórmula complexa
            const qtd = parseInt(match[1]);
            const faces = parseInt(match[2]);
            const mod = match[3] ? parseInt(match[3]) : 0;
            
            diceType = `d${faces}`;
            let sum = 0;
            for (let i = 0; i < qtd; i++) {
              sum += Math.floor(Math.random() * faces) + 1;
            }
            rollValue = sum + mod;
          } else {
            // Caso seja um dado simples (ex: "d20")
            diceType = formula.startsWith('d') ? formula : `d${formula}`;
            const sides = parseInt(diceType.replace('d', ''));
            rollValue = Math.floor(Math.random() * sides) + 1;
          }

          // Envia o resultado final via broadcast
          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserIdRef.current, value: rollValue },
          });

          // Dispara a animação visual (usando o valor final como resultado do dado)
          return await triggerVisualRoll(diceType, isSecret, rollValue);
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
        #dice-box {
          position: absolute !important;
          top: 0 !important; 
          left: 0 !important;
          width: 100vw !important; 
          height: 100vh !important;
          pointer-events: none !important; 
          z-index: 9999;
        }
        #dice-box canvas {
          outline: none;
        }
      `}</style>
      <div id="dice-box" className="fixed inset-0 pointer-events-none" />
    </>
  );
}