"use client";
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#050a05] border-t border-[#1a2a1a] py-16 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center text-center">
        
        {/*memsa logo da haeader mudar depois pro trem da prima*/}
        <div className="mb-8 group">
          <div className="p-3 rounded-xl text-black inline-block transition-transform group-hover:scale-110 bg-transparent">
            <img src="/logo.png" alt="Dados e Lendas" className="w-16 h-16 rounded-full object-cover filter drop-shadow-[0_0_32px_rgba(0,255,102,0.55)]" />
          </div>
          <h2 className="text-white font-serif text-2xl tracking-[0.3em] uppercase mt-6 italic">
            Dados e Lendas
          </h2>
        </div>

        <p className="text-[#8a9a8a] max-w-2xl text-sm leading-relaxed mb-10">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam ullamcorper enim ut odio pulvinar pellentesque. 
          Vestibulum scelerisque lacus id erat porttitor finibus. Etiam auctor molestie lacus, a ultricies est consequat non. Cras elementum et leo non porttitor. 
          Suspendisse vel arcu at elit ultricies imperdiet. In posuere iaculis neque ullamcorper sagittis. Cras quis leo non orci pulvinar scelerisque quis ac metus. 
          Etiam et nisl dolor.
        </p>

        {/*os pequeno no footer*/}
        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-[#4a5a4a]">
          <Link href="/termos" className="hover:text-[#00ff66] transition-colors">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-[#00ff66] transition-colors">Política de Privacidade</Link>
          <Link href="/contato" className="hover:text-[#00ff66] transition-colors">Contato</Link>
        </div>
      </div>
    </footer>
  );
}