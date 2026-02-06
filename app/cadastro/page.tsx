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

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    displayName: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Validação de Senha Forte
  const validatePassword = (pass: string) => {
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(pass);
  }

  // NOVA: Validação de Nickname (Apenas letras, números, hifens e underline)
  const validateNickname = (nick: string) => {
    // ^ = início, $ = fim
    // [a-zA-Z0-9_-] = caracteres permitidos
    // + = um ou mais
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(nick);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // 1. Validação de Senhas Iguais
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("As runas de segurança (senhas) não conferem.")
      setLoading(false)
      return
    }

    // 2. Validação de Nickname (Sem espaços/especiais)
    if (!validateNickname(formData.nickname)) {
      setErrorMsg("O nickname inválido. Use apenas letras, números, '-' ou '_'. Não use espaços.")
      setLoading(false)
      return
    }

    // 3. Validação de Força da Senha
    if (!validatePassword(formData.password)) {
      setErrorMsg("A senha é muito fraca. Use: 8+ caracteres, Maiúscula, Número e Símbolo Especial.")
      setLoading(false)
      return
    }

    // 4. Envio para o Supabase
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          display_name: formData.displayName,
          nickname: formData.nickname,
        },
      }
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      setSuccessMsg("Conta criada! Um pergaminho de confirmação foi enviado ao seu email.")
      setLoading(false)
      setFormData({ email: '', password: '', confirmPassword: '', nickname: '', displayName: '' })
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050505] p-4 text-white ${inter.className}`}>
      
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm shadow-2xl transition-all hover:border-[#00fe66]/30">
        
        {/* Cabeçalho com Logo */}
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-4 h-24 w-24">
            <img 
              src="/logo.png" 
              alt="Logo Dados e Lendas" 
              className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(0,254,102,0.4)] rounded-full"
            />
          </div>
          <h1 className={`text-3xl font-bold italic text-[#00fe66] ${playfair.className} mb-2`}>
            CRIE SUA LENDA
          </h1>
          <p className="text-slate-400 text-sm">Crie sua conta para começar.</p>
        </div>

        {/* Feedbacks */}
        {errorMsg && (
          <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 animate-pulse">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded border border-[#00fe66]/50 bg-[#00fe66]/10 p-4 text-center">
            <h3 className="text-[#00fe66] font-bold text-lg mb-1">Sucesso!</h3>
            <p className="text-emerald-100 text-sm">{successMsg}</p>
            <Link href="/login" className="mt-4 inline-block text-sm text-[#00fe66] underline hover:text-[#00cc52]">Voltar para Login</Link>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSignup} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">NICKNAME (ÚNICO)</label>
                <input
                  name="nickname"
                  type="text"
                  required
                  placeholder="@nickname"
                  onChange={handleChange}
                  title="Apenas letras, números, hífens (-) e underlines (_)."
                  className="w-full rounded bg-black/40 border border-slate-700 p-2.5 text-sm text-white focus:border-[#00fe66] focus:outline-none transition-colors placeholder-slate-600"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Sem espaços. Use '-' ou '_'.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">NOME DE EXIBIÇÃO</label>
                <input
                  name="displayName"
                  type="text"
                  required
                  placeholder="Nome de Exibição"
                  onChange={handleChange}
                  className="w-full rounded bg-black/40 border border-slate-700 p-2.5 text-sm text-white focus:border-[#00fe66] focus:outline-none transition-colors placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">EMAIL</label>
              <input
                name="email"
                type="email"
                required
                onChange={handleChange}
                placeholder="seu@email.com"
                className="w-full rounded bg-black/40 border border-slate-700 p-2.5 text-sm text-white focus:border-[#00fe66] focus:outline-none transition-colors placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">SENHA</label>
              <input
                name="password"
                type="password"
                required
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded bg-black/40 border border-slate-700 p-2.5 text-sm text-white focus:border-[#00fe66] focus:outline-none transition-colors placeholder-slate-600"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Min. 8 caracteres, 1 maiúscula, 1 número e 1 especial (!@#$).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">CONFIRMAR SENHA</label>
              <input
                name="confirmPassword"
                type="password"
                required
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full rounded bg-black/40 border p-2.5 text-sm text-white focus:outline-none transition-colors placeholder-slate-600 ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-slate-700 focus:border-[#00fe66]'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-[#00fe66] px-4 py-3 font-bold text-black uppercase tracking-wider shadow-[0_0_15px_rgba(0,254,102,0.4)] transition-all hover:bg-[#00cc52] hover:shadow-[0_0_25px_rgba(0,254,102,0.6)] disabled:opacity-50 mt-6"
            >
              {loading ? 'Escrevendo no livro...' : 'Cadastrar-se'}
            </button>
          </form>
        )}

        {!successMsg && (
          <p className="text-center text-sm text-slate-500">
            Já possui cadastro? <Link href="/login" className="text-[#00fe66] hover:text-[#00cc52] hover:underline">Entrar</Link>
          </p>
        )}
      </div>
    </div>
  )
}