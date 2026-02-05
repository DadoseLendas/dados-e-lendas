"use client";
import { Dices, User } from 'lucide-react';

interface NavbarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
}

export default function Navbar({ abaAtiva, setAbaAtiva }: NavbarProps) {
  return (
    <nav className="w-full bg-[#050a05] border-b border-[#1a2a1a] py-3 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6">
        
        {/*logo*/}
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setAbaAtiva('campanhas')}
        >
          <div className="bg-[#00ff66] p-1.5 rounded-md text-black shadow-[0_0_15px_rgba(0,255,102,0.4)]">
            <Dices size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-white tracking-[0.2em] font-serif hidden sm:block uppercase">
            Dados e Lendas
          </span>
        </div>
        
        {/*abas*/}
        <div className="flex items-center gap-8">
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
            <button 
              onClick={() => setAbaAtiva('campanhas')}
              className={`${abaAtiva === 'campanhas' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#4a5a4a] hover:text-[#00ff66]'} transition-all`}
            >
              Campanhas
            </button>
            <button 
              onClick={() => setAbaAtiva('personagens')}
              className={`${abaAtiva === 'personagens' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#4a5a4a] hover:text-[#00ff66]'} transition-all`}
            >
              Personagens
            </button>
          </div>
        </div>

        {/*perfil/login */}
        <div className="flex items-center">
          <button 
            onClick={() => setAbaAtiva('perfil')} 
            className="flex items-center gap-4 group"
          >
            <span className={`font-bold text-[10px] tracking-widest uppercase transition-colors ${abaAtiva === 'perfil' ? 'text-[#00ff66]' : 'text-white group-hover:text-[#00ff66]'}`}>
              Aventureiro
            </span>
            <div className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center ${abaAtiva === 'perfil' ? 'bg-[#00ff66] text-black border-[#00ff66]' : 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/5 group-hover:bg-[#00ff66]/20'}`}>
              <User size={18} strokeWidth={2.5} />
            </div>
          </button>
        </div>

      </div>
    </nav>
  );
}