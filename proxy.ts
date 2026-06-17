import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 1. Tenta recuperar o usuário.
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Controle de Acesso (Rotas Públicas e Privadas)
  const pathname = request.nextUrl.pathname

  // Adicionei para garantir que o fluxo do seu route.ts funcione
  const rotasPublicas = [
    '/', 
    '/cadastro', 
    '/login', 
    '/termos', 
    '/privacidade', 
    '/agradecimentos', 
    '/contato',
    '/completar-cadastro' 
  ]
  
  //pathname.startsWith('/auth') para liberar o /auth/callback
  const isPublicRoute = rotasPublicas.includes(pathname) || 
                        pathname.startsWith('/novidades') || 
                        pathname.startsWith('/auth')

  // 3. A Regra principal de Redirecionamento:
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/cadastro'
    return NextResponse.redirect(url)
  }

  // 4. Se o usuário JÁ está logado e tenta acessar rotas de autenticação (cadastro/login)
  // Mandamos ele direto para as campanhas.
  if (user && (pathname === '/cadastro' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/campanhas'
    return NextResponse.redirect(url)
  }
  
  // Libera a requisição se passou pelas checagens
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e imagens para não rodar a verificação neles
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}