"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { FileText, Dices, Map, ChevronRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

// Verificação se está logado
function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-[#050a05] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-[#0a120a] border border-red-900/30 p-12 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.1)] max-w-lg w-full">
        <div className="mx-auto w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/50">
          <ShieldAlert size={40} />
        </div>
        
        <h1 className="text-3xl font-serif text-white mb-4 italic tracking-wide">
          ACESSO NEGADO
        </h1>
        
        <p className="text-[#8a9a8a] mb-8 leading-relaxed">
          Alto lá, viajante! Este domínio é protegido por magias antigas. 
          Apenas aventureiros registrados na guilda podem acessar o painel de controle.
        </p>

        <div className="flex flex-col gap-3">
          <Link 
            href="/login" 
            className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg uppercase tracking-widest hover:bg-[#00cc52] transition-colors"
          >
            Fazer Login
          </Link>
          <Link 
            href="/cadastro" 
            className="w-full border border-[#1a2a1a] text-[#8a9a8a] font-bold py-4 rounded-lg uppercase tracking-widest hover:text-white hover:border-white transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#050a05] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#1a2a1a] border-t-[#00ff66] rounded-full animate-spin"></div>
        <p className="text-[#00ff66] text-xs uppercase tracking-[0.3em] font-bold animate-pulse">Conjurando Dashboard...</p>
      </div>
    </div>
  );
}

// Dashboard
export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  // Estados para controlar a verificação
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('home'); // Estado para controlar a navbar

  // Efeito para verificar autenticação ao carregar a página
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkUser();
  }, [supabase]);

  // Se estiver verificando mostra Loading
  if (loading) return <LoadingState />;

  // Se verificou e NÃO tem sessão mostra Não Autorizado
  if (!isAuthenticated) return <UnauthorizedState />;

  // 3. Se tem sessão mostra o Dashboard completo
  return (
    <main className="bg-[#050a05] text-white overflow-x-hidden font-sans">
      
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
      {/*incial*/}
      <section className="h-[70vh] flex flex-col items-center justify-center text-center px-5 border-b border-[#1a2a1a]/30">
        <h1 className="text-5xl md:text-7xl font-serif italic mb-6 tracking-tighter">BEM VINDO AVENTUREIRO!</h1>
        <p className="text-[#8a9a8a] max-w-2xl mb-10 leading-relaxed text-lg">
          A plataforma brasileira completa para mestres e jogadores de D&D 5e. Fichas, mapas, dados e histórias em um só lugar.
        </p>
        <button className="group border border-[#00ff66] text-[#00ff66] px-10 py-4 hover:bg-[#00ff66] hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,102,0.3)] uppercase tracking-[0.3em] font-bold text-sm flex items-center gap-2">
          Comece sua aventura <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/*recurso*/}
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

      {/*nov*/}
      <section id="novidades" className="py-24 px-6 max-w-[1200px] mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl font-serif text-white mb-2 tracking-widest uppercase italic">Novidades</h2>
          <div className="w-24 h-1 bg-[#00ff66] shadow-[0_0_15px_#00ff66]"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { tag: 'Atualização', data: '10 de Jan 2026', titulo: 'O Beta Aberto chegou!!', desc: 'Teste agora as novas fichas de D&D 5e.', cor: 'bg-[#00ff66]' },
            { tag: 'Comunidade', data: '08 de Jan 2026', titulo: 'Dicas para Mestres', desc: 'Confira nosso guia completo para começar a mestrar suas primeiras sessões.', cor: 'bg-[#f1c40f]' }
          ].map((news, i) => (
            <div key={i} className="bg-[#0a120a]/60 border border-[#1a2a1a] p-10 rounded-xl transition-all duration-300 hover:border-[#00ff66] hover:shadow-[0_0_35px_rgba(0,255,102,0.15)] group cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span className={`${news.cor} text-black text-[10px] font-black px-3 py-1 rounded-sm uppercase tracking-tighter`}>{news.tag}</span>
                  <span className="text-[#4a5a4a] text-[10px] font-bold tracking-widest uppercase">{news.data}</span>
                </div>
                <h3 className="text-[#f1e5ac] text-2xl font-serif mb-4 group-hover:text-white transition-colors uppercase italic">{news.titulo}</h3>
                <p className="text-[#8a9a8a] text-sm leading-relaxed mb-6">{news.desc}</p>
              </div>
              <span className="text-[#00ff66] text-[10px] font-bold tracking-[0.2em] uppercase group-hover:translate-x-2 transition-all flex items-center gap-1">
                Ler mais <ChevronRight size={12} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}