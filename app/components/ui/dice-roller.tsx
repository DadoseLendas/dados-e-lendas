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
  d20: 'red',
  d12: 'orange',
  d10: 'yellow',
  d8:  'green',
  d6:  'blue',
  d4:  'purple',
  d100:'grey'
};

export default function DiceRoller({ campaignId, onReady, isDM, currentUserId }: DiceRollerProps) {
  const initializedRef = useRef(false);
  const diceBoxRef     = useRef<any>(null);
  const clearTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const rollCounterRef = useRef(0);
  const supabase       = createClient();

  // MANTÉM AS REGRAS DE VISIBILIDADE SEMPRE ATUALIZADAS PARA O WEBSOCKET
  const isDMRef = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; }, [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const triggerVisualRoll = useCallback(async (diceType: string, isSecret: boolean, forcedValue: number) => {
    if (!diceBoxRef.current) return null;

    // 1. Identifica qual é o número desta rolagem específica
    const currentRollId = ++rollCounterRef.current;

    // 2. Cancela a limpeza da rolagem anterior para não apagar o novo dado
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    
    if (diceBoxRef.current.clearDice) diceBoxRef.current.clearDice();
    else if (diceBoxRef.current.clear) diceBoxRef.current.clear();

    // 3. Troca a cor do motor 3D de acordo com o dado ou se é secreto
    const colorName = isSecret ? 'red' : (COLORSETS[diceType] || 'white');
    if (diceBoxRef.current.updateConfig) {
      diceBoxRef.current.updateConfig({ theme_colorset: colorName });
    } else if (diceBoxRef.current.config) {
      diceBoxRef.current.config.theme_colorset = colorName;
    }

    const notation = `1${diceType}@${forcedValue}`;
    await diceBoxRef.current.roll(notation);

    // 4. Só limpa a tela se nenhuma outra rolagem aconteceu depois desta
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
        
        // A PEÇA QUE FALTAVA: Ligar o motor 3D!
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

        onReady(async (diceType: string, isSecret: boolean) => {
          const sides = parseInt(diceType.replace('d', ''));
          const rollValue = Math.floor(Math.random() * sides) + 1;

          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserIdRef.current, value: rollValue },
          });

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
        /* Remove a UI padrão embutida no dice-box-threejs para não atrapalhar seu Chat */
        #dice-box canvas {
          outline: none;
        }
      `}</style>
      <div id="dice-box" className="fixed inset-0 pointer-events-none" />
    </>
  );
}