"use client";
import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface NavbarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
}

export default function Navbar({ abaAtiva, setAbaAtiva }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  
  // Estados
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificação automática de sessão e perfil
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsUserLoggedIn(true);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, display_name')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setAvatarUrl(profile.avatar_url);
            setDisplayName(profile.display_name);
          } else {
            setAvatarUrl(session.user.user_metadata.avatar_url);
            setDisplayName(session.user.user_metadata.full_name || session.user.user_metadata.name);
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
    router.push('/login');
    setIsUserLoggedIn(false);
    setAvatarUrl(null);
    setDisplayName(null);
  };

  return (
    <nav className="w-full bg-[#050a05] border-b border-[#1a2a1a] py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6">
        
        {/* LOGO */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => { setAbaAtiva('home'); router.push(isUserLoggedIn ? '/dashboard' : '/'); }}
        >
          <div className="p-1.5 rounded-md bg-transparent transition-transform group-hover:scale-105">
            <img 
              src="/logo.png" 
              alt="Dados e Lendas" 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover filter drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]" 
            />
          </div>
          <span className="font-bold text-white tracking-[0.2em] font-serif hidden sm:block uppercase text-xs md:text-base group-hover:text-[#00ff66] transition-colors">
            Dados e Lendas
          </span>
        </div>
        
        {/* Loading State */}
        {isLoading ? (
           <div className="animate-pulse flex gap-4">
             <div className="h-4 w-20 bg-[#1a2a1a] rounded"></div>
             <div className="h-4 w-20 bg-[#1a2a1a] rounded"></div>
           </div>
        ) : (
          <>
            {/* ABAS CENTRAIS */}
            <div className="flex items-center gap-6 md:gap-10">
              {isUserLoggedIn && (
                <div className="flex gap-6 md:gap-10 text-xs font-bold uppercase tracking-widest">
                  <button 
                    onClick={() => { setAbaAtiva('campanhas'); router.push('/campanhas'); }}
                    className={`${abaAtiva === 'campanhas' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#8a9a8a] hover:text-[#00ff66]'} transition-all`}
                  >
                    Campanhas
                  </button>
                  <button 
                      onClick={() => { setAbaAtiva('personagens'); router.push('/personagens'); }}
                      className={`${abaAtiva === 'personagens' ? 'text-[#00ff66] border-b-2 border-[#00ff66] pb-1' : 'text-[#8a9a8a] hover:text-[#00ff66]'} transition-all`}
                    >
                      Personagens
                    </button>
                </div>
              )}
            </div>

            {/* ÁREA DO USUÁRIO */}
            <div className="flex items-center">
              {isUserLoggedIn ? (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setAbaAtiva('perfil'); router.push('/perfil'); }} 
                    className="flex items-center gap-3 group"
                  >
                    {/* Nome de Exibição (Estilo da Logo) */}
                    <span className={"hidden md:block text-sm text-white font-bold font-serif tracking-wider transition-colors group-hover:text-[#00ff66] duration-300 text-[#00ff66]"}>
                      {displayName || 'Aventureiro'}
                    </span>

                    {/* Foto de Perfil */}
                    <div className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden ${abaAtiva === 'perfil' ? 'border-[#00ff66] shadow-[0_0_8px_#00ff66]' : 'border-[#1a2a1a] group-hover:border-[#00ff66]'}`}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className={abaAtiva === 'perfil' ? 'text-[#00ff66]' : 'text-[#4a5a4a] group-hover:text-[#00ff66]'} />
                        )}
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleLogout}
                    className="text-[#4a5a4a] hover:text-red-400 transition-colors ml-2"
                    title="Sair"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-6">
                  <button
                    onClick={() => { setAbaAtiva('login'); router.push('/login'); }}
                    className={`font-bold text-xs tracking-widest uppercase ${abaAtiva === 'login' ? 'text-[#00ff66]' : 'text-white hover:text-[#00ff66]'} transition-colors`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setAbaAtiva('cadastro'); router.push('/cadastro'); }}
                    className={`font-bold text-xs tracking-widest uppercase ${abaAtiva === 'cadastro' ? 'text-[#00ff66]' : 'text-white hover:text-[#00ff66]'} transition-colors`}
                  >
                    Cadastro
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </nav>
  );
}