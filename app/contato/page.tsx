"use client";
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { useState } from 'react';
import { Mail, Send, MessageSquare } from 'lucide-react';

export default function ContatoPage() {
  const [abaAtiva, setAbaAtiva] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Falta implementar lógica de envio (Resend, EmailJS, Supabase)
    setEnviado(true);
    setTimeout(() => setEnviado(false), 5000);
  };

  return (
    <div className="bg-[#050a05] min-h-screen flex flex-col font-sans text-white">
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
      <main className="flex-grow max-w-5xl mx-auto px-6 py-16 w-full flex flex-col md:flex-row gap-12 items-start">
        
        {/* Lado Esquerdo: Textos */}
        <div className="w-full md:w-1/2 animate-in slide-in-from-left duration-500">
          <div className="mb-8 border-l-4 border-[#00ff66] pl-6">
            <h1 className="text-4xl md:text-5xl font-serif text-[#f1e5ac] italic tracking-wider">Fale Conosco</h1>
            <p className="text-[#8a9a8a] mt-2">Envie um corvo ou uma mensagem mágica.</p>
          </div>
          <p className="text-[#8a9a8a] leading-relaxed mb-8">
            Encontrou um bug nas regras? Tem uma sugestão de magia nova para implementar? Ou apenas quer falar com os desenvolvedores da guilda? Preencha o pergaminho ao lado e entraremos em contato.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[#00ff66]">
              <Mail size={20} />
              <span className="text-[#8a9a8a]">dadoselendas@gmail.com</span>
            </div>
            <div className="flex items-center gap-3 text-[#00ff66]">
              <MessageSquare size={20} />
              <span className="text-[#8a9a8a]">Tempo de resposta: 1 a 2 dias úteis</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="w-full md:w-1/2 bg-[#0a120a] border border-[#1a2a1a] p-8 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-500">
          {enviado ? (
             <div className="h-64 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-[#00ff66]/20 text-[#00ff66] rounded-full flex items-center justify-center mb-4">
                 <Send size={32} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Mensagem Enviada!</h3>
               <p className="text-[#8a9a8a] text-sm">O corvo já está a caminho da nossa torre.</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Seu Nome</label>
                <input 
                  type="text" required
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                  placeholder="Nome de Aventureiro"
                />
              </div>
              <div>
                <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Seu E-mail</label>
                <input 
                  type="email" required
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                  placeholder="email@dominio.com"
                />
              </div>
              <div>
                <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">A Mensagem</label>
                <textarea 
                  required rows={4}
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors resize-none"
                  placeholder="Descreva o motivo do seu contato..."
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Enviar Mensagem
              </button>
            </form>
          )}
        </div>

      </main>
      
      <Footer />
    </div>
  );
}