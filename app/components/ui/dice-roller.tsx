"use client";
import { useEffect, useRef } from 'react';

interface DiceRollerProps {
  onReady: (rollFunction: (diceType: string) => Promise<number | null>) => void;
}

export default function DiceRoller({ onReady }: DiceRollerProps) {
  const initializedRef = useRef(false);

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
        
        // Passa a função de rolar de volta para a Mesa
        onReady(async (diceType: string) => {
          const result = await box.roll([{ qty: 1, sides: parseInt(diceType.replace('d', '')) }]);
          setTimeout(() => box.clear(), 3000);
          return result[0].value;
        });

      } catch (e) { console.error(e); }
    };
    initDice();
  }, [onReady]);

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