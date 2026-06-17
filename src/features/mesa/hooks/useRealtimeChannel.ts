"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

type ChannelConfig = {
  channelName: string;
  onBroadcast?: Record<string, (payload: any) => void>;
  onPresence?: Record<string, (payload: any) => void>;
  onPostgresChanges?: Array<{
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    table: string;
    filter?: string;
    handler: (payload: any) => void;
  }>;
};

export function useRealtimeChannel(config: ChannelConfig, deps: unknown[]) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(config.channelName);

    if (config.onBroadcast) {
      for (const [event, handler] of Object.entries(config.onBroadcast)) {
        channel.on('broadcast', { event }, handler);
      }
    }

    if (config.onPresence) {
      for (const [event, handler] of Object.entries(config.onPresence)) {
        channel.on('presence', { event } as any, handler);
      }
    }

    if (config.onPostgresChanges) {
      for (const pg of config.onPostgresChanges) {
        channel.on(
          'postgres_changes',
          { event: pg.event, schema: 'public', table: pg.table, filter: pg.filter },
          pg.handler
        );
      }
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return channelRef;
}
