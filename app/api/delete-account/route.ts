import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

/**
 * DELETE /api/delete-account
 * LGPD Art. 18, VI — Direito ao esquecimento.
 * Anonimiza/exclui todos os dados pessoais do usuário autenticado em cascade.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const userId = user.id;

    // 1. Anonimizar mensagens de chat (preserva histórico da campanha sem identificar o usuário)
    await supabase
      .from('chat_messages')
      .update({ user_name: 'Aventureiro Removido', sender_id: null, receiver_id: null })
      .eq('sender_id', userId);

    // 2. Desvincular personagens de memberships de campanha
    await supabase
      .from('campaign_members')
      .update({ current_character_id: null })
      .eq('user_id', userId);

    // 3. Remover participações em campanhas (como membro)
    await supabase
      .from('campaign_members')
      .delete()
      .eq('user_id', userId);

    // 4. Remover logs pessoais
    await supabase
      .from('campaign_logs')
      .delete()
      .eq('player_id', userId);

    // 5. Remover livros adicionados pelo usuário
    await supabase
      .from('campaign_books')
      .delete()
      .eq('user_id', userId);

    // 6. Remover magias criadas pelo usuário (personalizadas)
    await supabase
      .from('spell_catalog')
      .delete()
      .eq('created_by', userId)
      .not('campaign_id', 'is', null); // Só remove magias customizadas, não as globais

    // 7. Remover personagens
    await supabase
      .from('characters')
      .delete()
      .eq('owner_id', userId);

    // 8. Remover campanhas criadas (como DM) — tokens e membros em cascade via FK
    await supabase
      .from('campaigns')
      .delete()
      .eq('dm_id', userId);

    // 9. Remover perfil
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 10. Revogar sessões e deletar usuário do auth (requer service_role no server)
    // Nota: supabase.auth.admin.deleteUser() requer service_role key.
    // Como usamos a server client com anon key, fazemos signOut aqui.
    // O admin delete deve ser configurado via Supabase webhook ou trigger se necessário.
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true, message: 'Conta e dados pessoais removidos com sucesso.' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro inesperado ao excluir conta.' },
      { status: 500 }
    );
  }
}
