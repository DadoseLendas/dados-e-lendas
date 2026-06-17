import { createClient } from '@/utils/supabase/client';
import { getCurrentUser } from '@/shared/services/auth-service';

export async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function fetchCharacters(): Promise<any[]> {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase.from('characters').select('*').eq('owner_id', user.id);
  if (error || !data) return [];
  return data;
}

export async function fetchCharacterById(id: string | number): Promise<any> {
  const supabase = createClient();
  const { data, error } = await supabase.from('characters').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

function extractMissingColumn(message?: string) {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/);
  return match?.[1] ?? null;
}

export async function upsertCharacter(char: Record<string, unknown>) {
  const supabase = createClient();
  const user = await getCurrentUser();

  const payload: Record<string, unknown> = {
    ...char,
    is_linked: char.is_linked ?? false,
    owner_id: user?.id,
  };

  let saveError: { message?: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from('characters').upsert(payload);
    if (!error) { saveError = null; break; }
    const missingColumn = extractMissingColumn(error.message);
    if (missingColumn && missingColumn in payload) {
      delete payload[missingColumn];
      saveError = error;
      continue;
    }
    saveError = error;
    break;
  }

  if (saveError) throw new Error(saveError.message ?? 'Erro desconhecido');
}

export async function createCharacter(newChar: Record<string, unknown>) {
  const supabase = createClient();
  const user = await getCurrentUser();

  const insertPayload: Record<string, unknown> = { ...newChar, owner_id: user?.id };
  let data: any = null;
  let createError: { message?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await supabase.from('characters').insert([insertPayload]).select('*').single();
    if (!result.error) { data = result.data; createError = null; break; }
    const missingColumn = extractMissingColumn(result.error.message);
    if (missingColumn && missingColumn in insertPayload) {
      delete insertPayload[missingColumn];
      createError = result.error;
      continue;
    }
    createError = result.error;
    break;
  }

  if (createError) throw new Error(createError.message ?? 'Erro desconhecido');
  return data;
}

export async function deleteCharacter(id: string | number) {
  const supabase = createClient();
  // T-04: confirma a posse antes de apagar (previne IDOR; RLS é a camada definitiva)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  await supabase.from('campaign_members').update({ current_character_id: null }).eq('current_character_id', id);
  await supabase.from('campaign_logs').delete().eq('character_id', id);
  const { error } = await supabase.from('characters').delete().eq('id', id).eq('owner_id', user.id);
  if (error) throw new Error(error.message);
}

export async function updateCharacterField(id: string | number, fields: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('characters').update(fields).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveCharacterWithRetry(draft: Record<string, unknown>) {
  const supabase = createClient();
  const payload: Record<string, unknown> = { ...draft };
  let saved: any = null;
  let saveError: Error | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('characters')
      .update(payload)
      .eq('id', draft.id)
      .select('*')
      .single();
    if (!error && data) { saved = data; saveError = null; break; }
    if (error) {
      const col = extractMissingColumn(error.message);
      if (col && col in payload) { delete payload[col]; saveError = error; continue; }
      saveError = error; break;
    }
  }

  if (saveError) throw new Error(saveError.message ?? 'Erro ao salvar');
  return saved;
}

export async function updateCharacterFraming(id: string | number, imgOffsetX: number, imgOffsetY: number) {
  const supabase = createClient();
  await supabase.from('characters').update({ imgOffsetX, imgOffsetY }).eq('id', id);
}

export async function getCharacterAndCatalog(characterId: string | number, campaignId?: string | number | null) {
  const supabase = createClient();

  const { data: charData, error: charError } = await supabase
    .from('characters')
    .select('id, name, level, classLevels, spellSlots, preparedSpells, lastLongRest, spells')
    .eq('id', characterId)
    .single();

  let catalogQuery = supabase
    .from('spell_catalog')
    .select('id, nome, nivel_magia, escola, tempo_conjuracao, alcance, campaign_id, created_by, visibility, source')
    .order('nivel_magia', { ascending: true })
    .order('nome', { ascending: true });

  if (campaignId != null) {
    catalogQuery = catalogQuery.or(`campaign_id.is.null,campaign_id.eq.${String(campaignId)}`);
  } else {
    catalogQuery = catalogQuery.is('campaign_id', null);
  }

  const { data: catalogData, error: catalogError } = await catalogQuery;

  return {
    character: (!charError && charData) ? charData as { id: number | string; name: string; level: number; classLevels: unknown | null; spellSlots: unknown | null; preparedSpells: unknown | null; lastLongRest: string | null; spells: unknown[] | null } : null,
    catalog: (!catalogError && catalogData) ? catalogData : [],
  };
}

export async function saveCharacterSpells(characterId: string | number, spells: unknown[]) {
  const supabase = createClient();
  const { error } = await supabase.from('characters').update({ spells }).eq('id', characterId);
  if (error) throw new Error(`Erro ao salvar magias: ${error.message}`);
}
