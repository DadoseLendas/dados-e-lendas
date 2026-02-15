"use client";
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { useState } from 'react';

export default function PrivacidadePage() {
  const [abaAtiva, setAbaAtiva] = useState('');

  return (
    <div className="bg-[#050a05] min-h-screen flex flex-col font-sans text-white">
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
      <main className="flex-grow max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="mb-12 border-l-4 border-[#00ff66] pl-6 animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl md:text-5xl font-serif text-[#f1e5ac] italic tracking-wider">Política de Privacidade</h1>
          <p className="text-[#8a9a8a] mt-2 tracking-wide">Diretrizes de coleta, uso e proteção dos seus dados.</p>
        </div>

        <div className="space-y-10 text-[#8a9a8a] leading-relaxed text-sm md:text-base animate-in fade-in duration-700">
          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">1. Coleta de Informações</h2>
            <p>Para o funcionamento adequado da plataforma, coletamos informações estritamente necessárias durante o registro e uso do sistema. Isso inclui dados de identificação básica, como endereço de e-mail, nome de exibição e imagem de perfil (avatar), fornecidos diretamente pelo Usuário ou por provedores de autenticação (ex: Google).</p>
          </section>

          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">2. Uso e Tratamento dos Dados</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-[#4a5a4a]">
              <li><strong className="text-[#8a9a8a]">Autenticação:</strong> Garantir o acesso seguro à conta.</li>
              <li><strong className="text-[#8a9a8a]">Experiência do Usuário:</strong> Renderizar a identidade do jogador nas mesas virtuais e campanhas compartilhadas.</li>
              <li><strong className="text-[#8a9a8a]">Comunicação:</strong> Enviar atualizações críticas sobre o sistema ou respostas a solicitações de suporte.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">3. Compartilhamento de Dados</h2>
            <p>O <strong>Dados e Lendas</strong> tem um compromisso absoluto com a sua privacidade. <strong>Não comercializamos, alugamos ou cedemos</strong> seus dados pessoais a terceiros sob nenhuma circunstância. Suas informações de perfil (nome de exibição e avatar) são visíveis apenas para outros usuários com os quais você decida compartilhar uma campanha.</p>
          </section>

          <section>
            <h2 className="text-[#00ff66] font-bold uppercase tracking-widest text-lg mb-4">4. Segurança da Informação</h2>
            <p>Empregamos padrões rigorosos de segurança e criptografia da indústria para proteger as informações contra acesso não autorizado, alteração, divulgação ou destruição. Nosso banco de dados possui políticas de controle de acesso em nível estrutural, garantindo que suas fichas, itens e campanhas privadas sejam acessíveis estritamente por você e pelos membros autorizados da sua mesa.</p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}