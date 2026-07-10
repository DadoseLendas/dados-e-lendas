import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Garante que o parâmetro ?next= seja sempre um caminho relativo interno.
 * Impede Open Redirect: new URL('https://evil.com', base) => 'https://evil.com'.
 */
function safeRedirectPath(next: string | null): string {
  if (!next) return '/';
  const trimmed = next.trim();
  // Deve começar com '/' mas NÃO com '//' (protocol-relative URL)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return '/';
}

/**
 * Resolve a URL base publica correta mesmo atras do proxy da Vercel.
 * Em producao/preview a Vercel entrega o host publico em x-forwarded-host;
 * usar apenas request.url pode devolver o host interno (ou localhost) errado.
 */
function getBaseUrl(request: Request): string {
  const origin = new URL(request.url).origin
  if (process.env.NODE_ENV === 'development') return origin

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`

  return origin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))
  const baseUrl = getBaseUrl(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (next.startsWith('/auth/update-password')) {
        return NextResponse.redirect(new URL(next, baseUrl))
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, display_name')
          .eq('id', user.id)
          .maybeSingle()

        // Primeiro login com Google (ou perfil incompleto) -> completar cadastro.
        const perfilCompleto = Boolean(profile?.nickname) && Boolean(profile?.display_name)
        if (!perfilCompleto) {
          return NextResponse.redirect(new URL('/completar-cadastro', baseUrl))
        }
      }

      return NextResponse.redirect(new URL(next, baseUrl))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-code-error', baseUrl))
}