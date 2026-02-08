"use client";
import { User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
  isLoggedIn?: boolean;
}

export default function Navbar({ abaAtiva, setAbaAtiva, isLoggedIn = false }: NavbarProps) {
  const router = useRouter();
  return (
    <nav className="w-full bg-[#050a05] border-b border-[#1a2a1a] py-3 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6">
        
        {/*logo*/}
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => { setAbaAtiva('campanhas'); router.push('/campanhas'); }}
        >
          <div className="p-1.5 rounded-md text-black bg-transparent">
            <img src="/logo.png" alt="Dados e Lendas" className="w-12 h-12 rounded-full object-cover filter drop-shadow-[0_0_22px_rgba(0,255,102,0.7)]" />
          </div>
          <span className="font-bold text-white tracking-[0.2em] font-serif hidden sm:block uppercase">
            Dados e Lendas
          </span>
        </div>
        
        {/*abas*/}
        <div className="flex items-center gap-8">
          {isLoggedIn ? (
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest">
              <button 
                onClick={() => { setAbaAtiva('campanhas'); router.push('/campanhas'); }}
                className={`${abaAtiva === 'campanhas' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#4a5a4a] hover:text-[#00ff66]'} transition-all`}
              >
                Campanhas
              </button>
              <button 
                  onClick={() => { setAbaAtiva('personagens'); router.push('/personagens'); }}
                  className={`${abaAtiva === 'personagens' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#4a5a4a] hover:text-[#00ff66]'} transition-all`}
                >
                  Personagens
                </button>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/*perfil/login */}
        <div className="flex items-center">
          {isLoggedIn ? (
            <button 
              onClick={() => { setAbaAtiva('perfil'); router.push('/perfil'); }} 
              className="flex items-center gap-4 group"
            >
              <span className={`font-bold text-[10px] tracking-widest uppercase transition-colors ${abaAtiva === 'perfil' ? 'text-[#00ff66]' : 'text-white group-hover:text-[#00ff66]'}`}>
                Aventureiro
              </span>
              <div className={`w-9 h-9 rounded-full border transition-all flex items-center justify-center ${abaAtiva === 'perfil' ? 'bg-[#00ff66] text-black border-[#00ff66]' : 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/5 group-hover:bg-[#00ff66]/20'}`}>
                <User size={18} strokeWidth={2.5} />
              </div>
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => { setAbaAtiva('login'); router.push('/login'); }}
                className={`font-bold text-[10px] tracking-widest uppercase ${abaAtiva === 'login' ? 'text-[#00ff66]' : 'text-white hover:text-[#00ff66]'} transition-colors`}
              >
                Login
              </button>
              <button
                onClick={() => { setAbaAtiva('cadastro'); router.push('/cadastro'); }}
                className={`font-bold text-[10px] tracking-widest uppercase ${abaAtiva === 'cadastro' ? 'text-[#00ff66]' : 'text-white hover:text-[#00ff66]'} transition-colors`}
              >
                Cadastro
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}