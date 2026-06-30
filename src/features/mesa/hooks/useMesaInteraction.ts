"use client";
import { useCallback, useEffect, useRef } from 'react';
import { Token, UserRuler } from '@/features/mesa/types';

interface UseMesaInteractionParams {
  currentUserId: string | null;
  currentUserName: string;
  isDM: boolean;
  fichaCharacterId: number | string | null;

  // rulers
  rulers: Map<string, UserRuler>;
  isDraggingRulerRef: React.MutableRefObject<boolean>;
  updateMyRuler: (
    userId: string, userName: string,
    updates: Partial<UserRuler>,
    broadcast: (event: string, payload: any) => void,
  ) => void;

  // tokens
  tokenSelecionado: string | null;
  setTokenSelecionado: (id: string | null) => void;
  isDraggingToken: boolean;
  setIsDraggingToken: (v: boolean) => void;
  dragMovedRef: React.MutableRefObject<boolean>;
  draggingPosRef: React.MutableRefObject<{ x: number; y: number }>;
  lastBroadcastRef: React.MutableRefObject<number>;

  // map
  isDraggingMap: boolean;
  setIsDraggingMap: (v: boolean) => void;
  zoom: number;
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  gridSize: number;
  getLocalPointFromMouse: (
    clientX: number, clientY: number, container: HTMLDivElement | null,
  ) => { x: number; y: number } | null;

  // tokens ref + setters
  tokensRef: React.MutableRefObject<Token[]>;
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>;

  // token actions
  handleTokenSnap: (
    tokenId: string, gridSize: number,
    tokens: Token[], setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => void;
  handleTokenRotate: (
    tokenId: string, step: number,
    tokens: Token[], setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => Promise<void>;
  handleTokenDelete: (
    tokenId: string,
    campaignId: string,
    setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
    broadcast: (event: string, payload: any) => void,
  ) => Promise<void>;

  // realtime
  realtimeChannelRef: React.MutableRefObject<any>;
  broadcast: (event: string, payload: any) => void;

  // ficha modals
  setShowFicha: (v: boolean) => void;
  setShowFichaDM: (v: boolean) => void;
  setFichaCharacterIdDM: (id: number | string | null) => void;

  // keyboard
  campaignId: string;
  mapContentRef: React.RefObject<HTMLDivElement | null>;
}

interface UseMesaInteractionReturn {
  handleMouseDown: (e: React.MouseEvent, tokenId?: string) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
}

export function useMesaInteraction(params: UseMesaInteractionParams): UseMesaInteractionReturn {
  const {
    currentUserId, currentUserName, isDM, fichaCharacterId,
    rulers, isDraggingRulerRef, updateMyRuler,
    tokenSelecionado, setTokenSelecionado, isDraggingToken, setIsDraggingToken,
    dragMovedRef, draggingPosRef, lastBroadcastRef,
    isDraggingMap, setIsDraggingMap, zoom, setOffset, gridSize, getLocalPointFromMouse,
    tokensRef, setTokens,
    handleTokenSnap, handleTokenRotate, handleTokenDelete,
    realtimeChannelRef, broadcast,
    setShowFicha, setShowFichaDM, setFichaCharacterIdDM,
    campaignId, mapContentRef,
  } = params;

  const handleMouseDown = useCallback((e: React.MouseEvent, tokenId?: string) => {
    const myRuler = rulers.get(currentUserId || '');

    // Se régua estiver ativa, ela tem prioridade — não mova tokens
    if (myRuler?.showRuler && !myRuler.rulerLocked && e.button === 0) {
      const point = getLocalPointFromMouse(e.clientX, e.clientY, mapContentRef.current);
      if (!point) return;
      isDraggingRulerRef.current = true;
      updateMyRuler(currentUserId!, currentUserName, {
        rulerStart: point, rulerEnd: point, rulerLocked: false, isRulerDragging: true,
      }, broadcast);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (tokenId) {
      setTokenSelecionado(tokenId);
      setIsDraggingToken(true);
      dragMovedRef.current = false;
      const token = tokensRef.current.find(t => t.id === tokenId);
      if (token) draggingPosRef.current = { x: token.x, y: token.y };
      e.stopPropagation();
    } else if (e.button === 1) {
      setIsDraggingMap(true);
      e.preventDefault();
    }
  }, [currentUserId, currentUserName, rulers, isDraggingRulerRef, updateMyRuler,
      tokenSelecionado, setTokenSelecionado, setIsDraggingToken, dragMovedRef,
      draggingPosRef, tokensRef, getLocalPointFromMouse, mapContentRef,
      setIsDraggingMap, broadcast]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const myRuler = rulers.get(currentUserId || '');

    if (isDraggingMap) {
      setOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (isDraggingToken && tokenSelecionado) {
      dragMovedRef.current = true;
      draggingPosRef.current.x += e.movementX / zoom;
      draggingPosRef.current.y += e.movementY / zoom;
      const { x, y } = draggingPosRef.current;
      setTokens(prev => prev.map(t => t.id === tokenSelecionado ? { ...t, x, y } : t));
      const now = Date.now();
      if (now - lastBroadcastRef.current > 33 && realtimeChannelRef.current) {
        lastBroadcastRef.current = now;
        realtimeChannelRef.current.send({
          type: 'broadcast', event: 'token-move',
          payload: { tokenId: tokenSelecionado, x, y },
        });
      }
    } else if (myRuler?.showRuler && myRuler.rulerStart && myRuler.isRulerDragging && !myRuler.rulerLocked && isDraggingRulerRef.current) {
      const point = getLocalPointFromMouse(e.clientX, e.clientY, mapContentRef.current);
      if (point) updateMyRuler(currentUserId!, currentUserName, { rulerEnd: point }, broadcast);
    }
  }, [currentUserId, currentUserName, rulers, isDraggingMap, isDraggingToken,
      tokenSelecionado, dragMovedRef, draggingPosRef, lastBroadcastRef, zoom,
      setOffset, setTokens, realtimeChannelRef, broadcast, getLocalPointFromMouse,
      mapContentRef, isDraggingRulerRef, updateMyRuler]);

  const handleMouseUp = useCallback(() => {
    const myRuler = rulers.get(currentUserId || '');

    if (isDraggingToken && tokenSelecionado) {
      if (!dragMovedRef.current) {
        const token = tokensRef.current.find(t => t.id === tokenSelecionado);
        if (token?.characterId) {
          if (isDM) { setFichaCharacterIdDM(token.characterId); setShowFichaDM(true); }
          else if (String(token.characterId) === String(fichaCharacterId)) setShowFicha(true);
        }
      } else {
        const snappedX = Math.round(draggingPosRef.current.x / gridSize) * gridSize;
        const snappedY = Math.round(draggingPosRef.current.y / gridSize) * gridSize;
        const capturedId = tokenSelecionado;
        setTokens(prev => prev.map(t => t.id === capturedId ? { ...t, x: snappedX, y: snappedY } : t));
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast', event: 'token-move',
            payload: { tokenId: capturedId, x: snappedX, y: snappedY },
          });
        }
        handleTokenSnap(capturedId, gridSize, tokensRef.current, setTokens, broadcast);
      }
    }

    if (myRuler?.isRulerDragging && myRuler.rulerStart) {
      updateMyRuler(currentUserId!, currentUserName, { rulerLocked: true, isRulerDragging: false }, broadcast);
      isDraggingRulerRef.current = false;
    }

    setIsDraggingMap(false);
    setIsDraggingToken(false);
  }, [currentUserId, currentUserName, rulers, isDraggingToken, tokenSelecionado,
      dragMovedRef, tokensRef, isDM, fichaCharacterId, setFichaCharacterIdDM,
      setShowFichaDM, setShowFicha, draggingPosRef, gridSize, setTokens,
      realtimeChannelRef, handleTokenSnap, broadcast, updateMyRuler,
      isDraggingRulerRef, setIsDraggingMap, setIsDraggingToken]);

  // keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (isTypingField || !tokenSelecionado) return;
      const id = tokenSelecionado;
      const token = tokensRef.current.find(t => t.id === id);
      if (!token) return;

      if (e.key.toLowerCase() === 'q' || e.key.toLowerCase() === 'e') {
        if (!token.isMonster) return;
        e.preventDefault();
        handleTokenRotate(id, e.key.toLowerCase() === 'q' ? -15 : 15, tokensRef.current, setTokens, broadcast);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleTokenDelete(id, campaignId, setTokens, broadcast);
        setTokenSelecionado(null);
        return;
      }

      let dx = 0, dy = 0;
      switch (e.key.toLowerCase()) {
        case 'w': dy = -gridSize; break;
        case 's': dy = gridSize; break;
        case 'a': dx = -gridSize; break;
        case 'd': dx = gridSize; break;
        default: return;
      }
      setTokens(prev => prev.map(t => t.id === id ? { ...t, x: token.x + dx, y: token.y + dy } : t));
      broadcast('token-move', { tokenId: id, x: token.x + dx, y: token.y + dy });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenSelecionado, campaignId]);

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}
