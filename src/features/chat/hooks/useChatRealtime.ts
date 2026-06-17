'use client';

import { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Message } from '@/features/chat/types';
import {
  fetchChatMessages,
  createRealtimeChannel,
} from '@/features/chat/services/chat-service';

export function useChatRealtime(campaignId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    const initChat = async () => {
      const msgs = await fetchChatMessages(campaignId);
      setMessages(msgs);

      const chatSub = createRealtimeChannel(campaignId);
      channelRef.current = chatSub;

      chatSub.on('broadcast', { event: 'new_message' }, (payload) => {
        const newMsg = payload.payload as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      });
      chatSub.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      );
      chatSub.subscribe();
    };

    initChat();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [campaignId]);

  return { messages, setMessages, channelRef };
}
