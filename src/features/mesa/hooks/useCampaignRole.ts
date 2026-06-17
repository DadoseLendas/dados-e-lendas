"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/shared/hooks/useSession';
import { fetchCampaignSettings, checkCampaignOwnership, fetchCampaignMember } from '@/features/mesa/services/mesa-service';

export function useCampaignRole(campaignId: string | number | null) {
  const { user, userId } = useSession();
  const [isDM, setIsDM] = useState(false);
  const [characterId, setCharacterId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!campaignId || !userId) return;
    let active = true;

    const load = async () => {
      const settings = await fetchCampaignSettings(campaignId).catch(() => null);
      if (!active) return;
      setCampaign(settings);

      let userIsDM = settings?.dm_id === userId;
      if (!userIsDM) {
        userIsDM = await checkCampaignOwnership(campaignId, userId);
      }
      if (!active) return;
      setIsDM(userIsDM);

      if (!userIsDM) {
        const member = await fetchCampaignMember(campaignId, userId);
        if (member?.current_character_id && active) {
          setCharacterId(member.current_character_id);
        }
      }

      setLoading(false);
    };

    load();
    return () => { active = false; };
  }, [campaignId, userId]);

  return { isDM, characterId, loading, campaign, user };
}
