import { createClient } from '@/utils/supabase/client';
import type { ActiveEffect } from '@/features/mesa/utils/character-effects';
import { mesclarEfeitos } from '@/features/mesa/utils/character-effects';

export async function updateTokenRotation(id: string | number, rotation: number) {
  const supabase = createClient();
  await supabase.from('campaign_tokens').update({ rotation }).eq('id', id);
}

export async function deleteToken(id: string | number, campaignId: string) {
  const supabase = createClient();
  await supabase.from('campaign_tokens').delete().eq('id', id).eq('campaign_id', campaignId);
}

export async function updateTokenPosition(id: string | number, x: number, y: number) {
  const supabase = createClient();
  await supabase.from('campaign_tokens').update({ x, y }).eq('id', id);
}

export async function createToken(data: Record<string, unknown>) {
  const supabase = createClient();
  const { data: result, error } = await supabase.from('campaign_tokens').insert(data).select('*').single();
  if (error) throw new Error(error.message);
  return result;
}

export async function uploadCampaignAsset(fileName: string, file: File) {
  const supabase = createClient();
  const { error } = await supabase.storage.from('campaign-assets').upload(fileName, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('campaign-assets').getPublicUrl(fileName);
  return publicUrl;
}

export async function updateCampaign(id: string | number, fields: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from('campaigns').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getPublicAssetUrl(fileName: string) {
  const supabase = createClient();
  const { data: { publicUrl } } = supabase.storage.from('campaign-assets').getPublicUrl(fileName);
  return publicUrl;
}

export async function createPresenceChannel(channelName: string, config?: any) {
  const supabase = createClient();
  return supabase.channel(channelName, config);
}

export async function fetchCampaignMember(campaignId: string | number, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_members')
    .select('current_character_id')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function fetchCampaignMembers(campaignId: string | number) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_members')
    .select('user_id, current_character_id')
    .eq('campaign_id', campaignId);
  return data ?? [];
}

export async function fetchProfilesByIds(ids: string[]) {
  const supabase = createClient();
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids);
  return data ?? [];
}

export async function fetchCharactersByIds(ids: (string | number)[]) {
  const supabase = createClient();
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('characters')
    .select('id, name, img')
    .in('id', ids);
  return data ?? [];
}

export async function fetchCampaignDmId(campaignId: string | number) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('dm_id')
    .eq('id', campaignId)
    .single();
  return (data as { dm_id?: string } | null)?.dm_id ?? null;
}

export async function fetchCampaignSettings(campaignId: string | number) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('dm_id, map_url, map_grid_px, map_scale, map_grid_color, map_grid_opacity, map_grid_thickness, map_grid_dashed, map_grid_dash_frequency, map_grid_dimension')
    .eq('id', campaignId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function checkCampaignOwnership(campaignId: string | number, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('dm_id', userId)
    .maybeSingle();
  return !!data;
}

export async function fetchTokensByCampaignId(campaignId: string | number) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_tokens')
    .select('id, url, name, x, y, rotation, character_id, is_monster, size_category, hit_points, hp_current')
    .eq('campaign_id', campaignId);
  return data ?? [];
}

export async function fetchTokenSheet(tokenId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('campaign_tokens')
    .select('name, size_category, type, alignment, armor_class, hit_points, speed, abilities, saving_throws, damage_resistances, condition_immunities, senses, languages, challenge_rating, xp, abilities_text, actions_text')
    .eq('id', tokenId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function updateToken(id: string | number, fields: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from('campaign_tokens').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchPlayerCharacterIds(campaignId: string | number) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_members')
    .select('current_character_id')
    .eq('campaign_id', campaignId)
    .not('current_character_id', 'is', null);
  return ((data ?? []) as Array<{ current_character_id: string | number }>).map(m => m.current_character_id).filter(Boolean);
}

export async function fetchCharactersByIdsWithOffset(ids: (string | number)[]) {
  const supabase = createClient();
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('characters')
    .select('id, name, img, imgOffsetX, imgOffsetY')
    .in('id', ids);
  return data ?? [];
}

// --- Item 7a: aplicação de efeito de magia no PV (dano/cura), autoritativa ---
// Lê o PV atual no banco e aplica o delta (cura = delta positivo, dano = negativo).
// Nunca abaixo de 0; nunca acima do máximo. Não remove o token ao zerar.

export async function applyHpDeltaToCharacter(characterId: string | number, delta: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('characters')
    .select('hp_current, hp_max')
    .eq('id', characterId)
    .single();
  if (error || !data) return null;
  const max = (data as { hp_max?: number; hp_current?: number }).hp_max ?? (data as { hp_current?: number }).hp_current ?? 0;
  const current = (data as { hp_current?: number }).hp_current ?? max;
  const next = Math.max(0, max ? Math.min(max, current + delta) : current + delta);
  const { error: upErr } = await supabase.from('characters').update({ hp_current: next }).eq('id', characterId);
  if (upErr) throw new Error(upErr.message);
  return next;
}

export async function applyHpDeltaToMonsterToken(tokenId: string | number, delta: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('campaign_tokens')
    .select('hit_points, hp_current')
    .eq('id', tokenId)
    .single();
  if (error || !data) return null;
  const max = (data as { hit_points?: number; hp_current?: number }).hit_points ?? (data as { hp_current?: number }).hp_current ?? 0;
  const current = (data as { hp_current?: number; hit_points?: number }).hp_current ?? (data as { hit_points?: number }).hit_points ?? 0;
  const next = Math.max(0, max ? Math.min(max, current + delta) : current + delta);
  const { error: upErr } = await supabase.from('campaign_tokens').update({ hp_current: next }).eq('id', tokenId);
  if (upErr) throw new Error(upErr.message);
  return next;
}

// --- Item 7b: efeitos ativos (condições/benefícios/restrições) na ficha/token ---

export async function addEffectsToCharacter(characterId: string | number, novos: ActiveEffect[]) {
  if (novos.length === 0) return;
  const supabase = createClient();
  const { data } = await supabase.from('characters').select('active_effects').eq('id', characterId).single();
  const atuais = ((data as { active_effects?: ActiveEffect[] } | null)?.active_effects) ?? [];
  const { error } = await supabase.from('characters').update({ active_effects: mesclarEfeitos(atuais, novos) }).eq('id', characterId);
  if (error) throw new Error(error.message);
}

export async function setCharacterEffects(characterId: string | number, effects: ActiveEffect[]) {
  const supabase = createClient();
  const { error } = await supabase.from('characters').update({ active_effects: effects }).eq('id', characterId);
  if (error) throw new Error(error.message);
}

export async function addEffectsToMonsterToken(tokenId: string | number, novos: ActiveEffect[]) {
  if (novos.length === 0) return;
  const supabase = createClient();
  const { data } = await supabase.from('campaign_tokens').select('active_effects').eq('id', tokenId).single();
  const atuais = ((data as { active_effects?: ActiveEffect[] } | null)?.active_effects) ?? [];
  const { error } = await supabase.from('campaign_tokens').update({ active_effects: mesclarEfeitos(atuais, novos) }).eq('id', tokenId);
  if (error) throw new Error(error.message);
}