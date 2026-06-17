"use client";
import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/shared/services/auth-service';
import {
  fetchCampaignSettings,
  checkCampaignOwnership,
  fetchCampaignMember,
  fetchTokensByCampaignId,
  fetchPlayerCharacterIds,
  fetchCharactersByIdsWithOffset,
} from '@/features/mesa/services/mesa-service';

interface CampaignSettings {
  dm_id?: string;
  map_url?: string;
  map_grid_px?: number;
  map_scale?: number;
  map_grid_color?: string;
  map_grid_opacity?: number;
  map_grid_thickness?: number;
  map_grid_dashed?: boolean;
  map_grid_dash_frequency?: number;
  map_grid_dimension?: string;
}

interface MesaSession {
  currentUserId: string | null;
  currentUserName: string;
  isDM: boolean;
  campaignLoaded: boolean;
  fichaCharacterId: number | string | null;
  campaignSettings: CampaignSettings | null;
  setFichaCharacterId: (id: number | string | null) => void;
  setCampaignSettings: (settings: CampaignSettings | null) => void;
  loadPlayerCharacters: () => Promise<any[]>;
}

export function useMesaSession(
  campaignId: string,
  onTokensLoaded?: (tokens: any[]) => void,
): MesaSession {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Aventureiro');
  const [isDM, setIsDM] = useState(false);
  const [campaignLoaded, setCampaignLoaded] = useState(false);
  const [fichaCharacterId, setFichaCharacterId] = useState<number | string | null>(null);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings | null>(null);

  // useCallback evita recriação da função a cada render (previne loop infinito)
  const loadPlayerCharacters = useCallback(async () => {
    const charIds = await fetchPlayerCharacterIds(campaignId);
    if (charIds.length === 0) return [];
    const charsData = await fetchCharactersByIdsWithOffset(charIds);
    return charsData ? charsData.map((c: any) => ({
      ...c,
      imgOffsetX: c.imgOffsetX ?? 50,
      imgOffsetY: c.imgOffsetY ?? 50,
    })) : [];
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let active = true;

    const load = async () => {
      const user = await getCurrentUser();
      if (!user || !active) return;

      setCurrentUserId(user.id);
      setCurrentUserName(
        user.user_metadata?.name || user.email?.split('@')[0] || 'Aventureiro'
      );

      const settings = await fetchCampaignSettings(campaignId).catch(() => null);
      if (!active) return;
      setCampaignSettings(settings as CampaignSettings | null);

      let userIsDM = settings?.dm_id === user.id;
      if (!userIsDM) {
        userIsDM = await checkCampaignOwnership(campaignId, user.id);
      }
      if (!active) return;
      setIsDM(userIsDM);

      if (!userIsDM) {
        const member = await fetchCampaignMember(campaignId, user.id);
        if (member?.current_character_id && active) {
          setFichaCharacterId(member.current_character_id);
        }
      }

      const dbTokens: any[] = await fetchTokensByCampaignId(campaignId);
      if (!active) return;

      if (dbTokens.length > 0) {
        const tokenCharIds = dbTokens
          .filter((t: any) => t.character_id)
          .map((t: any) => t.character_id);
        const charMap: Record<number, { name: string; img: string; imgOffsetX: number; imgOffsetY: number }> = {};
        if (tokenCharIds.length > 0) {
          const chars: any[] = await fetchCharactersByIdsWithOffset(tokenCharIds);
          chars.forEach((c: any) => {
            charMap[c.id] = {
              name: c.name,
              img: c.img || '',
              imgOffsetX: c.imgOffsetX ?? 50,
              imgOffsetY: c.imgOffsetY ?? 50,
            };
          });
        }

        const enrichedTokens = dbTokens.map((t: any) => {
          const charData = t.character_id ? charMap[t.character_id] : null;
          return {
            id: t.id,
            url: charData ? charData.img : t.url || '',
            x: t.x,
            y: t.y,
            rotation: t.rotation ?? 0,
            characterId: t.character_id ?? null,
            name: charData?.name ?? t.name,
            imgOffsetX: charData?.imgOffsetX ?? 50,
            imgOffsetY: charData?.imgOffsetY ?? 50,
            isMonster: t.is_monster ?? false,
            sizeCategory: t.size_category ?? 'Medium',
          };
        });

        if (active) onTokensLoaded?.(enrichedTokens);
      } else {
        if (active) onTokensLoaded?.([]);
      }

      if (active) setCampaignLoaded(true);
    };

    load();
    return () => { active = false; };
  }, [campaignId]);

  return {
    currentUserId,
    currentUserName,
    isDM,
    campaignLoaded,
    fichaCharacterId,
    campaignSettings,
    setFichaCharacterId,
    setCampaignSettings,
    loadPlayerCharacters,
  };
}