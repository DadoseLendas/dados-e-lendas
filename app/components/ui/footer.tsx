"use client";
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { ChevronLeft } from 'lucide-react';

export default function Agradecimentos() {
  const router = useRouter();

  return (
    <main className="bg-[#050a05] text-white min-h-screen flex flex-col font-sans">
      <Navbar />
      
      <div className="flex-grow max-w-[800px] mx-auto py-20 px-8 w-full">
        {/* BOTÃO VOLTAR */}
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[#4a5a4a] mb-16 hover:text-[#00ff66] transition-all uppercase text-[10px] font-bold tracking-[0.3em]"
        >
          <ChevronLeft size={14} /> Voltar ao Início
        </button>

        <h1 className="text-[#f1e5ac] text-4xl md:text-5xl font-serif italic mb-12 border-b border-[#1a2a1a] pb-6">
          Agradecimentos
        </h1>

        <div className="space-y-12 text-[#8a9a8a] text-base leading-relaxed">
          
          
          <section>
            <h2 className="text-[#f1e5ac] text-2xl font-serif italic mb-4">Aos Mestres da Academia</h2>
            <p>
              Um agradecimento profundo a todos os nossos professores da faculdade. Se o <strong>Dados e Lendas</strong> hoje é uma realidade técnica, é graças aos conhecimentos fundamentais que nos foram transmitidos. Vocês foram os mentores que nos prepararam com a base necessária para este desafio.
            </p>
          </section>

          
          <section>
            <h2 className="text-[#f1e5ac] text-2xl font-serif italic mb-4">Aos Amigos e Primeiros Mestres</h2>
            <p>
              Agradecimento especial ao <strong>Guilherme Ribeiro (Guiga)</strong> e ao <strong>Matheus Becher</strong>, que ajudaram com ideias valiosas antes mesmo do site existir e nos apoiaram durante todos os testes. 
            </p>
            <p className="mt-4">
              Mais do que colaboradores, eles foram os primeiros mestres de dois de nossos desenvolvedores. Foi através da narração deles que a paixão pelo RPG surgiu, nos motivando a criar esta plataforma.
            </p>
          </section>

          
          <section>
            <h2 className="text-[#f1e5ac] text-2xl font-serif italic mb-4">Ao Acervo Épico</h2>
            <p>
              Um agradecimento especial ao <strong>Devin Night</strong>, que disponibilizou generosamente uma pasta repleta de seus tokens para usarmos de forma gratuita no site. Esse apoio artístico foi fundamental para dar vida às nossas mesas.
            </p>
          </section>

          <div className="pt-12 border-t border-[#1a2a1a]">
            <p className="font-serif italic text-[#f1e5ac] text-lg">
              A todos que, de alguma forma, ajudaram a forjar esta lenda, o nosso muito obrigado.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}