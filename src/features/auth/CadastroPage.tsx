'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display, Inter } from 'next/font/google'
import { Eye, EyeOff } from 'lucide-react'

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
  const [pendingVerification, setPendingVerification] = useState(false)
  const [nicknameError, setNicknameError] = useState(false)
  const [emailError, setEmailError] = useState(false)
  // LGPD Art. 8°: registro de consentimento obrigatório
  const [termsAccepted, setTermsAccepted] = useState(false)
  // Ver senha (olho) nos campos de senha
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Mensagem de sucesso do reenvio (substitui o alert() puro)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Limpa o erro visual assim que o usuário começa a corrigir
    if (name === 'nickname' && nicknameError) setNicknameError(false)
    if (name === 'email' && emailError) setEmailError(false)
  }

  // Validação de Senha
  const validatePassword = (pass: string) => {
    const strongRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[.,/:@#$%!^&*()_+\-=\[\]{};'"\\|<>\?]).{8,}$/;
    return strongRegex.test(pass);
  }

  // Regex de Nickname
  const nicknameRegex = /^[a-zA-Z0-9_-]+$/;
  // Regex de Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

 

  const handleNicknameBlur = () => {
    // Se tiver algo escrito e não passar no regex, ativa erro
    if (formData.nickname.length > 0 && !nicknameRegex.test(formData.nickname)) {
      setNicknameError(true)
    }
  }

  const handleEmailBlur = () => {
    if (formData.email.length > 0 && !emailRegex.test(formData.email)) {
      setEmailError(true)
    }
  }

  ///////////////SUBMIT////////////////////

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // Bloqueia se houver erros visuais pendentes
    if (nicknameError || emailError) {
      setErrorMsg("Corrija os campos em vermelho antes de continuar.")
      setLoading(false)
      return
    }

    if (!termsAccepted) {
      setErrorMsg("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.")
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("As runas de segurança (senhas) não conferem.")
      setLoading(false)
      return
    }

    if (!nicknameRegex.test(formData.nickname)) {
      setNicknameError(true) // Força o erro visual caso o usuário não tenha dado Blur
      setErrorMsg("Nickname inválido. Use apenas letras, números, '-' ou '_'.")
      setLoading(false)
      return
    }

    if (!validatePassword(formData.password)) {
      setErrorMsg("Senha fraca. Mínimo 8 caracteres, 1 Maiúscula, 1 Número e 1 Símbolo.")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          display_name: formData.displayName,
          nickname: formData.nickname,
          // LGPD Art. 8°: timestamp do consentimento salvo nos metadados do usuário
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0',
        },
      }
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      setPendingVerification(true)
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setLoading(true)
    setResendMsg(null)
    setErrorMsg(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    })
    if (error) setErrorMsg(error.message)
    else setResendMsg("Pergaminho reenviado! Verifique sua caixa de entrada (e o spam).")
    setLoading(false)
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050a05] p-4 text-white ${inter.className}`}>
      
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all hover:border-[#00ff66]/30">
        
        {pendingVerification ? (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#050a05] border-2 border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#00ff66" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            
            <h2 className={`text-2xl font-bold text-[#00ff66] ${playfair.className}`}>Confirme seu Email</h2>
            
            <p className="text-[#8a9a8a]">
              Enviamos um pergaminho mágico para <strong>{formData.email}</strong>.
              <br/>Clique no link para ativar sua conta.
            </p>

            {/* Popup de reenvio customizado (substitui o alert() puro) */}
            {resendMsg && (
              <div className="rounded-lg border border-[#00ff66]/50 bg-[#00ff66]/10 p-3 text-sm text-[#00ff66] text-center animate-in fade-in zoom-in duration-300 shadow-[inset_0_0_15px_rgba(0,255,102,0.08)]">
                <span className="font-bold uppercase tracking-widest block mb-1 text-[10px] text-[#00ff66]/70">Reenviado</span>
                {resendMsg}
              </div>
            )}
            {errorMsg && (
              <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
               <button
                onClick={handleResendEmail}
                disabled={loading}
                className="text-sm font-semibold text-[#00ff66] hover:underline disabled:opacity-50"
              >
                {loading ? 'Reenviando...' : 'Não recebeu? Reenviar Email'}
              </button>

              <Link 
                href="/login" 
                className="w-full rounded bg-white py-3 font-bold text-black hover:bg-[#e4e8e1] transition-colors text-center"
              >
                Voltar para Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center flex flex-col items-center">
              <div className="relative mb-4 h-24 w-24">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(0,255,102,0.4)] rounded-full"
                />
              </div>
              <h1 className={`text-3xl font-bold italic text-[#00ff66] ${playfair.className} mb-2`}>
                CRIE SUA LENDA
              </h1>
              <p className="text-[#8a9a8a] text-sm">Preencha sua ficha para começar.</p>
            </div>

            {errorMsg && (
              <div className="rounded border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-200 animate-pulse text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Nickname</label>
                  <input
                    name="nickname"
                    type="text"
                    required
                    placeholder="@meunickname"
                    onChange={handleChange}
                    onBlur={handleNicknameBlur}
                    className={`w-full rounded bg-[#050a05] border p-2.5 text-sm text-white focus:outline-none transition-colors placeholder-[#1a2a1a] ${
                        nicknameError 
                        ? 'border-red-500 focus:border-red-500 text-red-100' 
                        : 'border-[#1a2a1a] focus:border-[#00ff66]'
                    }`}
                  />
                   {nicknameError && (
                    <span className="text-red-400 text-[10px] mt-1 ml-1 block">Sem espaços ou caracteres especiais (use _ ou -)</span>
                   )}
                </div>
                <div>
                  <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Nome Exibição</label>
                  <input
                    name="displayName"
                    type="text"
                    required
                    placeholder="Meu Nome de Exibição"
                    onChange={handleChange}
                    className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-2.5 text-sm text-white focus:border-[#00ff66] focus:outline-none transition-colors placeholder-[#1a2a1a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="meu@email.com"
                  required
                  onChange={handleChange}
                  onBlur={handleEmailBlur} 
                  className={`w-full rounded bg-[#050a05] border p-2.5 text-sm text-white focus:outline-none transition-colors placeholder-[#1a2a1a] ${
                    emailError 
                    ? 'border-red-500 focus:border-red-500 text-red-100' 
                    : 'border-[#1a2a1a] focus:border-[#00ff66]'
                  }`}
                />
                {emailError && (
                    <span className="text-red-400 text-[10px] mt-1 ml-1 block">Formato de email inválido (ex: nome@dominio.com)</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Senha</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder='M1nhaS&nhaF0rt&_'
                    required
                    onChange={handleChange}
                    className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-2.5 pr-10 text-sm text-white focus:border-[#00ff66] focus:outline-none transition-colors placeholder-[#1a2a1a]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5a4a] hover:text-[#00ff66] transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                 <p className="text-[10px] text-[#4a5a4a] mt-1 ml-1">
                  Min. 8 caracteres, Maiúscula, Número e Especial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">Confirmar Senha</label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    onChange={handleChange}
                    className={`w-full rounded bg-[#050a05] border p-2.5 pr-10 text-sm text-white focus:outline-none transition-colors ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? 'border-red-500' 
                        : 'border-[#1a2a1a] focus:border-[#00ff66]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5a4a] hover:text-[#00ff66] transition-colors"
                    title={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* LGPD Art. 8°: checkbox de consentimento obrigatório */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#00ff66] cursor-pointer shrink-0"
                  required
                />
                <span className="text-[11px] text-[#8a9a8a] leading-relaxed">
                  Li e aceito os{' '}
                  <a href="/termos" target="_blank" className="text-[#00ff66] hover:underline font-bold">Termos de Uso</a>
                  {' '}e a{' '}
                  <a href="/privacidade" target="_blank" className="text-[#00ff66] hover:underline font-bold">Política de Privacidade</a>
                  {' '}(versão 1.0).
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full rounded bg-[#00ff66] px-4 py-3 font-bold text-black uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,102,0.3)] transition-all hover:bg-[#00cc52] disabled:opacity-50 mt-6"
              >
                {loading ? 'Escrevendo...' : 'Cadastrar-se'}
              </button>
            </form>

            <p className="text-center text-sm text-[#8a9a8a]">
              Já possui conta? <Link href="/login" className="text-[#00ff66] hover:underline font-bold ml-1">Entrar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}