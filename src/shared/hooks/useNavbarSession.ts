"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ProfileRow {
  avatar_url: string | null;
  display_name: string | null;
  nickname: string | null;
}

export function useNavbarSession() {
  const supabase = useMemo(() => createClient(), []);

  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // getUser() valida o JWT contra o servidor (seguro)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsUserLoggedIn(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, display_name, nickname')
          .eq('id', user.id)
          .single();
        const row = profile as ProfileRow | null;
        if (row) {
          setDisplayName(row.display_name || row.nickname || 'Aventureiro');
          setAvatarUrl(row.avatar_url || null);
        } else {
          setDisplayName('Aventureiro');
          setAvatarUrl(null);
        }
      } else {
        setIsUserLoggedIn(false);
      }
    } catch (error) {
      console.error('[useNavbarSession] Falha ao carregar sessão:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isUserLoggedIn, avatarUrl, displayName, isLoading, refresh };
}