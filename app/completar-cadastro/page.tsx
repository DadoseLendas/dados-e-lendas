'use client'

import { useState, useEffect } from 'react'
// Importamos do NOSSO utilitário Client
import { createClient } from '@/utils/supabase/client' 
import { useRouter } from 'next/navigation'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function CompleteProfilePage() {
  const router = useRouter()
  const supabase = createClient() // Cliente Navegador
  
  const [formData, setFormData] = useState({
    nickname: '',
    displayName: ''
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Verifica sessão
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkSession()
  }, [supabase, router])

  const validateNickname = (nick: string) => {
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(nick);
  }

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // Validações
    if (!validateNickname(formData.nickname)) {
      setErrorMsg("Nickname inválido. Use apenas letras, números, '-' ou '_'.")
      setLoading(false)
      return
    }

    // Pega usuário atual
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setErrorMsg("Erro de autenticação. Tente fazer login novamente.")
      setLoading(false)
      return
    }

    // Insere no banco
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
      if (error.code === '23505') { 
        setErrorMsg("Este nickname já está sendo usado.")
      } else {
        setErrorMsg(error.message)
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#060c06] p-4 text-[#e4e8e1] ${inter.className}`}>
      
      <div className="w-full max-w-md space-y-8 rounded-xl border border-[#219246]/30 bg-[#060c06]/80 p-8 backdrop-blur-md shadow-2xl">
        
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-6 h-20 w-20">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(1,254,102,0.4)] rounded-full"
            />
          </div>
          
          <h1 className={`text-2xl font-bold italic text-[#01fe66] ${playfair.className} mb-2`}>
            QUASE LÁ, HERÓI!
          </h1>
          <p className="text-[#80887e] text-sm">
            O Oráculo precisa saber como devemos lhe chamar.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 text-center animate-pulse">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCompleteProfile} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#80887e] mb-1">NICKNAME (ÚNICO)</label>
            <input
              type="text"
              required
              placeholder="@gandalf"
              value={formData.nickname}
              onChange={(e) => setFormData({...formData, nickname: e.target.value})}
              className="w-full rounded bg-[#003a07] border border-[#219246] p-3 text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[#80887e] mb-1">NOME DE EXIBIÇÃO</label>
            <input
              type="text"
              required
              placeholder="Mago Cinzento"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              className="w-full rounded bg-[#003a07] border border-[#219246] p-3 text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none transition-colors"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#01fe66] py-3 font-bold text-[#060c06] uppercase tracking-wider hover:bg-[#1cef6f] disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Concluir Cadastro >'}
          </button>
        </form>
      </div>
    </div>
  )
}