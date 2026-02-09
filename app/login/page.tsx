'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg("Credenciais inválidas. Verifique seu email e senha.")
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050505] p-4 text-white ${inter.className}`}>
      
      <div className="w-full max-w-md space-y-8 rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm shadow-2xl transition-all hover:border-[#00fe66]/30">
        
        {/* Cabeçalho com Logo */}
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-6 h-24 w-24">
            {/* Certifique-se de que o arquivo logo.jpg está na pasta 'public' */}
            <img 
              src="/logo.png" 
              alt="Logo Dados e Lendas" 
              className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(0,254,102,0.4)] rounded-full"
            />
          </div>
          
          <h1 className={`text-4xl font-bold italic tracking-wide text-white ${playfair.className}`}>
            BEM VINDO <span className="text-[#00fe66]">AVENTUREIRO</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Entre e continue sua jornada.</p>
        </div>

        {/* Feedback de Erro */}
        {errorMsg && (
          <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 text-center animate-pulse">
            {errorMsg}
          </div>
        )}

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="group relative flex w-full items-center justify-center gap-3 rounded bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 disabled:opacity-50"
        >
          <img 
            src="https://www.svgrepo.com/show/475656/google-color.svg" 
            alt="Google" 
            className="h-5 w-5" 
          />
          {loading ? 'Conjurando portal...' : 'Entrar com Google'}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="mx-4 flex-shrink text-xs text-slate-500 uppercase tracking-widest">ou fazer login</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        {/* Formulário Manual */}
        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">EMAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-black/40 border border-slate-700 p-3 text-white placeholder-slate-600 focus:border-[#00fe66] focus:ring-1 focus:ring-[#00fe66] focus:outline-none transition-colors selection:bg-[#00fe66] selection:text-black"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">SENHA</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-black/40 border border-slate-700 p-3 text-white placeholder-slate-600 focus:border-[#00fe66] focus:ring-1 focus:ring-[#00fe66] focus:outline-none transition-colors selection:bg-[#00fe66] selection:text-black"
              placeholder="••••••••"
            />
          </div>

          <div className="text-right">
            <Link href="/esqueci-senha" className="text-xs text-[#01fe66] hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#00fe66] py-3 font-bold text-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,254,102,0.4)] transition-all hover:bg-[#00cc52] hover:shadow-[0_0_25px_rgba(0,254,102,0.6)] disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? 'Abrindo portões...' : 'Iniciar Aventura'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Novo por aqui? <Link href="/cadastro" className="text-[#00fe66] hover:text-[#00cc52] hover:underline transition-colors">Criar Conta</Link>
        </p>
      </div>
    </div>
  )
}