"use client";
import { useState, useRef, useCallback } from 'react';
import {
  updateTokenPosition,
  updateTokenRotation,
  deleteToken as deleteTokenService,
  createToken as createTokenService,
  uploadCampaignAsset,
} from '@/features/mesa/services/mesa-service';

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

interface MesaTokens {
  tokenSelecionado: string | null;
  setTokenSelecionado: (id: string | null) => void;
  isDraggingToken: boolean;
  setIsDraggingToken: (v: boolean) => void;
  dragMovedRef: React.MutableRefObject<boolean>;
  draggingPosRef: React.MutableRefObject<{ x: number; y: number }>;
  lastBroadcastRef: React.MutableRefObject<number>;
  addTokenToMap: (
    t: { name: string; url: string; sizeCategory?: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' },
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => Promise<void>;
  handleTokenUpload: (
    file: File,
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => Promise<void>;
  handleTokenDelete: (
    tokenId: string,
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => Promise<void>;
  handleTokenRotate: (
    tokenId: string,
    step: number,
    tokens: Token[],
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => Promise<void>;
  handleTokenSnap: (
    tokenId: string,
    gridSize: number,
    tokens: Token[],
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => void;
}

export function useMesaTokens(): MesaTokens {
  const [tokenSelecionado, setTokenSelecionado] = useState<string | null>(null);
  const [isDraggingToken, setIsDraggingToken] = useState(false);
  const dragMovedRef = useRef(false);
  const draggingPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastBroadcastRef = useRef(0);

  const addTokenToMap = useCallback(async (
    t: { name: string; url: string; sizeCategory?: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' },
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    const newId = crypto.randomUUID();
    const defaultSize = t.sizeCategory ?? 'Medium';
    const newToken: Token = {
      id: newId, url: t.url, x: 0, y: 0, rotation: 0,
      name: t.name, isMonster: true, sizeCategory: defaultSize,
    };
    setTokens(prev => [...prev, newToken]);
    await createTokenService({
      id: newId,
      campaign_id: campaignId,
      url: t.url,
      name: t.name,
      x: 0,
      y: 0,
      is_monster: true,
      size_category: defaultSize,
    });
    broadcast('token-add', { token: newToken });
  }, []);

  const handleTokenUpload = useCallback(async (
    file: File,
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `tokens/${campaignId}-${Date.now()}.${ext}`;
    let publicUrl: string;
    try {
      publicUrl = await uploadCampaignAsset(fileName, file);
    } catch {
      return;
    }
    await addTokenToMap(
      { name: file.name.replace(/\.[^.]+$/, ''), url: publicUrl },
      campaignId,
      setTokens,
      broadcast,
    );
  }, [addTokenToMap]);

  const handleTokenDelete = useCallback(async (
    tokenId: string,
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
    await deleteTokenService(tokenId, campaignId);
    broadcast('token-delete', { tokenId });
  }, []);

  const handleTokenRotate = useCallback(async (
    tokenId: string,
    step: number,
    tokens: Token[],
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token) return;
    const newRotation = ((token.rotation ?? 0) + step) % 360;
    const normalized = newRotation < 0 ? newRotation + 360 : newRotation;
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, rotation: normalized } : t));
    broadcast('token-rotate', { tokenId, rotation: normalized });
    await updateTokenRotation(tokenId, normalized);
  }, []);

  const handleTokenSnap = useCallback((
    tokenId: string,
    gridSize: number,
    tokens: Token[],
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token) return;
    const snappedX = Math.round(token.x / gridSize) * gridSize;
    const snappedY = Math.round(token.y / gridSize) * gridSize;
    setTokens(prev => prev.map(t =>
      t.id === tokenId ? { ...t, x: snappedX, y: snappedY } : t
    ));
    broadcast('token-move', { tokenId, x: snappedX, y: snappedY });
    updateTokenPosition(tokenId, snappedX, snappedY);
  }, []);

  return {
    tokenSelecionado,
    setTokenSelecionado,
    isDraggingToken,
    setIsDraggingToken,
    dragMovedRef,
    draggingPosRef,
    lastBroadcastRef,
    addTokenToMap,
    handleTokenUpload,
    handleTokenDelete,
    handleTokenRotate,
    handleTokenSnap,
  };
}
