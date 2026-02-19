"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { User, Camera, Save, Key, Mail, ShieldAlert, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

//TELA DE ACESSO NEGADO
function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-[#050a05] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-[#0a120a] border border-red-900/30 p-12 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.1)] max-w-lg w-full">
        <div className="mx-auto w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/50">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-serif text-white mb-4 italic tracking-wide">ACESSO NEGADO</h1>
        <p className="text-[#8a9a8a] mb-8 leading-relaxed">
          Alto lá! Apenas membros da guilda podem acessar os registros pessoais.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/login" className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg uppercase tracking-widest hover:bg-[#00cc52] transition-colors">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// TELA DE CARREGAMENTO
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#050a05] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#1a2a1a] border-t-[#00ff66] rounded-full animate-spin"></div>
        <p className="text-[#00ff66] text-xs uppercase tracking-[0.3em] font-bold animate-pulse">Lendo pergaminhos...</p>
      </div>
    </div>
  );
}

export default function PerfilView() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Auth e Loading
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Estados do Formulário
  const [abaAtiva, setAbaAtiva] = useState('perfil');
  const [profileData, setProfileData] = useState({
    nickname: '',
    display_name: '',
    avatar_url: ''
  });
  
  // Estados de Senha
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Verificar Login e Carregar Dados
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setUserId(session.user.id);
      setUserEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfileData({
        nickname: profile?.nickname || '',
        display_name: profile?.display_name || '',
        avatar_url: profile?.avatar_url || ''
      });
      
      setLoading(false);
    };

    loadProfile();
  }, [supabase]);

  // Upload de Imagem
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        const reader = new FileReader();
        reader.onload = (e) => {
            setProfileData(prev => ({ ...prev, avatar_url: e.target?.result as string }));
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
      }

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  // 3. Salvar Alterações
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Atualiza Perfil (Nome e Avatar)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Atualiza Senha (Se a seção estiver aberta e campos preenchidos)
      if (showPasswordSection && passwords.newPassword) {
        
        if (passwords.newPassword !== passwords.confirmPassword) {
          throw new Error("As novas senhas não conferem.");
        }

        if (!passwords.currentPassword) {
          throw new Error("Digite a senha atual para confirmar a mudança.");
        }

        // Verifica a senha atual tentando fazer login
        if (userEmail) {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: passwords.currentPassword
            });

            if (loginError) {
                throw new Error("Senha atual incorreta.");
            }
        }

        // Se o login passou, atualiza a senha
        const { error: passwordError } = await supabase.auth.updateUser({
          password: passwords.newPassword
        });

        if (passwordError) throw passwordError;
        
        // Limpa campos e fecha seção
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
      }

      setMessage({ type: 'success', text: "Perfil atualizado com sucesso!" });

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!isAuthenticated) return <UnauthorizedState />;

  return (
    <div className="min-h-screen bg-[#050a05] flex flex-col font-sans text-white">
      
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
      <main className="flex-grow w-full max-w-[1000px] mx-auto animate-in fade-in zoom-in duration-300 py-12 px-6">
        
        <div className="mb-8 border-l-4 border-[#00ff66] pl-6">
            <h2 className="text-[#f1e5ac] text-3xl font-serif tracking-[0.2em] uppercase italic">
              Perfil do Jogador
            </h2>
            <p className="text-[#8a9a8a] text-sm mt-2">Gerencie sua identidade e runas de acesso.</p>
        </div>

        {message && (
            <div className={`mb-6 p-4 rounded border ${message.type === 'success' ? 'bg-[#003a07] border-[#00ff66] text-[#00ff66]' : 'bg-red-900/20 border-red-500 text-red-200'} text-center`}>
                {message.text}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* COLUNA ESQUERDA: AVATAR */}
            <div className="md:col-span-1">
                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center h-full">
                    
                    <div className="relative mb-6 group">
                        <div className="w-40 h-40 rounded-full border-4 border-[#1a2a1a] group-hover:border-[#00ff66] transition-all overflow-hidden bg-black flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            {profileData.avatar_url ? (
                                <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="text-[#4a5a4a]" />
                            )}
                        </div>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-0 right-0 bg-[#00ff66] text-black p-2 rounded-full hover:bg-white transition-colors shadow-lg"
                            title="Alterar Retrato"
                        >
                            <Camera size={18} />
                        </button>
                    </div>

                    <h3 className="text-white text-xl font-bold mb-1">{profileData.nickname || 'Aventureiro'}</h3>
                    <span className="text-[#00ff66] text-[10px] uppercase tracking-widest font-black bg-[#00ff66]/10 px-3 py-1 rounded">
                        Membro da Guilda
                    </span>

                    <div className="w-full border-t border-[#1a2a1a] my-6"></div>

                    <div className="w-full text-left space-y-4">
                        <div>
                            <span className="text-[#4a5a4a] text-[10px] uppercase tracking-widest block mb-1">Email Vinculado</span>
                            <div className="flex items-center gap-2 text-[#8a9a8a] text-sm bg-black/50 p-2 rounded border border-[#1a2a1a]">
                                <Mail size={14} />
                                <span className="truncate">{userEmail}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* COLUNA DIREITA: DADOS */}
            <div className="md:col-span-2 space-y-6">
                
                {/* DADOS PÚBLICOS */}
                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <h3 className="text-[#f1e5ac] text-lg font-serif mb-6 flex items-center gap-2">
                        <User size={18} />
                        Identidade Pública
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                Nome de Exibição
                            </label>
                            <input 
                                type="text" 
                                value={profileData.display_name}
                                onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
                                className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                                placeholder="Como quer ser chamado nas mesas?"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex justify-between">
                                <span>Nickname</span>
                                <span className="text-red-400 flex items-center gap-1 text-[9px]"><Lock size={10}/>Não pode ser alterado</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={profileData.nickname}
                                    disabled
                                    className="w-full bg-[#1a2a1a]/30 border border-[#1a2a1a] rounded-lg py-3 px-4 text-[#8a9a8a] text-sm cursor-not-allowed select-none"
                                />
                                <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a5a4a]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEGURANÇA (Dropdown) */}
                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <button 
                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                        className="w-full p-6 flex items-center justify-between bg-[#0a120a] hover:bg-[#1a2a1a]/30 transition-colors"
                    >
                        <h3 className="text-[#f1e5ac] text-lg font-serif flex items-center gap-2">
                            <Key size={18} />
                            Runas de Segurança
                        </h3>
                        {showPasswordSection ? <ChevronUp className="text-[#00ff66]" /> : <ChevronDown className="text-[#4a5a4a]" />}
                    </button>
                    
                    {showPasswordSection && (
                        <div className="p-8 border-t border-[#1a2a1a] animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                        Senha Atual (Obrigatório)
                                    </label>
                                    <input 
                                        type="password" 
                                        value={passwords.currentPassword}
                                        onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                                        placeholder="••••••••"
                                        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                            Nova Senha
                                        </label>
                                        <input 
                                            type="password" 
                                            value={passwords.newPassword}
                                            onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                                            placeholder="••••••••"
                                            className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                            Confirmar Nova Senha
                                        </label>
                                        <input 
                                            type="password" 
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                                            placeholder="••••••••"
                                            className={`w-full bg-black border rounded-lg py-3 px-4 text-white text-sm focus:outline-none transition-colors ${
                                                passwords.newPassword && passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-[#1a2a1a] focus:border-[#00ff66]'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTÃO SALVAR */}
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        'Gravando informações...'
                    ) : (
                        <>
                            <Save size={18} />
                            Salvar Alterações
                        </>
                    )}
                </button>

            </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
}