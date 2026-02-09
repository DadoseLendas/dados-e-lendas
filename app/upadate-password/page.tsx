'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    // Atualiza o usuário logado (o link de email já logou ele temporariamente)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#060c06] p-4 text-[#e4e8e1] ${inter.className}`}>
      <div className="w-full max-w-md space-y-6 rounded-xl border border-[#219246]/30 bg-[#060c06]/80 p-8 shadow-2xl">
        <div className="text-center">
          <h1 className={`text-2xl font-bold italic text-[#01fe66] ${playfair.className} mb-2`}>
            NOVA SENHA
          </h1>
          <p className="text-[#80887e] text-sm">Defina sua nova runa de acesso.</p>
        </div>

        {errorMsg && <div className="text-red-400 text-sm text-center">{errorMsg}</div>}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#80887e] mb-1">NOVA SENHA</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-[#003a07] border border-[#219246] p-3 text-[#e4e8e1] focus:border-[#01fe66] focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded bg-[#01fe66] py-3 font-bold text-[#060c06] uppercase tracking-wider hover:bg-[#1cef6f] disabled:opacity-50">
            {loading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}