import { createClient } from '@/utils/supabase/client';

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function fetchCampaignsByUserId(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .or(`dm_id.eq.${userId},id.in.(select campaign_id from campaign_members where user_id.eq.${userId})`);
  return data ?? [];
}

export async function fetchCampaignById(id: string) {
  const supabase = createClient();
  const { data } = await supabase.from('campaigns').select('*').eq('id', id).single();
  return data;
}

export async function createCampaign(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaigns').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCampaign(id: string | number) {
  const supabase = createClient();
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(filePath: string, file: File) {
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return publicUrl;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function updateUserPassword(password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export function onAuthStateChange(callback: (session: any) => void) {
  const supabase = createClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return subscription;
}

export async function fetchOwnedCampaigns(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaigns').select('*').eq('dm_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMemberCampaignIds(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaign_members').select('campaign_id').eq('user_id', userId);
  if (error) {
    console.warn('Não foi possível ler campaign_members.', error.message);
    return [];
  }
  return ((data ?? []) as Array<{ campaign_id: string | number }>).map(row => row.campaign_id);
}

export async function fetchCampaignsByIds(ids: (string | number)[]) {
  const supabase = createClient();
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('campaigns').select('*').in('id', ids);
  if (error) {
    console.warn('Não foi possível carregar campanhas por membership.', error.message);
    return [];
  }
  return data ?? [];
}

export async function insertCampaign(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaigns').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function insertCampaignMember(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from('campaign_members').insert(payload);
  if (error) {
    console.warn('Não foi possível adicionar membro:', error.message);
  }
}

export async function findCampaignByCode(code: string) {
  const supabase = createClient();
  // Usa RPC SECURITY DEFINER: resolve apenas o código exato, sem depender
  // de SELECT aberto em campaigns (que vazaria os códigos de todas as campanhas).
  const { data, error } = await supabase.rpc('find_campaign_by_code', { p_code: code.trim() });
  if (error) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

export async function findExistingMember(campaignId: string | number, userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('campaign_members').select('id').eq('campaign_id', campaignId).eq('user_id', userId).maybeSingle();
  return data;
}

export async function fetchUserCharacters(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('characters').select('id, name').eq('owner_id', userId);
  return data ?? [];
}

export async function joinCampaignViaCharacter(campaignId: string | number, userId: string, characterId: string | number) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaign_members').insert({
    campaign_id: campaignId,
    user_id: userId,
    current_character_id: characterId,
  }).select('*, campaigns(name, image_url, code)').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function leaveCampaign(campaignId: string | number, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('campaign_members').delete().eq('campaign_id', campaignId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function unlinkCharacterFromCampaign(campaignId: string | number, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('campaign_members').update({ current_character_id: null }).eq('campaign_id', campaignId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function getCampaignMemberData(campaignId: string | number, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaign_members').select('*').eq('campaign_id', campaignId).eq('user_id', userId).maybeSingle();
  if (error) return null;
  return data;
}

export async function updateCampaignFields(id: string | number, fields: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaigns').update(fields).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}