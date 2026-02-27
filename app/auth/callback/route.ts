import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

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

        // Se não tem perfil, obriga a completar o cadastro
        if (!profile) {
          // Usamos NextRequest para pegar a URL base exata em que o app está rodando agora
          const completeUrl = new URL('/completar-cadastro', request.url)
          return NextResponse.redirect(completeUrl)
        }
      }

      // Redireciona para onde o usuário queria ir ou para a Home
      const redirectUrl = new URL(next, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Fallback em caso de erro crítico no código de autenticação
  const errorUrl = new URL('/login?error=auth-code-error', request.url)
  return NextResponse.redirect(errorUrl)
}