import { createClient } from '@/utils/supabase/client';

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}
