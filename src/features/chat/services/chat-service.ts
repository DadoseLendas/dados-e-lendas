import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ChatMessage = {
  id?: string;
  campaign_id: string | number;
  user_name: string;
  text: string;
  is_roll: boolean;
  is_secret: boolean;
  channel: string;
  sender_id: string;
  dice_type?: string;
  roll_mode?: string;
  roll_values?: number[];
  final_value?: number;
  created_at?: string;
  user_avatar?: string;
};

export async function sendChatMessage(message: Record<string, unknown>): Promise<any> {
  const supabase = createClient();
  const { data } = await supabase.from('chat_messages').insert([message]).select('id, campaign_id, user_name, sender_id, receiver_id, text, is_roll, is_secret, channel, created_at, dice_type, roll_values, final_value, roll_mode').single();
  return data ?? null;
}

export async function getChannelMembers(channelName: string) {
  const supabase = createClient();
  return supabase.channel(channelName);
}

export function subscribeToChannel(
  supabaseClient: ReturnType<typeof createClient>,
  channelName: string,
  onMessage: (payload: Record<string, unknown>) => void
) {
  const channel = supabaseClient.channel(channelName);
  channel.on(
    'broadcast',
    { event: 'message' },
    (payload) => onMessage(payload)
  );
  channel.subscribe();
  return channel;
}

export function removeChannel(supabaseClient: ReturnType<typeof createClient>, channel: RealtimeChannel) {
  supabaseClient.removeChannel(channel);
}

export function createPresenceChannel(supabaseClient: ReturnType<typeof createClient>, channelName: string, config?: any) {
  return supabaseClient.channel(channelName, config);
}

export async function fetchCharactersByIds(ids: string[]): Promise<any[]> {
  const supabase = createClient();
  if (ids.length === 0) return [];
  const { data } = await supabase.from('characters').select('id, name').in('id', ids);
  return data ?? [];
}

export async function fetchCharacterNames(ids: string[]): Promise<Record<string, string>> {
  const supabase = createClient();
  if (ids.length === 0) return {};
  const { data } = await supabase.from('characters').select('id, name').in('id', ids);
  return (data ?? []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as Record<string, string>);
}

export async function getProfileDisplayName(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
  return data?.display_name ?? null;
}

export async function getCampaignDmId(campaignId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('campaigns').select('dm_id').eq('id', campaignId).single();
  return data?.dm_id ?? null;
}

export async function getMemberCharacterId(campaignId: string, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_members')
    .select('current_character_id')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.current_character_id ?? null;
}

export async function getCharacterName(characterId: string | number) {
  const supabase = createClient();
  const { data } = await supabase.from('characters').select('name').eq('id', characterId).single();
  return data?.name ?? null;
}

export async function getCampaignMembers(campaignId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('campaign_members')
    .select('user_id, current_character_id')
    .eq('campaign_id', campaignId);
  return data ?? [];
}

export async function getProfilesByIds(ids: string[]) {
  const supabase = createClient();
  if (ids.length === 0) return [];
  const { data } = await supabase.from('profiles').select('id, display_name').in('id', ids);
  return data ?? [];
}

export async function fetchChatMessages(campaignId: string, limit = 150): Promise<any[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('chat_messages')
    .select('id, campaign_id, user_name, sender_id, receiver_id, text, is_roll, is_secret, channel, created_at, dice_type, roll_values, final_value, roll_mode')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export function createRealtimeChannel(campaignId: string) {
  const supabase = createClient();
  return supabase.channel(`chat_room_${campaignId}`);
}

export function subscribeToChatChannel(
  channel: RealtimeChannel,
  onNewMessage: (msg: any) => void,
) {
  channel.on('broadcast', { event: 'new_message' }, (payload) => {
    onNewMessage(payload.payload);
  });
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `campaign_id=eq.${channel.topic?.replace('chat_room_', '') ?? ''}` },
    (payload) => {
      onNewMessage(payload.new);
    }
  );
  channel.subscribe();
  return channel;
}

export async function sendAndBroadcastMessage(
  message: Record<string, unknown>,
  channel: RealtimeChannel
): Promise<any> {
  const supabase = createClient();
  const { data } = await supabase.from('chat_messages').insert([message]).select('id, campaign_id, user_name, sender_id, receiver_id, text, is_roll, is_secret, channel, created_at, dice_type, roll_values, final_value, roll_mode').single();
  if (data) {
    channel.send({ type: 'broadcast', event: 'new_message', payload: data });
  }
  return data ?? null;
}
