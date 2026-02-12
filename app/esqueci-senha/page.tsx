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
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050a05] p-4 text-white ${inter.className}`}>
      <div className="w-full max-w-md space-y-8 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="text-center">
          <h1 className={`text-2xl font-bold italic text-[#00ff66] ${playfair.className} mb-2`}>
            RECUPERAR ACESSO
          </h1>
          <p className="text-[#8a9a8a] text-sm">Digite seu email para receber um link de redefinição.</p>
        </div>

        {message && (
          <div className={`rounded p-3 text-sm text-center border ${
            message.type === 'error' ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-[#050a05] border-[#00ff66]/50 text-[#00ff66]'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">EMAIL CADASTRADO</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-3 text-white focus:border-[#00ff66] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[#00ff66] py-3 font-bold text-black uppercase tracking-widest hover:bg-[#00cc52] shadow-[0_0_15px_rgba(0,255,102,0.3)] disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Link'}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link href="/login" className="text-[#8a9a8a] hover:text-white hover:underline transition-colors">Voltar para Login</Link>
        </p>
      </div>
    </div>
  )
}