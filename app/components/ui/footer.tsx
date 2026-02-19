"use client";
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050a05] border-t border-[#1a2a1a] pt-16 pb-8 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
        
        {/* Logo */}
        <div className="mb-8 group cursor-default">
          <div className="p-3 rounded-xl inline-block transition-transform duration-500 group-hover:scale-110 bg-transparent">
            <img 
              src="/logo.png" 
              alt="Dados e Lendas Logo" 
              className="w-16 h-16 rounded-full object-cover filter drop-shadow-[0_0_25px_rgba(0,255,102,0.4)] transition-all duration-500 group-hover:drop-shadow-[0_0_35px_rgba(0,255,102,0.6)]" 
            />
          </div>
          <h2 className="text-white font-serif text-2xl tracking-[0.3em] uppercase mt-4 italic transition-colors duration-300 group-hover:text-[#f1e5ac]">
            Dados e Lendas
          </h2>
        </div>

        {/* Texto Institucional */}
        <p className="text-[#8a9a8a] max-w-2xl text-sm leading-relaxed mb-12">
          Um Virtual Tabletop forjado para mestres e aventureiros. Nossa missão é oferecer 
          a infraestrutura definitiva para a gestão de campanhas de D&D 5e, unindo fichas automatizadas, 
          rolagens precisas e integração em tempo real em um único grimório digital.
        </p>

        {/* Links do Footer */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[11px] font-bold uppercase tracking-widest text-[#4a5a4a] mb-12">
          <Link href="/termos" className="hover:text-[#00ff66] transition-colors duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-[#00ff66] hover:after:w-full after:transition-all">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-[#00ff66] transition-colors duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-[#00ff66] hover:after:w-full after:transition-all">
            Política de Privacidade
          </Link>
          <Link href="/contato" className="hover:text-[#00ff66] transition-colors duration-300 relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-[#00ff66] hover:after:w-full after:transition-all">
            Contato
          </Link>
        </div>

        {/* Copyright */}
        <div className="w-full pt-8 flex flex-col md:flex-row justify-between items-center gap-2 text-[#4a5a4a] text-xs">
          <p>© {currentYear} Dados e Lendas. Todos os direitos reservados.</p>
        </div>

      </div>
    </footer>
  );
}