import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildEmptyMonsterSheet, extractMonsterSheetFromPdf } from '@/features/monsters/utils/monster-sheet-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const campaignId = body?.campaignId as string | undefined;
    const tokenName = body?.tokenName as string | undefined;

    if (!campaignId || !tokenName?.trim()) {
      return NextResponse.json({ error: 'campaignId e tokenName são obrigatórios' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('dm_id, name')
      .eq('id', campaignId)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    if ((campaign as any).dm_id !== user.id) {
      return NextResponse.json({ error: 'Apenas o mestre pode usar o auto-preenchimento' }, { status: 403 });
    }

    const { data: books } = await supabase
      .from('campaign_books')
      .select('id, title, pdf_url')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (!books?.length) {
      return NextResponse.json({ error: 'Nenhum livro encontrado na biblioteca da campanha' }, { status: 404 });
    }

    const tokenSheetFallback = buildEmptyMonsterSheet(tokenName.trim());
    let lastError: string | null = null;


    // T-15: Validar que pdf_url é HTTPS antes de fetch server-side (SSRF)
    const isAllowedPdfUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        const h = parsed.hostname;
        if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(h)) return false;
        return true;
      } catch { return false; }
    };

    for (const book of books) {
      if (!isAllowedPdfUrl(book.pdf_url)) continue;
      try {
        const parsedSheet = await extractMonsterSheetFromPdf(book.pdf_url, tokenName.trim());
        if (parsedSheet) {
          return NextResponse.json({
            ok: true,
            sourceBook: { id: book.id, title: book.title },
            sheet: { ...tokenSheetFallback, ...parsedSheet },
          });
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Falha ao ler o PDF';
      }
    }

    return NextResponse.json(
      { error: lastError ?? 'Não foi possível encontrar uma ficha correspondente' },
      { status: 404 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado' },
      { status: 500 },
    );
  }
}
