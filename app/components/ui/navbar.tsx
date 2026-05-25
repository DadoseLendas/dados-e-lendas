"use client";
import { useState, useEffect, useRef } from 'react';
import { User, LogOut, LogIn, UserPlus, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

interface NavbarProps {
  abaAtiva?: string;
  setAbaAtiva?: (aba: string) => void;
}

export default function Navbar({ abaAtiva = '', setAbaAtiva = () => {} }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [novidadesOpen, setNovidadesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNovidadesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsUserLoggedIn(true);
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, display_name, nickname')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setDisplayName(profile.display_name || profile.nickname || 'Aventureiro');
            setAvatarUrl(profile.avatar_url || null);
          } else {
            setDisplayName('Aventureiro');
            setAvatarUrl(null);
          }
        } else {
          setIsUserLoggedIn(false);
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsUserLoggedIn(false);
    setAvatarUrl(null);
    setDisplayName(null);
    router.push('/login');
    router.refresh();
  };

  const handleNovidadesClick = (subItem: string) => {
    setNovidadesOpen(false);
    router.push(`/novidades/${subItem}`);
  };

  return (
    <nav className="w-full bg-[#050a05] border-b border-[#1a2a1a] py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6">
        
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setAbaAtiva('home'); router.push('/'); }}>
          <div className="p-1.5 rounded-md bg-transparent transition-transform group-hover:scale-105 relative w-10 h-10 md:w-12 md:h-12">
            <Image src="/logo.png" alt="Dados e Lendas" fill sizes="(max-width: 48px) 100vw, 48px" className="rounded-full object-cover filter drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]" />
          </div>
          <span className="font-bold text-white tracking-[0.2em] font-serif hidden sm:block uppercase text-xs md:text-base group-hover:text-[#00ff66] transition-colors">
            Dados e Lendas
          </span>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-4 w-20 bg-[#1a2a1a] rounded"></div>
            <div className="h-10 w-10 bg-[#1a2a1a] rounded-full"></div>
          </div>
        ) : (
          <div className="flex items-center gap-6 md:gap-10">
            
            {isUserLoggedIn && (
              <div className="hidden md:flex gap-10 text-xs font-bold uppercase tracking-widest items-center">
                <button onClick={() => { setAbaAtiva('campanhas'); router.push('/campanhas'); }} className={`${abaAtiva === 'campanhas' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#8a9a8a] hover:text-[#00ff66]'} transition-all`}>
                  Campanhas
                </button>
                <button onClick={() => { setAbaAtiva('personagens'); router.push('/personagens'); }} className={`${abaAtiva === 'personagens' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#8a9a8a] hover:text-[#00ff66]'} transition-all`}>
                  Personagens
                </button>
                
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setNovidadesOpen(!novidadesOpen)}
                    className={`flex items-center gap-1 transition-all ${abaAtiva === 'novidades' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#8a9a8a] hover:text-[#00ff66]'}`}
                  >
                    Novidades
                    <ChevronDown size={12} className={`transition-transform ${novidadesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {novidadesOpen && (
                    <div className="absolute top-full left-0 mt-2 w-52 bg-[#0a120a] border border-[#1a2a1a] rounded-lg shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => handleNovidadesClick('beta')}
                        className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8a9a8a] hover:bg-[#00ff66]/10 hover:text-[#00ff66] transition-colors"
                      >
                        Beta Aberto
                      </button>
                      <button
                        onClick={() => handleNovidadesClick('dicas')}
                        className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8a9a8a] hover:bg-[#00ff66]/10 hover:text-[#00ff66] transition-colors border-t border-[#1a2a1a]"
                      >
                        Dicas para Mestres
                      </button>
                      <button
                        onClick={() => handleNovidadesClick('tutorial')}
                        className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8a9a8a] hover:bg-[#00ff66]/10 hover:text-[#00ff66] transition-colors border-t border-[#1a2a1a]"
                      >
                        Tutorial
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center">
              {isUserLoggedIn ? (
                <div className="flex items-center gap-4 border-l border-[#1a2a1a] pl-6 ml-2">
                  <button onClick={() => { setAbaAtiva('perfil'); router.push('/perfil'); }} className="flex items-center gap-3 group">
                    <span className="hidden md:block text-sm font-bold font-serif tracking-wider transition-colors group-hover:text-[#00ff66] duration-300 text-[#00ff66]">
                      {displayName || 'Aventureiro'}
                    </span>
                    <div className={`relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden ${abaAtiva === 'perfil' ? 'border-[#00ff66] shadow-[0_0_8px_#00ff66]' : 'border-[#1a2a1a] group-hover:border-[#00ff66]'}`}>
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="User" fill sizes="(max-width: 40px) 100vw, 40px" className="object-cover" />
                      ) : (
                        <User size={20} className={abaAtiva === 'perfil' ? 'text-[#00ff66]' : 'text-[#4a5a4a] group-hover:text-[#00ff66]'} />
                      )}
                    </div>
                  </button>
                  <button onClick={handleLogout} className="text-[#4a5a4a] hover:text-red-400 transition-colors ml-2" title="Sair">
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => { setAbaAtiva('login'); router.push('/login'); }} className={`flex items-center gap-2 font-bold text-xs tracking-widest uppercase px-4 py-2 rounded transition-all ${abaAtiva === 'login' ? 'text-[#00ff66] bg-[#00ff66]/10' : 'text-[#8a9a8a] hover:text-white hover:bg-[#1a2a1a]/50'}`}>
                    <LogIn size={16} /> Login
                  </button>
                  <button onClick={() => { setAbaAtiva('cadastro'); router.push('/cadastro'); }} className="group relative flex items-center gap-2 border border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] hover:bg-[#00ff66] hover:text-black font-bold text-xs tracking-widest uppercase px-6 py-2 rounded transition-all shadow-[0_0_15px_rgba(0,255,102,0.15)] hover:shadow-[0_0_25px_rgba(0,255,102,0.4)]">
                    <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
                    Criar Conta
                  </button>
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </nav>
  );
}