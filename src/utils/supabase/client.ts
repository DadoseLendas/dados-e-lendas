import { createBrowserClient } from '@supabase/ssr'

export const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

function createNoopClient(): any {
  const emptyAuthResponse = Promise.resolve({ data: { user: null, session: null }, error: null });

  const noopQuery = {
    select() { return this; },
    order() { return this; },
    eq() { return this; },
    neq() { return this; },
    gt() { return this; },
    gte() { return this; },
    lt() { return this; },
    lte() { return this; },
    like() { return this; },
    ilike() { return this; },
    in() { return this; },
    contains() { return this; },
    or() { return this; },
    is() { return this; },
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
  };

  return {
    auth: {
      getUser: () => emptyAuthResponse,
      getSession: () => emptyAuthResponse,
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase não configurado no ambiente local.' } }),
      signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: { message: 'Supabase não configurado no ambiente local.' } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase não configurado no ambiente local.' } }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => noopQuery,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
      unsubscribe() { return this; },
      send: async () => ({ error: null }),
    }),
    rpc: async () => ({ data: null, error: null }),
  };
}

export function createClient() {
  if (!hasSupabaseConfig) {
    return createNoopClient();
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}