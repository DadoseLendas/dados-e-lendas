"use client";
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface RollResult {
  finalValue: number;
  values: number[];
  rollMode: RollMode;
  diceType: string;
}

interface DiceRollerProps {
  campaignId: string;
  onReady: (rollFunction: (formula: string, isSecret: boolean, mode?: RollMode) => Promise<RollResult | null>) => void;
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

  const triggerVisualRoll = useCallback(async (diceType: string, isSecret: boolean, values: number[], mode: RollMode) => {
    if (!diceBoxRef.current) return null;

    const currentRollId = ++rollCounterRef.current;

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    
    if (diceBoxRef.current.clearDice) diceBoxRef.current.clearDice();
    else if (diceBoxRef.current.clear) diceBoxRef.current.clear();

    // 1. Aplica a cor global do dado (como era no seu código original)
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

    // 2. Monta a string de notação que a biblioteca espera (ex: "1d20@15, 1d20@8")
    const notationParts: string[] = [];

    values.forEach((val) => {
      // Regra especial e realista para d100: Roda 1d100 (dezenas) e 1d10 (unidades)
      if (diceType === 'd100') {
        let tens, ones;
        // Lógica física de dados: se der 74, a dezena é 70 e unidade 4.
        // Se der 70, a dezena é 60 e unidade 10. Se der 100, dezena é 90 e unidade 10.
        if (val % 10 === 0) {
          tens = val - 10;
          ones = 10;
        } else {
          tens = Math.floor(val / 10) * 10;
          ones = val % 10;
        }
        notationParts.push(`1d100@${tens}`, `1d10@${ones}`);
      } else {
        notationParts.push(`1${diceType}@${val}`);
      }
    });

    // Junta tudo com vírgula. A biblioteca vai dar o .split(',') internamente sem quebrar!
    const notationString = notationParts.join(', ');

    await diceBoxRef.current.roll(notationString);

    if (currentRollId === rollCounterRef.current) {
      clearTimerRef.current = setTimeout(() => {
        if (diceBoxRef.current?.clearDice) diceBoxRef.current.clearDice();
        else if (diceBoxRef.current?.clear) diceBoxRef.current.clear();
      }, 5000); 
    }
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

        const channel = supabase.channel(`dice_rolls_${campaignId}`, {
          config: { broadcast: { ack: false } }
        });

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId, values, rollMode } = payload.payload;
            if (senderId === currentUserIdRef.current) return;
            if (isSecret && !isDMRef.current) return;
            triggerVisualRoll(diceType, isSecret, values, rollMode);
          })
          .subscribe();

        // --- LÓGICA ATUALIZADA: FÓRMULAS + VANTAGEM/DESVANTAGEM ---
        onReady(async (formula: string, isSecret: boolean, mode: RollMode = 'normal') => {
          const cleanFormula = formula.toLowerCase().replace(/\s+/g, '');
          const regex = /^(\d*)d(\d+)([+-]\d+)?$/;
          const match = cleanFormula.match(regex);

          let diceType = cleanFormula.startsWith('d') ? cleanFormula : `d${cleanFormula}`;
          let finalRollValue = 0;
          let generatedValues: number[] = [];

          if (match) {
            const qtd = match[1] ? parseInt(match[1]) : 1;
            const faces = parseInt(match[2]);
            const mod = match[3] ? parseInt(match[3]) : 0;
            diceType = `d${faces}`;

            // Função helper para rolar um "conjunto" da fórmula (ex: 2d6)
            const rollSet = () => {
              let sum = 0;
              for (let i = 0; i < qtd; i++) {
                sum += Math.floor(Math.random() * faces) + 1;
              }
              return sum;
            };

            const val1 = rollSet();
            const val2 = mode !== 'normal' ? rollSet() : val1;
            
            generatedValues = mode === 'normal' ? [val1] : [val1, val2];
            
            let rawChosen = val1;
            if (mode === 'advantage') rawChosen = Math.max(val1, val2);
            if (mode === 'disadvantage') rawChosen = Math.min(val1, val2);

            finalRollValue = rawChosen + mod;
          } else {
            // Fallback (ex: se mandarem só "d20")
            const sides = parseInt(diceType.replace('d', '')) || 20;
            const v1 = Math.floor(Math.random() * sides) + 1;
            const v2 = Math.floor(Math.random() * sides) + 1;
            
            generatedValues = mode === 'normal' ? [v1] : [v1, v2];
            
            if (mode === 'advantage') finalRollValue = Math.max(v1, v2);
            else if (mode === 'disadvantage') finalRollValue = Math.min(v1, v2);
            else finalRollValue = v1;
          }

          const result: RollResult = {
            finalValue: finalRollValue,
            values: generatedValues,
            rollMode: mode,
            diceType
          };

          // Disparo pro canal dos outros jogadores
          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserIdRef.current, values: generatedValues, rollMode: mode },
          });

          await triggerVisualRoll(diceType, isSecret, generatedValues, mode);
          return result;
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