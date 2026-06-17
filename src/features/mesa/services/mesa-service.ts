import { createClient } from '@/utils/supabase/client';

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
    .select('id, url, name, x, y, rotation, character_id, is_monster, size_category')
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