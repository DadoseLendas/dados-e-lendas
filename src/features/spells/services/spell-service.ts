import { createClient } from '@/utils/supabase/client';

export async function getProfileDisplayName(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
  return data?.display_name ?? null;
}

export async function sendSpellRollMessage(
  campaignId: string | number | null,
  userName: string,
  text: string,
  senderId: string | null,
  extras?: Record<string, unknown>
) {
  const supabase = createClient();
  await supabase.from('chat_messages').insert({
    campaign_id: campaignId,
    user_name: userName,
    text,
    is_roll: true,
    is_secret: false,
    channel: 'campanha',
    sender_id: senderId,
    ...extras,
  });
}

export async function getCharacterSpells(characterId: string | number) {
  const supabase = createClient();
  const { data } = await supabase.from('characters').select('id, name, level, spells').eq('id', characterId).single();
  return data;
}

export async function insertSpellIntoCatalog(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from('spell_catalog').insert(payload);
  if (error) throw new Error(error.message);
}

export async function updateCharacterSpells(characterId: string | number, spells: any[]) {
  const supabase = createClient();
  const { error } = await supabase.from('characters').update({ spells }).eq('id', characterId);
  if (error) throw new Error(error.message);
}

const SPELL_CATALOG_SELECT = "id, slug, nome, escola, nivel_magia, tempo_conjuracao, alcance, componentes, duracao, material, descricao, escala_por_nivel, dano, area, formato, efeito, rolagem, tipo_alvo, salvacao, eh_concentracao, requisitos_rituais, classes_disponivel, categoria_magia, efeito_principal, beneficio_concedido, restricao_concedida, transforma_em, movimento_concedido, protecao_concedida, condicoes_aplicadas, palavras_chave, cd_salvacao, tipo_dano, tipo_ataque, campaign_id, num_projeteis, upgrade_dano, upgrade_projeteis, upgrade_alvos";

const CACHE_TTL = 5 * 60 * 1000;
const catalogCache = new Map<string, { data: Record<string, unknown>[]; timestamp: number }>();

export function invalidateSpellCatalogCache() {
  catalogCache.clear();
}

export async function fetchSpellCatalog(campaignId?: string | number | null) {
  const cacheKey = String(campaignId ?? "__global__");
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const supabase = createClient();
  const query = supabase
    .from("spell_catalog")
    .select(SPELL_CATALOG_SELECT)
    .order("nivel_magia", { ascending: true })
    .order("nome", { ascending: true });

  const scoped = campaignId != null
    ? query.or(`campaign_id.is.null,campaign_id.eq.${String(campaignId)}`)
    : query.is("campaign_id", null);

  const { data, error } = await scoped;
  if (error) throw new Error(error.message);
  const result = data as Record<string, unknown>[];
  catalogCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

export async function updateTokenHP(tokenId: string, deltaPV: number, currentPV: number, maxPV: number, currentData: Record<string, unknown>) {
  const supabase = createClient();
  const nextPV = Math.max(0, Math.min(maxPV || 0, currentPV + deltaPV));
  await supabase
    .from("campaign_tokens")
    .update({ data: JSON.stringify({ ...currentData, pvAtuais: nextPV, pvMax: maxPV }) })
    .eq("id", tokenId);
  return nextPV;
}

export async function fetchCharacterSaveData(characterId: number | string) {
  const supabase = createClient();
  const { data: char } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .maybeSingle();
  return char || null;
}

export async function fetchTokenSaveData(tokenId: string) {
  const supabase = createClient();
  const { data: tok } = await supabase
    .from('campaign_tokens')
    .select('name, saving_throws')
    .eq('id', tokenId)
    .maybeSingle();
  return tok || null;
}

export async function sendSpellChannelCast(
  campaignId: string,
  spell: unknown,
  resultados: unknown[],
  animacao: unknown,
) {
  const supabase = createClient();
  await supabase
    .channel(`spell-effects-${campaignId}`)
    .send({
      type: "broadcast" as const,
      event: "spell-cast",
      payload: { spell, resultados, animacao, timestamp: Date.now() },
    });
}
