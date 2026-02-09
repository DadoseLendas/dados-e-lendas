'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client' // Usando nosso utilitário
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function SignupPage() {
  const supabase = createClient()
  
  // Estados do Formulário
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    displayName: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingVerification, setPendingVerification] = useState(false) // Novo estado para controlar a UI

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Validação de Senha (Ajustada para aceitar .,/:@#$%)
  const validatePassword = (pass: string) => {
    // Pelo menos 8 chars, 1 Maiúscula, 1 Número, 1 Especial
    const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[.,/:@#$%!^&*()_+\-=\[\]{};'"\\|<>\?]).{8,}$/;
    return strongRegex.test(pass);
  }

  const validateNickname = (nick: string) => {
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(nick);
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("As runas de segurança (senhas) não conferem.")
      setLoading(false)
      return
    }

    if (!validateNickname(formData.nickname)) {
      setErrorMsg("Nickname inválido. Use apenas letras, números, '-' ou '_'.")
      setLoading(false)
      return
    }

    if (!validatePassword(formData.password)) {
      setErrorMsg("Senha fraca. Mínimo 8 caracteres, 1 Maiúscula, 1 Número e 1 Símbolo (ex: @ . / :)")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`, // Importante para confirmar e logar
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
      // Sucesso! Muda a tela para "Verificação Pendente"
      setPendingVerification(true)
      setLoading(false)
    }
  }

  // Função para Reenviar Email
  const handleResendEmail = async () => {
    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    })
    if (error) setErrorMsg(error.message)
    else alert("Pergaminho reenviado! Verifique sua caixa de entrada.")
    setLoading(false)
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#060c06] p-4 text-[#e4e8e1] ${inter.className}`}>
      
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-[#219246]/30 bg-[#060c06]/80 p-8 backdrop-blur-md shadow-2xl transition-all hover:border-[#01fe66]/50">
        
        {/* TELA 1: CONFIRMAÇÃO DE EMAIL (Se pendingVerification for true) */}
        {pendingVerification ? (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#003a07] border-2 border-[#01fe66] shadow-[0_0_20px_rgba(1,254,102,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#01fe66" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            
            <h2 className={`text-2xl font-bold text-[#01fe66] ${playfair.className}`}>Confirme seu Email</h2>
            
            <p className="text-[#80887e]">
              Enviamos um pergaminho mágico para <strong>{formData.email}</strong>.
              <br/>Clique no link para ativar sua conta.
            </p>

            <div className="flex flex-col gap-3 pt-4">
               <button
                onClick={handleResendEmail}
                disabled={loading}
                className="text-sm font-semibold text-[#01fe66] hover:underline disabled:opacity-50"
              >
                {loading ? 'Reenviando...' : 'Não recebeu? Reenviar Email'}
              </button>

              <Link 
                href="/login" 
                className="w-full rounded bg-[#e4e8e1] py-3 font-bold text-[#060c06] hover:bg-white transition-colors"
              >
                Voltar para Login
              </Link>
            </div>
          </div>
        ) : (
          // TELA 2: FORMULÁRIO DE CADASTRO (Padrão)
          <>
            <div className="text-center flex flex-col items-center">
              <div className="relative mb-4 h-24 w-24">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(1,254,102,0.4)] rounded-full"
                />
              </div>
              <h1 className={`text-3xl font-bold italic text-[#01fe66] ${playfair.className} mb-2`}>
                CRIE SUA LENDA
              </h1>
              <p className="text-[#80887e] text-sm">Preencha sua ficha para começar.</p>
            </div>

            {errorMsg && (
              <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 animate-pulse text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#80887e] mb-1">NICKNAME</label>
                  <input
                    name="nickname"
                    type="text"
                    required
                    placeholder="@gandalf"
                    onChange={handleChange}
                    className="w-full rounded bg-[#003a07] border border-[#219246] p-2.5 text-sm text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#80887e] mb-1">NOME EXIBIÇÃO</label>
                  <input
                    name="displayName"
                    type="text"
                    required
                    placeholder="Mago Cinzento"
                    onChange={handleChange}
                    className="w-full rounded bg-[#003a07] border border-[#219246] p-2.5 text-sm text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#80887e] mb-1">EMAIL</label>
                <input
                  name="email"
                  type="email"
                  required
                  onChange={handleChange}
                  className="w-full rounded bg-[#003a07] border border-[#219246] p-2.5 text-sm text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#80887e] mb-1">SENHA</label>
                <input
                  name="password"
                  type="password"
                  required
                  onChange={handleChange}
                  className="w-full rounded bg-[#003a07] border border-[#219246] p-2.5 text-sm text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none transition-colors"
                />
                 <p className="text-[10px] text-[#80887e] mt-1">
                  Min. 8 caracteres, Maiúscula, Número e Especial (ex: . / @).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#80887e] mb-1">CONFIRMAR SENHA</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  onChange={handleChange}
                  className={`w-full rounded bg-[#003a07] border p-2.5 text-sm text-[#e4e8e1] focus:outline-none transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword 
                      ? 'border-red-500' 
                      : 'border-[#219246] focus:border-[#01fe66]'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-[#01fe66] px-4 py-3 font-bold text-[#060c06] uppercase tracking-wider shadow-[0_0_15px_rgba(1,254,102,0.4)] transition-all hover:bg-[#1cef6f] disabled:opacity-50 mt-6"
              >
                {loading ? 'Escrevendo...' : 'Cadastrar-se'}
              </button>
            </form>

            <p className="text-center text-sm text-[#80887e]">
              Já possui conta? <Link href="/login" className="text-[#01fe66] hover:underline">Entrar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}