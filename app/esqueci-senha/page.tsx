'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'error' | 'success', text: string} | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Redireciona para a página onde ele digita a nova senha
      redirectTo: `${location.origin}/auth/callback?next=/auth/update-password`,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: "Email de recuperação enviado! Verifique sua caixa de entrada." })
    }
    setLoading(false)
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#060c06] p-4 text-[#e4e8e1] ${inter.className}`}>
      <div className="w-full max-w-md space-y-8 rounded-xl border border-[#219246]/30 bg-[#060c06]/80 p-8 backdrop-blur-md shadow-2xl">
        <div className="text-center">
          <h1 className={`text-2xl font-bold italic text-[#01fe66] ${playfair.className} mb-2`}>
            RECUPERAR ACESSO
          </h1>
          <p className="text-[#80887e] text-sm">Digite seu email para receber um link de redefinição.</p>
        </div>

        {message && (
          <div className={`rounded p-3 text-sm text-center border ${
            message.type === 'error' ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-[#003a07] border-[#01fe66]/50 text-[#01fe66]'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#80887e] mb-1">EMAIL CADASTRADO</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-[#003a07] border border-[#219246] p-3 text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#01fe66] py-3 font-bold text-[#060c06] uppercase tracking-wider hover:bg-[#1cef6f] disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Link'}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#80887e] hover:text-[#e4e8e1] hover:underline">Voltar para Login</Link>
        </p>
      </div>
    </div>
  )
}