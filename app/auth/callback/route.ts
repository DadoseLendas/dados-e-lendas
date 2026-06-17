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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (next.startsWith('/auth/update-password')) {
        return NextResponse.redirect(new URL(next, request.url))
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          return NextResponse.redirect(new URL('/completar-cadastro', request.url))
        }
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-code-error', request.url))
}