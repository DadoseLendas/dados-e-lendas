"use client";
import { useEffect, useRef, useCallback, useMemo } from 'react';
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
  d20: '#ef4444',
  d12: '#f97316',
  d10: '#eab308',
  d8:  '#22c55e',
  d6:  '#3b82f6',
  d4:  '#a855f7',
  d100:'#9ca3af'
};

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const initializedRef = useRef(false);
  const diceBoxRef     = useRef<any>(null);
  const clearTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const rollCounterRef = useRef(0);
  const supabase = useMemo(() => createClient(), []);

  const isDMRef = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; }, [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const triggerVisualRoll = useCallback(async (diceType: string, isSecret: boolean, values: number[]) => {
    if (!diceBoxRef.current || !values || values.length === 0) return null;

    try {
      const currentRollId = ++rollCounterRef.current;

      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (diceBoxRef.current.clearDice) diceBoxRef.current.clearDice();
      else if (diceBoxRef.current.clear) diceBoxRef.current.clear();

      // 1. Configura a cor do dado (agora com AWAIT e DELAY, pois não trava mais o chat!)
      const baseColor = isSecret ? '#ef4444' : (COLORSETS[diceType] || '#ffffff');
      
      if (diceBoxRef.current.updateConfig) {
        await diceBoxRef.current.updateConfig({
          theme_colorset: "custom",
          theme_customColorset: { background: baseColor, foreground: '#ffffff', texture: 'none' }
        });
        // Pequeno atraso vital para a engine 3D processar a cor nos materiais
        await new Promise(resolve => setTimeout(resolve, 50));
      } else if (diceBoxRef.current.config) {
        diceBoxRef.current.config.theme_customColorset = { background: baseColor, foreground: '#ffffff', texture: 'none' };
      }

      // 2. Lança os dados com valores predeterminados
      if (diceType === 'd100') {
        const pairs = values.map(val => ({
          ten: val === 100 ? 0 : Math.floor(val / 10) * 10,
          one: val % 10 === 0 ? 10 : val % 10,
        }));

        await diceBoxRef.current.roll(`1d100@${pairs[0].ten}`);
        await diceBoxRef.current.add(`1d10@${pairs[0].one}`);

        for (let i = 1; i < pairs.length; i++) {
          await diceBoxRef.current.add(`1d100@${pairs[i].ten}`);
          await diceBoxRef.current.add(`1d10@${pairs[i].one}`);
        }
      } else {
        // Formatação restaurada: ex -> "2d20@15,8" (Garante que os 2 dados apareçam)
        const rollString = `${values.length}${diceType}@${values.join(',')}`;
        await diceBoxRef.current.roll(rollString);
      }

      // 3. Limpa a mesa após 4s
      if (currentRollId === rollCounterRef.current) {
        clearTimerRef.current = setTimeout(() => {
          if (diceBoxRef.current?.clearDice) diceBoxRef.current.clearDice();
          else if (diceBoxRef.current?.clear) diceBoxRef.current.clear();
        }, 4000);
      }
    } catch (err) {
      console.error('[DiceRoller] Erro visual ao animar os dados:', err);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Declaração do canal fora da função async para o useEffect ter acesso a ele
    let channel: ReturnType<typeof supabase.channel> | null = null;

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

        channel = supabase.channel(`dice_rolls_${campaignId}`, {
          config: { broadcast: { ack: false } }
        });

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId, values } = payload.payload;
            if (senderId === currentUserIdRef.current) return;
            if (isSecret && !isDMRef.current) return;
            triggerVisualRoll(diceType, isSecret, values).catch(console.error);
          })
          .subscribe();

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

          channel?.send({
                type: 'broadcast',
                event: 'roll',
                payload: { diceType, isSecret, senderId: currentUserIdRef.current, values: generatedValues },
          });

          try {
            await triggerVisualRoll(diceType, isSecret, generatedValues);
          } catch (err) {
            console.error('[DiceRoller] Erro na animação. Enviando resultado para o chat mesmo assim.', err);
          }
          
          return result;
        });

      } catch (e) {
        console.error('[DiceRoller] Falha na inicialização:', e);
      }
    };

    initDice();
  // O cleanup agora pertence ao useEffect, não à função async
    return () => { 
      if (channel) {
        supabase.removeChannel(channel); 
      }
    };
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