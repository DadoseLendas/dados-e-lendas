"use client";
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { useState } from 'react';

export default function TermosPage() {
  const [abaAtiva, setAbaAtiva] = useState('');

  return (
    <div className="bg-[#050a05] min-h-screen flex flex-col font-sans text-white">
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
      <main className="flex-grow max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="mb-12 border-l-4 border-[#00ff66] pl-6 animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl md:text-5xl font-serif text-[#f1e5ac] italic tracking-wider">Termos de Uso</h1>
          <p className="text-[#8a9a8a] mt-2 tracking-wide">Condições gerais de acesso e utilização da plataforma.</p>
        </div>

        <div className="space-y-10 text-[#8a9a8a] leading-relaxed text-sm md:text-base animate-in fade-in duration-700">
          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">1. Aceitação dos Termos</h2>
            <p>Ao acessar, registrar-se ou utilizar os serviços da plataforma <strong>Dados e Lendas</strong>, o Usuário concorda expressamente em cumprir e sujeitar-se a estes Termos de Uso. A utilização contínua da plataforma constitui a aceitação incondicional de quaisquer atualizações nestes termos.</p>
          </section>

          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">2. Uso da Plataforma e Conduta</h2>
            <p className="mb-4">O Dados e Lendas fornece um ambiente virtual para a gestão de campanhas de RPG de mesa. O Usuário compromete-se a utilizar a plataforma de maneira ética e legal. É estritamente proibido:</p>
            <ul className="list-disc pl-6 space-y-2 text-[#4a5a4a]">
              <li><strong className="text-[#8a9a8a]">Assédio e Abuso:</strong> Publicar ou transmitir qualquer conteúdo que promova discurso de ódio, discriminação, assédio ou ameaças a outros usuários.</li>
              <li><strong className="text-[#8a9a8a]">Uso Indevido:</strong> Tentar subverter as mecânicas do sistema, explorar vulnerabilidades ou utilizar automações (bots) não autorizadas.</li>
              <li><strong className="text-[#8a9a8a]">Violação de Direitos:</strong> Compartilhar material protegido por direitos autorais sem a devida permissão dos detentores.</li>
            </ul>
            <p className="mt-4">A violação destas diretrizes poderá resultar na suspensão ou encerramento permanente da conta do Usuário, a critério exclusivo da administração.</p>
          </section>

          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">3. Propriedade Intelectual</h2>
            <p>A plataforma reserva para si todos os direitos sobre o código-fonte, design, logotipos e mecânicas exclusivas do sistema. Todo o conteúdo gerado pelo Usuário, incluindo, mas não se limitando a, histórias de campanhas e fichas de personagens, permanece sob a propriedade intelectual do próprio Usuário.</p>
          </section>

          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">4. Disponibilidade do Serviço</h2>
            <p>Esforçamo-nos para manter a plataforma operacional 24 horas por dia. Contudo, não garantimos que o serviço será ininterrupto ou livre de falhas, isentando-nos de responsabilidade por eventuais perdas de dados decorrentes de manutenções ou instabilidades técnicas.</p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}