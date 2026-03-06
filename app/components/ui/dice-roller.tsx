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
  const diceBoxRef     = useRef<any>(null);
  const clearTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const supabase       = createClient();

  // MANTÉM AS REGRAS DE VISIBILIDADE SEMPRE ATUALIZADAS PARA O WEBSOCKET
  const isDMRef = useRef(isDM);
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { isDMRef.current = isDM; }, [isDM]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const triggerVisualRoll = useCallback(async (diceType: string, isSecret: boolean, forcedValue: number) => {
    if (!diceBoxRef.current) return null;

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (diceBoxRef.current.clear) diceBoxRef.current.clear(); 

    // A MÁGICA DO PREDETERMINISMO: A notação "@" força a física a cair no valor exato!
    // Exemplo de saída: "1d20@15" (Rola um d20 e obriga a cair no 15)
    const notation = `1${diceType}@${forcedValue}`;

    await diceBoxRef.current.roll(notation);

    clearTimerRef.current = setTimeout(() => {
      if (diceBoxRef.current?.clear) diceBoxRef.current.clear();
    }, 4000);

    return forcedValue;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
      try {
        // Importação dinâmica para evitar erro de SSR com o ThreeJS no Next.js
        const { default: DiceBox } = await import('@3d-dice/dice-box-threejs');
        
        // Inicializa a mesa 3D com as configurações do README
        const box = new DiceBox("#dice-box", {
          assetPath: '/', // Procura as pastas 'textures' e 'sound' na sua raiz public/
          framerate: (1/60),
          sounds: true,
          volume: 50,
          color_spotlight: 0xffffff,
          shadows: true,
          theme_surface: "none", // Remove o fundo verde feio padrão
          theme_material: "glass",
          gravity_multiplier: 600,
          baseScale: 80,
          strength: 2
        });
        
        await box.init();
        diceBoxRef.current = box;

        const channel = supabase.channel(`dice_rolls_${campaignId}`);

        channel
          .on('broadcast', { event: 'roll' }, (payload: any) => {
            const { diceType, isSecret, senderId, value } = payload.payload;

            // Se fui eu que lancei, ignoro (pois já vi a minha própria animação)
            if (senderId === currentUserIdRef.current) return;
            
            // REGRA DE VISIBILIDADE DE RPG: 
            // Se a jogada é secreta e eu NÃO sou o mestre, eu não vejo absolutamente nada.
            if (isSecret && !isDMRef.current) return;

            // Caiu aqui? A animação roda IDÊNTICA caindo no mesmo valor para quem está assistindo!
            triggerVisualRoll(diceType, isSecret, value);
          })
          .subscribe();

        onReady(async (diceType: string, isSecret: boolean) => {
          const sides = parseInt(diceType.replace('d', ''));
          
          // O jogador que clicou "vê o futuro": define o destino do dado ANTES de rolar
          const rollValue = Math.floor(Math.random() * sides) + 1;

          channel.send({
            type: 'broadcast',
            event: 'roll',
            payload: { diceType, isSecret, senderId: currentUserIdRef.current, value: rollValue },
          });

          // Dispara a rolagem na tela de quem clicou
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