"use client";
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { ChevronLeft, Check, Sparkles, Sword } from 'lucide-react';

export default function NovidadeBeta() {
  const router = useRouter();

  const funcionalidades = [
    { t: "Criação de Conta e Login", d: "Sua jornada começa aqui. Acesse seu grimório de qualquer lugar." },
    { t: "Criação de Campanhas", d: "Dê vida ao seu mundo. Organize sessões, arcos e jogadores com facilidade." },
    { t: "Editor de Fichas", d: "Fichas de D&D 5e completas e automatizadas. Menos cálculos, mais interpretação." },
    { t: "Mesa de Campanha", d: "O coração do jogo. Um espaço compartilhado para mestre e jogadores em tempo real." },
    { t: "Chat Integrado", d: "Comunicação rápida e comandos de interpretação direto na mesa." },
    { t: "Rolagem de Dados", d: "Sinta a tensão de cada 1 natural ou 20 crítico com nosso sistema de rolagens." },
    { t: "Biblioteca de Livros", d: "Consulte regras, magias e itens sem precisar sair da página." },
    { t: "Painel de Mestre", d: "O controle absoluto. Gerencie monstros, iniciativa e NPCs com um clique." }
  ];

  return (
    <main className="bg-[#050a05] text-white min-h-screen flex flex-col font-sans overflow-x-hidden">
      {/* Se o seu Navbar der erro, use: <Navbar abaAtiva="home" setAbaAtiva={() => {}} /> */}
      <Navbar /> 
      
      <div className="flex-grow max-w-[1000px] mx-auto py-20 px-6 w-full">
        {/* BOTÃO VOLTAR */}
        <button 
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-[#00ff66] mb-12 hover:text-[#f1e5ac] transition-all uppercase text-[10px] font-black tracking-[0.4em]"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Voltar ao Início
        </button>

        {/* HEADER ÉPICO */}
        <header className="relative mb-20">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={16} className="text-[#00ff66] animate-pulse" />
            <span className="text-[#00ff66] text-[10px] font-bold tracking-[0.5em] uppercase">Status: Beta Aberto</span>
          </div>
          
          <h1 className="text-[#f1e5ac] text-5xl md:text-7xl font-serif italic uppercase mb-6 tracking-tighter leading-tight">
            A Forja foi <br /> <span className="text-white">Acesa!</span>
          </h1>
          
          <div className="w-24 h-1 bg-[#00ff66] shadow-[0_0_15px_#00ff66] mb-8"></div>
          
          <p className="text-[#8a9a8a] text-xl leading-relaxed max-w-3xl italic font-serif">
            "Após longos meses de desenvolvimento em cavernas profundas, a plataforma brasileira definitiva para D&D 5e finalmente abre seus portões."
          </p>
        </header>

        {/* GRID DE FUNCIONALIDADES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {funcionalidades.map((item, index) => (
            <div 
              key={index} 
              className="bg-[#0a120a] border border-[#1a2a1a] p-6 rounded-lg hover:border-[#00ff66]/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 bg-[#1a2a1a] p-1 rounded border border-[#00ff66]/20 group-hover:bg-[#00ff66]/10 transition-colors">
                  <Check size={16} className="text-[#00ff66]" />
                </div>
                <div>
                  <h3 className="text-[#f1e5ac] font-bold uppercase tracking-wider text-sm mb-2 group-hover:text-white transition-colors">
                    {item.t}
                  </h3>
                  <p className="text-[#8a9a8a] text-xs leading-relaxed">
                    {item.d}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CALL TO ACTION FINAL */}
        <section className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-10 text-center relative overflow-hidden mb-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff66] to-transparent opacity-50"></div>
          
          <Sword className="mx-auto mb-6 text-[#00ff66] opacity-30" size={40} />
          
          <h2 className="text-2xl font-serif italic text-[#f1e5ac] mb-4 uppercase tracking-widest">Sua próxima sessão começa aqui</h2>
          <p className="text-[#8a9a8a] mb-8 max-w-xl mx-auto text-sm leading-relaxed">
            Toda grande lenda precisa de um ponto de partida. Registre-se agora, crie sua campanha e convide seus jogadores para o beta.
          </p>
          
          <button 
            onClick={() => router.push('/cadastro')}
            className="border border-[#00ff66] text-[#00ff66] px-12 py-4 hover:bg-[#00ff66] hover:text-black transition-all font-bold uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(0,255,102,0.1)]"
          >
            Reclame sua conta
          </button>
        </section>
      </div>

      <Footer />
    </main>
  );
} 