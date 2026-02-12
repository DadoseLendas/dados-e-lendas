'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client' 
import { useRouter } from 'next/navigation'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({ 
    nickname: '', 
    displayName: '',
    password: '',
    confirmPassword: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState(false)

  // Verifica se o usuário chegou aqui logado (via Google ou Link Mágico)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
    }
    checkSession()
  }, [supabase, router])

  const nicknameRegex = /^[a-zA-Z0-9_-]+$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === 'nickname' && nicknameError) setNicknameError(false)
  }

  const handleNicknameBlur = () => {
    if (formData.nickname.length > 0 && !nicknameRegex.test(formData.nickname)) {
      setNicknameError(true)
    }
  }

  const validatePassword = (pass: string) => {
    // Validação de força de senha no Frontend (UX)
    const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[.,/:@#$%!^&*()_+\-=\[\]{};'"\\|<>\?]).{8,}$/;
    return strongRegex.test(pass);
  }

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // Validação Visual do Nickname
    if (!nicknameRegex.test(formData.nickname)) {
      setNicknameError(true)
      setErrorMsg("Nickname inválido. Use apenas letras, números, '-' ou '_'.")
      setLoading(false)
      return
    }

    // Lógica de Senha
    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg("As senhas não conferem.")
        setLoading(false)
        return
      }
      if (!validatePassword(formData.password)) {
        setErrorMsg("Senha fraca. Mínimo 8 caracteres, 1 Maiúscula, 1 Número e 1 Especial.")
        setLoading(false)
        return
      }

      // Atualiza a senha do usuário LOGADO
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (passwordError) {
        setErrorMsg(`Erro ao definir senha: ${passwordError.message}`)
        setLoading(false)
        return
      }
    }

    // Obter dados do usuário para vincular ao perfil
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setErrorMsg("Sessão expirada. Faça login novamente.")
      setLoading(false)
      return
    }

    // Criar o Perfil Público
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id, 
        nickname: formData.nickname,
        display_name: formData.displayName,
        avatar_url: user.user_metadata.avatar_url,
        role: 'user'
      })

    if (error) {
      // Tratamento de erro de banco de dados (Ex: Nickname duplicado)
      if (error.code === '23505') { 
        setErrorMsg("Este nickname já está sendo usado por outro aventureiro.")
        setNicknameError(true)
      } else {
        setErrorMsg(`Erro ao salvar perfil: ${error.message}`)
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050a05] p-4 text-white ${inter.className}`}>
      
      <div className="w-full max-w-md space-y-8 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-6 h-20 w-20">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(0,255,102,0.4)] rounded-full"
            />
          </div>
          
          <h1 className={`text-2xl font-bold italic text-[#00ff66] ${playfair.className} mb-2`}>
            QUASE LÁ, AVENTUREIRO!
          </h1>
          <p className="text-[#8a9a8a] text-sm">
            Finalize seu cadastro definindo sua identidade.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 text-center animate-pulse border-l-4 border-l-red-500">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleCompleteProfile} className="space-y-5">
          {/* Nickname */}
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">NICKNAME</label>
            <input
              name="nickname"
              type="text"
              required
              placeholder="@meunickname"
              value={formData.nickname}
              onChange={handleChange}
              onBlur={handleNicknameBlur}
              className={`w-full rounded bg-[#050a05] border p-3 text-white focus:outline-none transition-colors ${
                nicknameError 
                  ? 'border-red-500 focus:border-red-500 text-red-100 placeholder-red-300/50' 
                  : 'border-[#1a2a1a] focus:border-[#00ff66] placeholder-[#1a2a1a]'
              }`}
            />
            {nicknameError && (
              <span className="text-red-400 text-[10px] mt-1 ml-1 block font-bold">
                Apenas letras, números, '-' ou '_'. Sem espaços.
              </span>
            )}
          </div>
          
          {/* Nome de Exibição */}
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">NOME DE EXIBIÇÃO</label>
            <input
              name="displayName"
              type="text"
              required
              placeholder="Nome de exibição"
              value={formData.displayName}
              onChange={handleChange}
              className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-3 text-white focus:border-[#00ff66] focus:outline-none transition-colors placeholder-[#1a2a1a]"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">SENHA</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-3 text-white focus:border-[#00ff66] focus:outline-none transition-colors placeholder-[#1a2a1a]"
            />
          </div>

           {/* Confirmar Senha */}
           <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">CONFIRMAR SENHA</label>
            <input
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full rounded bg-[#050a05] border p-3 text-white focus:outline-none transition-colors placeholder-[#1a2a1a] ${
                formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword 
                  ? 'border-red-500' 
                  : 'border-[#1a2a1a] focus:border-[#00ff66]'
              }`}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#00ff66] py-3 font-bold text-black uppercase tracking-widest hover:bg-[#00cc52] shadow-[0_0_15px_rgba(0,255,102,0.3)] disabled:opacity-50 mt-4 transition-all"
          >
            {loading ? 'Salvando...' : 'Concluir Cadastro'}
          </button>
        </form>
      </div>
    </div>
  )
}