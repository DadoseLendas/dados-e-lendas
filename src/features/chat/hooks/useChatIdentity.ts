'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { PlayerInfo } from '@/features/chat/types';
import {
  getProfileDisplayName,
  getCampaignDmId,
  getMemberCharacterId,
  getCharacterName,
  getCampaignMembers,
  getProfilesByIds,
  fetchCharactersByIds,
} from '@/features/chat/services/chat-service';

export function useChatIdentity(campaignId: string, currentUser: User | null) {
  const [displayName, setDisplayName] = useState('Aventureiro');
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [isDM, setIsDM] = useState(false);
  const [dmId, setDmId] = useState<string | null>(null);
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerInfo>>({});

  useEffect(() => {
    if (!campaignId || campaignId === '00000000-0000-0000-0000-000000000000') return;

    const init = async () => {
      const user = currentUser;
      if (!user) return;

      const name = await getProfileDisplayName(user.id);
      setDisplayName(
        name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Aventureiro'
      );

      const dmId = await getCampaignDmId(campaignId);
      const userIsDM = dmId === user.id;
      setIsDM(userIsDM);
      setDmId(dmId);

      const memberCharId = await getMemberCharacterId(campaignId, user.id);
      if (memberCharId) {
        const charName = await getCharacterName(memberCharId);
        setCharacterName(charName);
      }

      const members = await getCampaignMembers(campaignId);

      if (members.length > 0) {
        const userIds = members.map((m: any) => m.user_id);
        const charIds = members.map((m: any) => m.current_character_id).filter(Boolean);

        const profilesList = await getProfilesByIds(userIds);
        const charactersList = charIds.length > 0 ? await fetchCharactersByIds(charIds) : [];

        const map: Record<string, PlayerInfo> = {};
        members.forEach((m: any) => {
          const prof = profilesList?.find((p: any) => p.id === m.user_id);
          const char = charactersList?.find((c: any) => c.id === m.current_character_id);
          map[m.user_id] = {
            userId: m.user_id,
            displayName: prof?.display_name || 'Aventureiro',
            characterName: char?.name ?? null,
          };
        });

        if (dmId) {
          const dmProfile = await getProfileDisplayName(dmId);
          map[dmId] = {
            userId: dmId,
            displayName: dmProfile || 'Mestre',
            characterName: null,
          };
        }

        setPlayerMap(map);
      }
    };

    init();
  }, [campaignId]);

  return { displayName, characterName, isDM, dmId, playerMap };
}
