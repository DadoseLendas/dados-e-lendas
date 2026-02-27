"use client";
import { useState, useRef, useEffect } from 'react';
import Navbar from '@/app/components/ui/navbar';
import { UserRound, Home, BookOpen, Map as MapIcon, ShieldCheck, ChevronLeft, ChevronRight, X, Upload } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import FichaModal from '@/app/components/ui/ficha-modal';
import ChatWidget from '@/app/components/ui/chat-widget'; 
import DiceBox from '@3d-dice/dice-box';

interface Token {
  id: string;
  url: string;
  x: number;
  y: number;
}

export default function TelaDeMesa() {
  const supabase = createClient();
  const campaignId = "00000000-0000-0000-0000-000000000000";
  
  //interface e Mapa
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [modalAtivo, setModalAtivo] = useState<'Mapa' | 'Token' | 'Biblioteca' | null>(null);
  const [mapaUrl, setMapaUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  //tokens
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenSelecionado, setTokenSelecionado] = useState<string | null>(null);
  const [isDraggingToken, setIsDraggingToken] = useState(false);
  
  const gridSize = 50; 
  const tokenSize = 42; 

  //movimento do mapa
  const handleMouseDown = (e: React.MouseEvent, tokenId?: string) => {
    if (tokenId) {
      setTokenSelecionado(tokenId);
      setIsDraggingToken(true);
      e.stopPropagation();
    } else if (e.button === 1) { 
      setIsDraggingMap(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingMap) {
      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (isDraggingToken && tokenSelecionado) {
      setTokens(prev => prev.map(t => 
        t.id === tokenSelecionado 
          ? { ...t, x: t.x + e.movementX / zoom, y: t.y + e.movementY / zoom } 
          : t
      ));
    }
  };

  const handleMouseUp = () => {
    if (isDraggingToken && tokenSelecionado) {
      setTokens(prev => prev.map(t => 
        t.id === tokenSelecionado 
          ? { 
              ...t, 
              x: Math.round(t.x / gridSize) * gridSize, 
              y: Math.round(t.y / gridSize) * gridSize 
            } 
          : t
      ));
    }
    setIsDraggingMap(false);
    setIsDraggingToken(false);
  };

  //teclado (WASD + Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tokenSelecionado) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setTokens(prev => prev.filter(t => t.id !== tokenSelecionado));
        setTokenSelecionado(null);
        return;
      }
      setTokens(prev => prev.map(t => {
        if (t.id !== tokenSelecionado) return t;
        switch(e.key.toLowerCase()) {
          case 'w': return { ...t, y: t.y - gridSize };
          case 's': return { ...t, y: t.y + gridSize };
          case 'a': return { ...t, x: t.x - gridSize };
          case 'd': return { ...t, x: t.x + gridSize };
          default: return t;
        }
      }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tokenSelecionado]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (tipo === 'Mapa') setMapaUrl(url);
    else if (tipo === 'Token') {
      setTokens([...tokens, { id: Math.random().toString(36).substr(2, 9), url, x: 0, y: 0 }]);
    }
    setModalAtivo(null);
  };

  // --- Logic de Dados/Ficha ---
  const [showFicha, setShowFicha] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  const [isDiceReady, setIsDiceReady] = useState(false);
  const [diceBox, setDiceBox] = useState<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initDice = async () => {
      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box');
        const box = new DiceBox({ container: "#dice-box", assetPath: "/dice-box-assets/assets/", theme: "default", scale: 5, gravity: 2.5, spinForce: 6, throwForce: 5, });
        await box.init(); setDiceBox(box); setIsDiceReady(true);
      } catch (e) { console.error(e); }
    };
    initDice();
  }, []);

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col relative font-sans select-none text-white">
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
      <div className="relative z-50">
        <Navbar abaAtiva="mesa" setAbaAtiva={() => {}} />
      </div>

      <div 
        className="flex flex-1 relative overflow-hidden bg-black" 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/*sidebar*/}
        <aside className={`absolute left-4 top-1/2 -translate-y-1/2 bg-[#0a120a]/70 backdrop-blur-lg border border-white/10 rounded-2xl transition-all duration-300 flex flex-col items-center py-5 gap-5 z-40 shadow-2xl ${sidebarAberta ? 'w-12 opacity-100' : 'w-0 opacity-0 -translate-x-10 pointer-events-none'}`}>
          <button onClick={() => window.location.href = '/'} className="p-2 text-white/30 hover:text-[#00ff66] transition-colors"><Home size={20} /></button>
          <button onClick={() => setShowFicha(true)} className="p-2 text-white/30 hover:text-[#00ff66] transition-colors"><UserRound size={20} /></button>
          <button onClick={() => setModalAtivo('Biblioteca')} className="p-2 text-white/30 hover:text-[#00ff66] transition-colors"><BookOpen size={20} /></button>
          <div className="w-6 h-[1px] bg-white/5" />
          <button onClick={() => setModalAtivo('Mapa')} className="p-2 text-white/30 hover:text-[#00ff66] transition-colors"><MapIcon size={20} /></button>
          <button onClick={() => setModalAtivo('Token')} className="p-2 text-white/30 hover:text-[#00ff66] transition-colors"><ShieldCheck size={20} /></button>
        </aside>

        {/*area central*/}
        <main 
          className="flex-grow relative overflow-hidden bg-black cursor-default"
          onMouseDown={(e) => handleMouseDown(e)}
          onWheel={(e) => {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
          }}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ 
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transition: (isDraggingMap || isDraggingToken) ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <div className="relative pointer-events-auto">
              {!mapaUrl ? (
                <div className="w-[1000px] h-[800px] flex flex-col items-center justify-center gap-4 text-white/10">
                  <MapIcon size={64} strokeWidth={1} />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em]">Aguardando Mapa...</span>
                </div>
              ) : (
                <img src={mapaUrl} className="max-w-none block opacity-80 shadow-2xl" alt="Map" />
              )}
              
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`, 
                  backgroundSize: `${gridSize}px ${gridSize}px` 
                }} 
              />

              {tokens.map(token => (
                <div
                  key={token.id}
                  onMouseDown={(e) => handleMouseDown(e, token.id)}
                  style={{
                    transform: `translate(${token.x}px, ${token.y}px)`,
                    position: 'absolute',
                    top: mapaUrl ? '0' : '50%',
                    left: mapaUrl ? '0' : '50%',
                    marginTop: mapaUrl ? '0' : `-${gridSize/2}px`,
                    marginLeft: mapaUrl ? '0' : `-${gridSize/2}px`,
                    width: `${gridSize}px`,
                    height: `${gridSize}px`,
                    zIndex: tokenSelecionado === token.id ? 100 : 10,
                  }}
                  className="flex items-center justify-center cursor-move group"
                >
                  <div 
                    style={{ width: `${tokenSize}px`, height: `${tokenSize}px` }}
                    className={`rounded-full border-2 transition-all duration-200 overflow-hidden ${
                      tokenSelecionado === token.id || (isDraggingToken && tokenSelecionado === token.id)
                        ? 'border-[#00ff66] shadow-[0_0_20px_#00ff66] scale-110' 
                        : 'border-white/60 group-hover:border-[#00ff66] group-hover:shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                    }`}
                  >
                    <img src={token.url} className="w-full h-full object-cover bg-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <div className="w-[360px] h-full bg-[#080808] border-l border-white/5 z-40 relative">
          <ChatWidget campaignId={campaignId} isDiceReady={isDiceReady} onRollDice={async (t) => {
             const result = await diceBox.roll([{ qty: 1, sides: parseInt(t.replace('d', '')) }]);
             setTimeout(() => diceBox.clear(), 3000);
             return result[0].value;
          }} />
        </div>
      </div>

      
      {modalAtivo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
          <div className="bg-[#0a0a0a] border border-[#00ff66]/20 p-10 rounded-[24px] w-full max-w-md relative shadow-[0_0_50px_rgba(0,255,102,0.1)]">
            <button onClick={() => setModalAtivo(null)} className="absolute top-6 right-6 text-white/40 hover:text-[#00ff66] transition-colors">
              <X size={20}/>
            </button>
            
            <h2 className="text-white text-2xl font-bold mb-10 uppercase tracking-[0.2em] text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              {modalAtivo}
            </h2>
            
            <div className="flex flex-col gap-8">
              <label className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-white/5 rounded-3xl cursor-pointer hover:bg-[#00ff66]/[0.02] hover:border-[#00ff66]/30 group transition-all duration-500">
                <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:border-[#00ff66] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(0,255,102,0.15)] transition-all">
                  <Upload className="text-white/20 group-hover:text-[#00ff66] transition-all" size={32} />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-white font-bold text-[11px] uppercase tracking-widest opacity-80">Arraste ou clique</span>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, modalAtivo)} />
              </label>

              <button 
                onClick={() => setModalAtivo(null)}
                className="w-full py-4 bg-[#00ff66] text-black font-black text-[12px] uppercase tracking-[0.15em] rounded-xl hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,255,102,0.4)] transition-all duration-300 active:scale-[0.98]"
              >
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="dice-box" className="fixed inset-0 pointer-events-none z-[9999]"></div>
      <FichaModal isOpen={showFicha} onClose={() => setShowFicha(false)} characterId={fichaCharacterId} />
    </div>
  );
}