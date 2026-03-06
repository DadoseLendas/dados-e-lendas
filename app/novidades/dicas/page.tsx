"use client";
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { ChevronLeft, BookOpen, Scroll, Coffee, Wand2 } from 'lucide-react';

export default function DicasMestres() {
  const router = useRouter();

  const dicas = [
    {
      titulo: "Comece Pequeno",
      texto: "Não tente criar um mundo inteiro para a primeira sessão. Uma taverna, uma pequena masmorra e um mistério local são o suficiente para uma noite épica.",
      icone: <Coffee className="text-[#f1c40f]" size={20} />
    },
    {
      titulo: "A Regra de Ouro",
      texto: "As regras servem para ajudar a diversão, não para travá-la. Se não souber uma regra na hora, improvise e procure depois. O fluxo da história é prioridade.",
      icone: <Scroll className="text-[#f1c40f]" size={20} />
    },
    {
      titulo: "Use a Tecnologia a seu Favor",
      texto: "Nossa Mesa de Campanha permite que você gerencie a iniciativa e veja as fichas dos jogadores em tempo real. Isso remove o peso dos cálculos e foca na narrativa.",
      icone: <Wand2 className="text-[#f1c40f]" size={20} />
    }
  ];

  return (
    <main className="bg-[#050a05] text-white min-h-screen flex flex-col font-sans overflow-x-hidden">
      <Navbar />
      
      <div className="flex-grow max-w-[900px] mx-auto py-20 px-6 w-full">
        {/* BOTÃO VOLTAR */}
        <button 
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 text-[#f1c40f] mb-12 hover:text-white transition-all uppercase text-[10px] font-black tracking-[0.4em]"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Voltar à Taverna
        </button>

        {/* HEADER */}
        <header className="relative mb-16">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={16} className="text-[#f1c40f]" />
            <span className="text-[#f1c40f] text-[10px] font-bold tracking-[0.5em] uppercase">Guia da Comunidade</span>
          </div>
          
          <h1 className="text-[#f1e5ac] text-5xl md:text-7xl font-serif italic uppercase mb-6 tracking-tighter leading-tight">
            A Arte de <br /> <span className="text-white">Narrar Lendas</span>
          </h1>
          
          <div className="w-24 h-1 bg-[#f1c40f] shadow-[0_0_15px_rgba(241,196,15,0.4)] mb-8"></div>
          
          <p className="text-[#8a9a8a] text-xl leading-relaxed italic font-serif">
            "Mestrar não é sobre ganhar dos jogadores, mas sim sobre construir juntos um conto que será lembrado por anos. Aqui estão as diretrizes para a sua primeira jornada."
          </p>
        </header>

        
        <div className="space-y-12 mb-20">
          {dicas.map((dica, index) => (
            <section key={index} className="bg-[#0a120a] border-l-2 border-[#f1c40f] p-8 hover:bg-[#0c160c] transition-colors">
              <div className="flex items-center gap-4 mb-4">
                {dica.icone}
                <h2 className="text-[#f1e5ac] text-2xl font-serif italic uppercase tracking-wider">
                  {dica.titulo}
                </h2>
              </div>
              <p className="text-[#8a9a8a] leading-relaxed">
                {dica.texto}
              </p>
            </section>
          ))}
        </div>

       
        <article className="prose prose-invert max-w-none text-[#8a9a8a] bg-[#0a120a]/30 p-10 border border-[#1a2a1a] rounded-xl">
          <h3 className="text-white font-serif italic text-xl mb-4">Pronto para a sua primeira sessão?</h3>
          <p className="mb-6">
            Lembre-se: o mestre mais experiente um dia também teve medo do seu primeiro "Rolem iniciativa". 
            Com as nossas ferramentas de **Painel de Mestre** e **Biblioteca**, você terá tudo o que precisa na ponta dos dedos.
          </p>
          <button 
            onClick={() => router.push('/cadastro')}
            className="text-[#f1c40f] border border-[#f1c40f] px-6 py-2 hover:bg-[#f1c40f] hover:text-black transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            Criar minha primeira campanha
          </button>
        </article>
      </div>

      <Footer />
    </main>
  );
}