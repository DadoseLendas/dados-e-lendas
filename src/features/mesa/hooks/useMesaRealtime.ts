"use client";
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Token {
  id: string;
  url: string;
  x: number;
  y: number;
  rotation?: number;
  name?: string;
  characterId?: number | null;
  imgOffsetX?: number;
  imgOffsetY?: number;
  isMonster?: boolean;
  hp?: number;
  maxHp?: number;
  sizeCategory?: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
}

interface UserRuler {
  userId: string;
  userName: string;
  showRuler: boolean;
  rulerStart: { x: number; y: number } | null;
  rulerEnd: { x: number; y: number } | null;
  rulerLocked: boolean;
  isRulerDragging: boolean;
  color: string;
}

function normalizeRotation(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

interface RealtimeCallbacks {
  onTokenMove: (payload: { tokenId: string; x: number; y: number; rotation?: number }) => void;
  onTokenRotate: (payload: { tokenId: string; rotation: number }) => void;
  onTokenDelete: (payload: { tokenId: string }) => void;
  onTokenAdd: (payload: { token: Token }) => void;
  onMapChange: (payload: Record<string, unknown>) => void;
  onRulerChange: (ruler: UserRuler, currentUserId: string | null) => void;
  onTokenInsert: (row: Record<string, unknown>) => void;
  onTokenDeletePostgres: (row: Record<string, unknown>) => void;
  onMembersChange: () => void;
}

interface MesaRealtime {
  realtimeChannelRef: React.MutableRefObject<ReturnType<ReturnType<typeof createClient>['channel']> | null>;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
}

export function useMesaRealtime(
  campaignId: string,
  currentUserId: string | null,
  callbacks: RealtimeCallbacks
): MesaRealtime {
  const supabase = useMemo(() => createClient(), []);
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    realtimeChannelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    const cb = () => callbacksRef.current;

    const channel = supabase
      .channel(`mesa-${campaignId}`)
      .on('broadcast', { event: 'token-move' }, ({ payload }) => {
        cb().onTokenMove(payload as any);
      })
      .on('broadcast', { event: 'token-rotate' }, ({ payload }) => {
        cb().onTokenRotate(payload as any);
      })
      .on('broadcast', { event: 'token-delete' }, ({ payload }) => {
        cb().onTokenDelete(payload as any);
      })
      .on('broadcast', { event: 'token-add' }, ({ payload }) => {
        cb().onTokenAdd(payload as any);
      })
      .on('broadcast', { event: 'map-change' }, ({ payload }) => {
        cb().onMapChange(payload as any);
      })
      .on('broadcast', { event: 'ruler-change' }, ({ payload }) => {
        cb().onRulerChange(payload as UserRuler, currentUserIdRef.current);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campaign_tokens', filter: `campaign_id=eq.${campaignId}` },
        ({ new: row }) => {
          cb().onTokenInsert(row as any);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'campaign_tokens', filter: `campaign_id=eq.${campaignId}` },
        ({ old: row }) => {
          cb().onTokenDeletePostgres(row as any);
        }
      )
      .subscribe();
    realtimeChannelRef.current = channel;

    const membersChannel = supabase
      .channel(`mesa-members-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_members', filter: `campaign_id=eq.${campaignId}` },
        () => {
          cb().onMembersChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(membersChannel);
      realtimeChannelRef.current = null;
    };
  }, [campaignId, supabase]);

  return { realtimeChannelRef, broadcast };
}
