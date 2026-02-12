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

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center bg-[#050a05] p-4 text-white ${inter.className}`}>
      <div className="w-full max-w-md space-y-6 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="text-center">
          <h1 className={`text-2xl font-bold italic text-[#00ff66] ${playfair.className} mb-2`}>
            NOVA SENHA
          </h1>
          <p className="text-[#8a9a8a] text-sm">Defina sua nova runa de acesso.</p>
        </div>

        {errorMsg && <div className="text-red-400 text-sm text-center">{errorMsg}</div>}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-[#4a5a4a] uppercase tracking-[0.2em] mb-2 ml-1">NOVA SENHA</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-[#050a05] border border-[#1a2a1a] p-3 text-white focus:border-[#00ff66] focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded bg-[#00ff66] py-3 font-bold text-black uppercase tracking-widest hover:bg-[#00cc52] shadow-[0_0_15px_rgba(0,255,102,0.3)] disabled:opacity-50">
            {loading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}