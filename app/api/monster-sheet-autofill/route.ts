import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildEmptyMonsterSheet, extractMonsterSheetFromPdf } from '@/utils/monster-sheet-parser';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const campaignId = body?.campaignId as string | undefined;
    const tokenName = body?.tokenName as string | undefined;

    console.log('[monster-sheet-autofill] request received:', { campaignId, tokenName, hasBody: Boolean(body) });

    if (!campaignId || !tokenName?.trim()) {
      console.log('[monster-sheet-autofill] invalid request payload');
      return NextResponse.json({ error: 'campaignId e tokenName são obrigatórios' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log('[monster-sheet-autofill] auth user:', user?.id ?? null);

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('dm_id, name')
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      console.log('[monster-sheet-autofill] campaign lookup failed:', campaignError?.message ?? null);
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    if ((campaign as any).dm_id !== user.id) {
      console.log('[monster-sheet-autofill] forbidden for user:', user.id, 'dm:', (campaign as any).dm_id);
      return NextResponse.json({ error: 'Apenas o mestre pode usar o auto-preenchimento' }, { status: 403 });
    }

    const { data: books, error: booksError } = await supabase
      .from('campaign_books')
      .select('id, title, pdf_url')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (booksError) {
      console.log('[monster-sheet-autofill] books lookup failed:', booksError.message);
      return NextResponse.json({ error: booksError.message }, { status: 500 });
    }

    if (!books?.length) {
      console.log('[monster-sheet-autofill] no campaign books found');
      return NextResponse.json({ error: 'Nenhum livro encontrado na biblioteca da campanha' }, { status: 404 });
    }

    const tokenSheetFallback = buildEmptyMonsterSheet(tokenName.trim());
    let lastError: string | null = null;

    for (const book of books) {
      try {
        console.log('[monster-sheet-autofill] trying book:', book.title, book.pdf_url);
        const parsedSheet = await extractMonsterSheetFromPdf(book.pdf_url, tokenName.trim());

        if (parsedSheet) {
          console.log('[monster-sheet-autofill] parsed sheet found in book:', book.title);
          return NextResponse.json({
            ok: true,
            sourceBook: {
              id: book.id,
              title: book.title,
            },
            sheet: {
              ...tokenSheetFallback,
              ...parsedSheet,
            },
          });
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Falha ao ler o PDF';
        console.log('[monster-sheet-autofill] book failed:', book.title, lastError);
      }
    }

    console.log('[monster-sheet-autofill] no match found, lastError:', lastError);

    return NextResponse.json(
      { error: lastError ?? 'Não foi possível encontrar uma ficha correspondente' },
      { status: 404 },
    );
  } catch (error) {
    console.error('[monster-sheet-autofill] erro inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado no auto-preenchimento' },
      { status: 500 },
    );
  }
}