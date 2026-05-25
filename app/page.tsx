"use client";
import { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { FileText, Dices, Map, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [abaAtiva, setAbaAtiva] = useState('home');
  const [mounted, setMounted] = useState(false);

  const [fotoAtual, setFotoAtual] = useState(0);
  const fotos = ['/capa.jpg', '/capa2.jpg', '/capa3.jpg'];

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setFotoAtual((prev) => (prev + 1) % fotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [fotos.length]);

  const handleStartAdventure = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    router.push(session ? '/campanhas' : '/login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050a05] flex items-center justify-center">
        <div className="text-[#00ff66]">Carregando...</div>
      </div>
    );
  }

  return (
    <main className="bg-[#050a05] text-white min-h-screen flex flex-col font-sans overflow-x-hidden">
      
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
      <div className="flex-grow">
        {/* HERO */}
        <section className="relative h-[85vh] flex flex-col items-center justify-center text-center px-5 border-b border-[#1a2a1a]/30 overflow-hidden">
          
          <div className="absolute inset-0 z-0">
            {fotos.map((foto, index) => (
              <img 
                key={index}
                src={foto} 
                alt={`Slide ${index}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                  index === fotoAtual ? 'opacity-40' : 'opacity-0'
                }`}
                onError={(e) => {
                  console.error(`Erro ao carregar imagem: ${foto}`);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#050a05]"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
            <h1 className="text-5xl md:text-7xl font-serif italic mb-6 tracking-tighter drop-shadow-[0_5px_15px_rgba(0,0,0,1)]">
              BEM VINDO AVENTUREIRO!
            </h1>
            <p className="text-white/80 max-w-2xl mb-10 leading-relaxed text-lg drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
              A plataforma brasileira completa para mestres e jogadores de D&D 5e. Fichas, mapas, dados e histórias em um só lugar.
            </p>
            
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={handleStartAdventure}
                className="group border border-[#00ff66] text-[#00ff66] bg-black/40 backdrop-blur-sm px-10 py-4 hover:bg-[#00ff66] hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] hover:shadow-[0_0_35px_rgba(0,255,102,0.5)] uppercase tracking-[0.3em] font-bold text-sm flex items-center gap-2"
              >
                Comece sua aventura <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex gap-2">
                {fotos.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${i === fotoAtual ? 'bg-[#00ff66] w-6' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RECURSOS */}
        <section id="recursos" className="py-24 px-6 max-w-[1200px] mx-auto border-b border-[#1a2a1a]/30">
          <div className="mb-16">
            <h2 className="text-[#f1e5ac] text-4xl font-serif mb-2 tracking-widest uppercase italic">Tudo o que você precisa</h2>
            <div className="w-24 h-1 bg-[#00ff66] shadow-[0_0_15px_#00ff66]"></div> 
            <p className="text-[#00ff66] text-xs tracking-[0.4em] mt-4 uppercase font-bold opacity-90">D&D 5E TOOLS</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { t: 'FICHAS AUTOMATIZADAS', d: 'Crie personagens complexos em minutos. Cálculos automáticos e inventário.', icon: <FileText size={32} /> },
              { t: 'ROLAGEM DE DADOS', d: 'Dados realistas com física sincronizada em tempo real para todos da mesa.', icon: <Dices size={32} /> },
              { t: 'MAPAS TÁTICOS', d: 'Grid de batalha interativo com tokens, medição e fog of war.', icon: <Map size={32} /> }
            ].map((item, i) => (
              <div key={i} className="bg-[#0a120a] border border-[#1a2a1a] p-10 rounded-xl hover:border-[#00ff66] hover:shadow-[0_0_35px_rgba(0,255,102,0.15)] hover:-translate-y-2 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-[#1a2a1a] rounded-lg flex items-center justify-center text-[#00ff66] mb-8 group-hover:bg-[#00ff66]/20 transition-colors shadow-[inset_0_0_10px_rgba(0,255,102,0.1)]">
                  {item.icon}
                </div>
                <h3 className="font-bold text-lg mb-4 tracking-wider group-hover:text-[#00ff66] transition-colors uppercase">{item.t}</h3>
                <p className="text-[#8a9a8a] text-sm leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* NOVIDADES */}
        <section id="novidades" className="py-24 px-6 max-w-[1200px] mx-auto">
          <div className="mb-16">
            <h2 className="text-[#f1e5ac] text-4xl font-serif mb-2 tracking-widest uppercase italic">Novidades</h2>
            <div className="w-24 h-1 bg-[#00ff66] shadow-[0_0_15px_#00ff66]"></div>
            <p className="text-[#00ff66] text-xs tracking-[0.4em] mt-4 uppercase font-bold opacity-90">Fique por dentro</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Beta Aberto */}
            <div 
              onClick={() => router.push('/novidades/beta')}
              className="bg-[#0a120a]/60 border border-[#1a2a1a] p-8 rounded-xl transition-all duration-300 hover:border-[#00ff66] hover:shadow-[0_0_35px_rgba(0,255,102,0.15)] group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-[#00ff66] text-black text-[10px] font-black px-3 py-1 rounded-sm uppercase">Beta Aberto</span>
                <span className="text-[#4a5a4a] text-[10px] font-bold uppercase">10 de Jan 2026</span>
              </div>
              <h3 className="text-[#f1e5ac] text-xl font-serif mb-3 group-hover:text-white transition-colors uppercase italic">O Beta Aberto chegou!!</h3>
              <p className="text-[#8a9a8a] text-sm leading-relaxed">
                Teste agora as novas fichas de D&D 5e. A plataforma brasileira definitiva para mestres e jogadores.
              </p>
              <span className="inline-block mt-4 text-[#00ff66] text-[10px] font-bold uppercase group-hover:translate-x-2 transition-all flex items-center gap-1">
                Ler mais <ChevronRight size={12} />
              </span>
            </div>

            {/* Dicas para Mestres */}
            <div 
              onClick={() => router.push('/novidades/dicas')}
              className="bg-[#0a120a]/60 border border-[#1a2a1a] p-8 rounded-xl transition-all duration-300 hover:border-[#f1c40f] hover:shadow-[0_0_35px_rgba(241,196,15,0.15)] group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-[#f1c40f] text-black text-[10px] font-black px-3 py-1 rounded-sm uppercase">Comunidade</span>
                <span className="text-[#4a5a4a] text-[10px] font-bold uppercase">08 de Jan 2026</span>
              </div>
              <h3 className="text-[#f1e5ac] text-xl font-serif mb-3 group-hover:text-white transition-colors uppercase italic">Dicas para Mestres</h3>
              <p className="text-[#8a9a8a] text-sm leading-relaxed">
                Confira nosso guia completo para começar a mestrar suas primeiras sessões. Diretrizes essenciais!
              </p>
              <span className="inline-block mt-4 text-[#f1c40f] text-[10px] font-bold uppercase group-hover:translate-x-2 transition-all flex items-center gap-1">
                Ler mais <ChevronRight size={12} />
              </span>
            </div>

            {/* Tutorial */}
            <div 
              onClick={() => router.push('/novidades/tutorial')}
              className="bg-[#0a120a]/60 border border-[#1a2a1a] p-8 rounded-xl transition-all duration-300 hover:border-[#00ff66] hover:shadow-[0_0_35px_rgba(0,255,102,0.15)] group cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-[#00ff66] text-black text-[10px] font-black px-3 py-1 rounded-sm uppercase">Guia</span>
                <span className="text-[#4a5a4a] text-[10px] font-bold uppercase">15 de Jan 2026</span>
              </div>
              <h3 className="text-[#f1e5ac] text-xl font-serif mb-3 group-hover:text-white transition-colors uppercase italic">Tutorial Completo</h3>
              <p className="text-[#8a9a8a] text-sm leading-relaxed">
                Aprenda tudo sobre a plataforma: fichas, rolagens, atalhos de teclado e muito mais. Guia passo a passo!
              </p>
              <span className="inline-block mt-4 text-[#00ff66] text-[10px] font-bold uppercase group-hover:translate-x-2 transition-all flex items-center gap-1">
                Ler mais <ChevronRight size={12} />
              </span>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}