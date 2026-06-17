import { createClient } from '@/utils/supabase/client';

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function uploadAvatar(filePath: string, file: File) {
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return publicUrl;
}

export async function fetchProfile(userId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateProfile(userId: string, fields: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw new Error(error.message);
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
