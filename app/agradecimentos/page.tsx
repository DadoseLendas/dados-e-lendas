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
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[#4a5a4a] mb-16 hover:text-[#00ff66] transition-all uppercase text-[10px] font-bold tracking-[0.3em]"
        >
          <ChevronLeft size={14} /> Voltar
        </button>

        <h1 className="text-[#f1e5ac] text-4xl font-serif italic mb-12 border-b border-[#1a2a1a] pb-6">
          Agradecimentos
        </h1>

        <div className="space-y-12 text-[#8a9a8a] text-base leading-relaxed">
          
          <section>
            <p>
              O <strong>Dados e Lendas</strong> não é apenas um código, é o resultado de muito aprendizado e de pessoas que acreditaram na ideia desde o começo.
            </p>
          </section>

          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">Nossa base acadêmica</h2>
            <p>
              Agradecemos a todos os nossos professores da faculdade. Cada aula e cada conceito passado foram os tijolos necessários para construir a estrutura técnica que sustenta este site hoje. Sem o conhecimento compartilhado por vocês, nada disso seria possível.
            </p>
          </section>

          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">Aos amigos e mentores</h2>
            <p>
              Um agradecimento especial ao <strong>Guilherme Ribeiro (Guiga)</strong> e ao <strong>Matheus Becher</strong>. 
              Vocês estiveram lá no início, ajudando a moldar as ideias antes mesmo do primeiro código ser escrito. 
              Mais do que testarem o site, vocês foram os primeiros mestres de dois de nós, apresentando esse hobby que mudou nossas vidas e nos motivou a criar esta plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">Colaboração Externa</h2>
            <p>
              Ao <strong>Devin Night</strong>, por disponibilizar gratuitamente seu incrível acervo de tokens. Sua generosidade permitiu que nossa mesa tivesse a qualidade visual que sempre sonhamos para os nossos jogadores.
            </p>
          </section>

          <div className="pt-12">
            <p className="font-serif italic text-[#f1e5ac]">
              Obrigado por fazerem parte dessa história.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}