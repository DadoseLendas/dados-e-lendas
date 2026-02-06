import { NextResponse } from 'next/server'
// Importamos do NOSSO utilitário agora
import { createClient } from '@/utils/supabase/server' 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // se houver 'next' na URL, usamos para redirecionamento, senão dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient() // Cliente Servidor
    
    // Troca o código pela sessão
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Verifica o perfil APÓS trocar o código
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // Se não tem perfil, força ir para completar cadastro
        if (!profile) {
          return NextResponse.redirect(`${origin}/completar-cadastro`)
        }
      }

      // Se tem perfil ou deu tudo certo, vai para o destino
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se deu erro no código, volta pro login com erro
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}