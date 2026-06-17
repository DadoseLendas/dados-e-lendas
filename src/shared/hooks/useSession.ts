"use client";

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

/**
 * Hook de sessão — retorna o usuário autenticado via getUser() (valida JWT no servidor).
 */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data: { user: u } }) => {
        if (active) setUser(u);
      })
      .catch((err) => {
        console.error('[useSession] Falha ao carregar usuário:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { user, loading, userId: user?.id ?? null };
}