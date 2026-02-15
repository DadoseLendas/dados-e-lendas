'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display, Inter } from 'next/font/google'
import { ChevronRight } from 'lucide-react'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estados de erro
  const [emailError, setEmailError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setFormError(error.message)
      setLoading(false)
    }
  }

  // Validação em tempo real ao sair do campo
  const validateEmail = () => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email.length > 0 && !regex.test(email)) {
      setEmailError(true)
    } else {
      setEmailError(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)

    if (emailError) {
        setFormError("Corrija o email antes de continuar.")
        setLoading(false)
        return
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setFormError("Credenciais inválidas. Verifique seu email e senha.")
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050a05] p-4 text-white ${inter.className}`}>
      
      <div className="w-full max-w-md space-y-8 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all hover:border-[#00ff66]/30">
        
        {/* Cabeçalho */}
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-6 h-24 w-24">
            <img 
              src="/logo.png" 
              alt="Logo Dados e Lendas" 
              className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(0,255,102,0.4)] rounded-full"
            />
          </div>
          
          <h1 className={`text-4xl font-bold italic tracking-wide text-white ${playfair.className}`}>
            BEM VINDO <span className="text-[#00ff66]">AVENTUREIRO</span>
          </h1>
          <p className="text-[#8a9a8a] text-sm mt-2">Entre e continue sua jornada.</p>
        </div>

        {/* Feedback de Erro Geral */}
        {formError && (
          <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 text-center animate-pulse">
            ⚠️ {formError}
          </div>
        )}

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="group relative flex w-full items-center justify-center gap-3 rounded bg-white px-4 py-3 text-sm font-bold text-black transition-all hover:bg-[#e4e8e1] disabled:opacity-50"
        >
          <img 
            src="https://www.svgrepo.com/show/475656/google-color.svg" 
            alt="Google" 
            className="h-5 w-5" 
          />
          {loading ? 'Conjurando portal...' : 'Entrar com Google'}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-[#1a2a1a]"></div>
          <span className="mx-4 flex-shrink text-xs text-[#4a5a4a] uppercase tracking-widest">ou login manual</span>
          <div className="flex-grow border-t border-[#1a2a1a]"></div>
        </div>

        {/* Formulário Manual */}
        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if(emailError) setEmailError(false) // Limpa erro ao digitar
              }}
              onBlur={validateEmail}
              className={`w-full rounded bg-[#050a05] border p-3 text-white placeholder-[#1a2a1a] focus:outline-none transition-colors ${
                emailError 
                ? 'border-red-500 focus:border-red-500 text-red-100' 
                : 'border-[#1a2a1a] focus:border-[#00ff66]'
              }`}
              placeholder="seu@email.com"
            />
            {emailError && (
                <span className="text-red-400 text-[10px] mt-1 ml-1 block">Formato de email inválido (ex: nome@dominio.com)</span>
            )}
          </div>
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-3 text-white placeholder-[#1a2a1a] focus:border-[#00ff66] focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div className="text-right">
            <Link href="/esqueci-senha" className="text-xs text-[#00ff66] hover:underline tracking-wide">
              Esqueci minha senha
            </Link>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#00ff66] py-3 font-bold text-black uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all hover:bg-[#00cc52] hover:shadow-[0_0_25px_rgba(0,255,102,0.5)] disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {loading ? 'Abrindo portões...' : 'Iniciar Aventura'} 
            {!loading && <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>}
          </button>
        </form>

        <p className="text-center text-sm text-[#8a9a8a]">
          Novo por aqui? <Link href="/cadastro" className="text-[#00ff66] hover:underline transition-colors font-bold ml-1">Criar Conta</Link>
        </p>
      </div>
    </div>
  )
}