"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '@/app/components/ui/navbar';
import { UserRound } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import FichaModal from '@/app/components/ui/ficha-modal';
import ChatWidget from '@/app/components/ui/chat-widget'; 
import CampaignBooksWidget from '@/app/components/ui/campaign-books-widget';

const diceColors: Record<string, string> = {
  d20: "#ef4444", d12: "#f97316", d10: "#eab308", d8: "#22c55e", d6: "#3b82f6", d4: "#a855f7", d100: "#6b7280",
};

export default function TelaDeMesa() {
  const supabase = createClient();
  const campaignId = "00000000-0000-0000-0000-000000000000"; 
  
  // Estados de UI e 3D
  const [showFicha, setShowFicha] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  
  const [diceBox, setDiceBox] = useState<any>(null);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const initializedRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Busca Personagem vinculado
  useEffect(() => {
    const fetchLinkedCharacter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('campaign_members').select('current_character_id').eq('user_id', user.id).not('current_character_id', 'is', null);
      if (data && data.length > 0) setFichaCharacterId(data[0].current_character_id);
    };
    fetchLinkedCharacter();
  }, [supabase]);

  // Inicializa Motor 3D
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initDice = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box');
        const box = new DiceBox({
          container: "#dice-box",
          assetPath: "/dice-box-assets/assets/",
          theme: "default",
          scale: 7, gravity: 2.5, spinForce: 6, throwForce: 5,
        });

        await box.init();
        window.dispatchEvent(new Event('resize'));
        setDiceBox(box);
        setIsDiceReady(true);
      } catch (error) {
        console.error("Erro ao inicializar DiceBox:", error);
      }
    };
    initDice();
  }, []);

  // Função que será injetada no ChatWidget
  const handleRollDice3D = async (diceType: string): Promise<number | null> => {
    if (!diceBox) return null;
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);

    try {
      const diceColor = diceColors[diceType] || "#ffffff";
      const sidesValue = parseInt(diceType.replace('d', ''));
      
      const result = await diceBox.roll([{ qty: 1, sides: sidesValue, themeColor: diceColor }]);
      
      cleanupTimeoutRef.current = setTimeout(() => {
        diceBox.clear();
        cleanupTimeoutRef.current = null;
      }, 2000);

      return result[0].value;
    } catch (error) {
      console.error("Erro ao rolar:", error);
      return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0a120a] overflow-hidden flex flex-col relative font-sans">
      
      <style jsx global>{`
        .dice-box-canvas {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 100vw !important;
          height: 100vh !important;
          object-fit: contain !important;
        }
      `}</style>

      <div className="relative z-40">
        <Navbar abaAtiva="campanhas" setAbaAtiva={() => {}} />
      </div>

      <div className="flex-grow relative w-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] z-10">
        {!isDiceReady && (
          <div className="flex h-full w-full items-center justify-center">
             <p className="text-[#00ff66] animate-pulse">Conjurando dados mágicos...</p>
          </div>
        )}
      </div>

      <div id="dice-box" className="fixed inset-0 w-screen h-screen pointer-events-none z-[99999]"></div>

      <button
        onClick={() => {
          if (!fichaCharacterId) { alert('Nenhum personagem vinculado a uma campanha.'); return; }
          setShowFicha(true);
        }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-50 bg-[#050a05] border border-[#1a2a1a] hover:border-[#00ff66] text-[#4a5a4a] hover:text-[#00ff66] p-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,0,0,0.6)]"
      >
        <UserRound size={22} />
      </button>

      {/*WIDGETS*/}
      <CampaignBooksWidget campaignId={campaignId} />
      <ChatWidget 
        campaignId={campaignId} 
        isDiceReady={isDiceReady} 
        onRollDice={handleRollDice3D} 
      />

      <FichaModal isOpen={showFicha} onClose={() => setShowFicha(false)} characterId={fichaCharacterId} />
    </div>
  );
}