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

    // 1. Configura a cor do dado
    const baseColor = isSecret ? '#ef4444' : (COLORSETS[diceType] || '#ffffff');
    if (diceBoxRef.current.updateConfig) {
      await diceBoxRef.current.updateConfig({
        theme_colorset: "custom",
        theme_customColorset: { background: baseColor, foreground: '#ffffff', texture: 'none' }
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    } else if (diceBoxRef.current.config) {
      diceBoxRef.current.config.theme_customColorset = { background: baseColor, foreground: '#ffffff', texture: 'none' };
    }

    // 2. Lança os dados com valores predeterminados
    if (diceType === 'd100') {
      const pairs: { ten: number; one: number }[] = values.map(val => ({
        ten: val === 100 ? 0 : Math.floor(val / 10) * 10,
        one: val % 10 === 0 ? 10 : val % 10,
      }));

      // Primeiro par simultâneo
      await diceBoxRef.current.roll(`1d100@${pairs[0].ten}`);
      await diceBoxRef.current.add(`1d10@${pairs[0].one}`); // sem delay

      // Pares adicionais (vantagem/desvantagem) também sem delay entre si
      for (let i = 1; i < pairs.length; i++) {
        await diceBoxRef.current.add(`1d100@${pairs[i].ten}`);
        await diceBoxRef.current.add(`1d10@${pairs[i].one}`);
      }
    } else {
      // Une as rolagens forçadas com "+" para jogar todos os dados de uma vez.
      // Em Vantagem, por exemplo, gera: "1d20@15 + 1d20@8"
      const rollString = values.map(v => `1${diceType}@${v}`).join(' + ');
      await diceBoxRef.current.roll(rollString);
    }

    // 3. Limpa a mesa após 4s
    if (currentRollId === rollCounterRef.current) {
      clearTimerRef.current = setTimeout(() => {
        if (diceBoxRef.current?.clearDice) diceBoxRef.current.clearDice();
        else if (diceBoxRef.current?.clear) diceBoxRef.current.clear();
      }, 4000);
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

            // Rola os valores individuais para suportar fórmulas como 2d20, 3d6 etc.
            const rollSet = () => {
              const values: number[] = [];
              for (let i = 0; i < qtd; i++) {
                values.push(Math.floor(Math.random() * faces) + 1);
              }
              return values;
            };

            const set1 = rollSet();
            const set2 = mode !== 'normal' ? rollSet() : set1;
            const val1 = set1.reduce((acc, value) => acc + value, 0);
            const val2 = set2.reduce((acc, value) => acc + value, 0);

            generatedValues = mode === 'normal' ? set1 : [val1, val2];

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