import { createClient } from '@/utils/supabase/client';

export async function fetchUserBooks(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_books')
    .select('*, campaigns(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function fetchCampaignBooks(campaignId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_books')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createCampaignBook(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('campaign_books').insert([payload]).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCampaignBook(id: string | number) {
  const supabase = createClient();
  const { error } = await supabase.from('campaign_books').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
