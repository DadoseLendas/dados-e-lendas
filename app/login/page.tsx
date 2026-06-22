'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display, Inter } from 'next/font/google'
import { ChevronRight } from 'lucide-react'


const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

// Ícone do Google inline (SVG oficial colorido) — sem depender de imagem externa,
// que era a causa do "ícone bugado" quando o host externo ficava indisponível.
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Lê a razão do logout automático (se houver) e já define como erro inicial
  const sessionReason = searchParams.get('reason')

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
      // TRATAMENTO ESPECÍFICO DE UX: O Fim da Frustração
      if (error.message === "Email not confirmed") {
        setFormError("Seu pergaminho ainda não foi assinado! Verifique sua caixa de e-mail (e spam) para confirmar sua conta.");
      } 
      else if (error.message === "Invalid login credentials") {
        setFormError("Credenciais inválidas. Os deuses não reconhecem este e-mail ou senha.");
      } 
      else {
        // Fallback para qualquer outro erro (ex: muito tempo sem logar, rede caindo)
        setFormError(`Erro místico: ${error.message}`);
      }
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
          <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-4 text-sm text-red-200 text-center animate-in fade-in zoom-in duration-300 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]">
            <span className="font-bold uppercase tracking-widest block mb-1 text-[10px] text-red-400">Acesso Negado</span>
            {formError}
          </div>
        )}

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="group relative flex w-full items-center justify-center gap-3 rounded bg-white px-4 py-3 text-sm font-bold text-black transition-all hover:bg-[#e4e8e1] disabled:opacity-50"
        >
          <GoogleIcon className="h-5 w-5" />
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}