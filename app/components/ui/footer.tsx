"use client";
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050a05] border-t border-[#1a2a1a] pt-16 pb-8 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
        {/* Logo */}
        <div className="mb-8">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto rounded-full object-cover" />
          <h2 className="text-white font-serif text-2xl tracking-[0.3em] uppercase mt-4 italic">
            Dados e Lendas
          </h2>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[11px] font-bold uppercase tracking-widest text-[#4a5a4a] mb-12">
          <Link href="/termos" className="hover:text-[#00ff66] transition-colors">Termos</Link>
          <Link href="/privacidade" className="hover:text-[#00ff66] transition-colors">Privacidade</Link>
          <Link href="/agradecimentos" className="hover:text-[#00ff66] transition-colors">Agradecimentos</Link>
          <Link href="/contato" className="hover:text-[#00ff66] transition-colors">Contato</Link>
        </div>

        <p className="text-[#4a5a4a] text-xs">© {currentYear} Dados e Lendas.</p>
      </div>
    </footer>
  );
}