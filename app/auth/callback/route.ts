import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Helper para garantir a URL correta na Vercel
  const getURL = () => {
    let url = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    url = url.includes('http') ? url : `https://${url}`;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Buscamos o perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          return NextResponse.redirect(`${getURL()}/completar-cadastro`)
        }
      }

      return NextResponse.redirect(`${getURL()}${next}`)
    }
  }

  // Fallback em caso de erro crítico no código de autenticação
  return NextResponse.redirect(`${getURL()}/login?error=auth-code-error`)
}