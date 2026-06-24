"use client";
import { useState } from 'react';
import { X, HelpCircle, ChevronRight } from 'lucide-react';
import { TUTORIAL_VTT, CONDICOES_RPG } from '@/features/mesa/utils/constants';

interface HelpModalProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function HelpModal({ isOpen, onToggle }: HelpModalProps) {
  const [ajudaTab, setAjudaTab] = useState<'condicoes'>('condicoes');
  const [buscaCondicao, setBuscaCondicao] = useState("");
  const [itemExpandido, setItemExpandido] = useState<string | null>(null);
  const [tutorialExpandido, setTutorialExpandido] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed bottom-6 left-6 z-[9999] w-12 h-12 bg-[#0a0a0a] border-2 border-[#00ff66] rounded-full flex items-center justify-center text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:scale-110 transition-all"
        title="Manual de Condições"
      >
        <HelpCircle size={24} />
      </button>

      {isOpen && (
        <div className="fixed bottom-20 left-6 z-[9998] w-80 sm:w-96 bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col resize overflow-hidden min-h-[300px] max-h-[70vh]">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#00ff66]/5 shrink-0">
            <span className="text-[#00ff66] font-bold text-xs uppercase tracking-tighter">Ajuda Rápida</span>
            <button onClick={onToggle} className="text-white/20 hover:text-white"><X size={18} /></button>
          </div>
          <div className="flex bg-[#00ff66]/5 border-b border-white/5 shrink-0">
            <button onClick={() => setAjudaTab('condicoes')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${ajudaTab === 'condicoes' ? 'text-[#00ff66] border-b-2 border-[#00ff66]' : 'text-white/40 hover:text-white/70'}`}>Condições</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {ajudaTab === 'condicoes' ? (
              <div className="p-3 space-y-2">
                <div className="mb-3 shrink-0">
                  <input
                    type="text"
                    placeholder="Buscar condição..."
                    className="w-full bg-black/40 border border-white/5 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-[#00ff66]/30"
                    value={buscaCondicao}
                    onChange={(e) => setBuscaCondicao(e.target.value)}
                  />
                </div>
                {CONDICOES_RPG
                  .filter(c => c.nome.toLowerCase().includes(buscaCondicao.toLowerCase()))
                  .map((c, i) => {
                    const isExpanded = itemExpandido === c.nome;
                    return (
                      <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
                        <button
                          onClick={() => setItemExpandido(isExpanded ? null : c.nome)}
                          className="w-full p-3 flex justify-between items-center hover:bg-white/[0.05] transition-colors"
                        >
                          <span className={`text-xs font-bold uppercase ${isExpanded ? 'text-[#00ff66]' : 'text-white/60'}`}>{c.nome}</span>
                          <ChevronRight size={14} className={`text-white/20 transition-transform ${isExpanded ? 'rotate-90 text-[#00ff66]' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="p-3 pt-0 text-[11px] text-white/70 leading-relaxed border-t border-white/5">
                            <p className="mb-3 text-white/80">{c.desc}</p>
                            {c.tabela && (
                              <div className="space-y-1 mt-2">
                                {c.tabela.map((t, idx) => (
                                  <div key={idx} className="flex gap-2 bg-black/40 p-2 rounded border border-white/5">
                                    <span className="text-[#00ff66] font-bold min-w-[30px]">{t.dado}</span>
                                    <span className="text-white/50">{t.efeito}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.niveis && (
                              <div className="space-y-1 mt-2">
                                {c.niveis.map((n, idx) => (
                                  <div key={idx} className="flex gap-2 text-white/50">
                                    <span className="text-[#00ff66]">•</span> {n}
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.notas && (
                              <div className="mt-3 pt-2 border-t border-white/5 text-[10px]">
                                {c.notas.map((n, idx) => (
                                  <p key={idx} className="mb-2 text-white/40">
                                    {n.titulo && <strong className="text-[#00ff66]/70">{n.titulo}: </strong>} {n.texto}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-3 space-y-2 pb-10">
                {TUTORIAL_VTT[ajudaTab].map((t, i) => {
                  const isExpanded = tutorialExpandido === t.titulo;
                  return (
                    <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
                      <button
                        onClick={() => setTutorialExpandido(isExpanded ? null : t.titulo)}
                        className="w-full p-4 text-left hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-black uppercase tracking-tight ${isExpanded ? 'text-[#00ff66]' : 'text-white/80'}`}>{t.titulo}</span>
                          <ChevronRight size={14} className={`text-white/20 transition-transform ${isExpanded ? 'rotate-90 text-[#00ff66]' : ''}`} />
                        </div>
                        {!isExpanded && <p className="text-[10px] text-white/40 line-clamp-1">{t.desc}</p>}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
                          <p className="text-[11px] text-white/70 italic leading-relaxed">{t.desc}</p>
                          <div className="space-y-3">
                            {t.detalhes.map((d, idx) => (
                              <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded-lg">
                                <span className="text-[#00ff66] text-[10px] font-black uppercase block mb-1 tracking-tighter"># {d.item}</span>
                                <p className="text-[11px] text-white/60">{d.texto}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {ajudaTab === 'jogador' && (
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <h5 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 text-center">Teclas de Atalho</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                        <span className="text-[10px] text-white/40 font-bold">FICHA</span>
                        <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">F</kbd>
                      </div>
                      <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                        <span className="text-[10px] text-white/40 font-bold">MAGIAS</span>
                        <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">G</kbd>
                      </div>
                      <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                        <span className="text-[10px] text-white/40 font-bold">MOVER</span>
                        <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-black">WASD</kbd>
                      </div>
                      <div className="bg-white/[0.03] p-2 rounded-lg flex justify-between items-center border border-white/5">
                        <span className="text-[10px] text-white/40 font-bold">ZOOM</span>
                        <span className="text-[10px] text-white/60 font-black">SCROLL</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-white/5 bg-black shrink-0 text-center">
            <p className="text-[9px] text-white/20 uppercase font-medium">Se o mapa bugar ou a alma sair do corpo, aperte <strong className="text-white/40">F5</strong></p>
          </div>
        </div>
      )}
    </>
  );
}
