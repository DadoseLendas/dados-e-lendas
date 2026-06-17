"use client";
import { useState, useCallback, useMemo, useRef } from 'react';

const USER_COLORS = [
  '#00ff66', '#ff4444', '#4488ff', '#ffaa44',
  '#ff44ff', '#44ffaa', '#ffff44', '#aa44ff',
];

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

interface MesaRuler {
  rulers: Map<string, UserRuler>;
  visibleRulers: { userId: string; ruler: UserRuler }[];
  isDraggingRulerRef: React.MutableRefObject<boolean>;
  getRulerDistance: (ruler: UserRuler, gridSize: number, gridDistanceInfo: { value: number; unit: string }) => {
    pixelDistance: number;
    squares: number;
    baseDistance: number;
    meters: number;
    feet: number;
  } | null;
  initUserRuler: (userId: string, userName: string) => void;
  updateMyRuler: (userId: string, userName: string, updates: Partial<UserRuler>, broadcast: (event: string, payload: any) => void) => void;
  clearMyRuler: (userId: string, userName: string, broadcast: (event: string, payload: any) => void) => void;
  toggleMyRuler: (userId: string, userName: string, rulers: Map<string, UserRuler>, broadcast: (event: string, payload: any) => void) => void;
  clearUserRuler: (targetUserId: string, isDM: boolean, broadcast: (event: string, payload: any) => void) => void;
  setRulers: React.Dispatch<React.SetStateAction<Map<string, UserRuler>>>;
}

export function useMesaRuler(): MesaRuler {
  const [rulers, setRulers] = useState<Map<string, UserRuler>>(new Map());
  const [userColorMap, setUserColorMap] = useState<Map<string, string>>(new Map());
  const isDraggingRulerRef = useRef(false);

  const getUserColor = useCallback((userId: string): string => {
    let color: string;
    setUserColorMap(prev => {
      if (prev.has(userId)) return prev;
      const index = prev.size % USER_COLORS.length;
      const newColor = USER_COLORS[index];
      const next = new Map(prev);
      next.set(userId, newColor);
      color = newColor;
      return next;
    });
    if (userColorMap.has(userId)) return userColorMap.get(userId)!;
    const index = Array.from(userColorMap.keys()).length % USER_COLORS.length;
    return USER_COLORS[index];
  }, [userColorMap]);

  const visibleRulers = useMemo(() => {
    const result: { userId: string; ruler: UserRuler }[] = [];
    rulers.forEach((ruler, userId) => {
      if (ruler.showRuler && ruler.rulerStart && ruler.rulerEnd) {
        result.push({ userId, ruler });
      }
    });
    return result;
  }, [rulers]);

  const initUserRuler = useCallback((userId: string, userName: string) => {
    setRulers(prev => {
      if (prev.has(userId)) return prev;
      const next = new Map(prev);
      const index = next.size % USER_COLORS.length;
      next.set(userId, {
        userId,
        userName,
        showRuler: false,
        rulerStart: null,
        rulerEnd: null,
        rulerLocked: false,
        isRulerDragging: false,
        color: USER_COLORS[index],
      });
      return next;
    });
  }, []);

  const updateMyRuler = useCallback((
    userId: string,
    userName: string,
    updates: Partial<UserRuler>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    setRulers(prev => {
      const next = new Map(prev);
      const current = next.get(userId);
      if (!current) {
        const index = next.size % USER_COLORS.length;
        const updated = {
          userId,
          userName,
          showRuler: false,
          rulerStart: null,
          rulerEnd: null,
          rulerLocked: false,
          isRulerDragging: false,
          color: USER_COLORS[index],
          ...updates,
        } as UserRuler;
        next.set(userId, updated);
        broadcast('ruler-change', updated);
        return next;
      }
      const updated = { ...current, ...updates };
      next.set(userId, updated);
      broadcast('ruler-change', updated);
      return next;
    });
  }, []);

  const clearMyRuler = useCallback((
    userId: string,
    userName: string,
    broadcast: (event: string, payload: any) => void,
  ) => {
    updateMyRuler(userId, userName, {
      showRuler: false,
      rulerStart: null,
      rulerEnd: null,
      rulerLocked: false,
      isRulerDragging: false,
    }, broadcast);
  }, [updateMyRuler]);

  const toggleMyRuler = useCallback((
    userId: string,
    userName: string,
    currentRulers: Map<string, UserRuler>,
    broadcast: (event: string, payload: any) => void,
  ) => {
    const current = currentRulers.get(userId);
    if (current?.showRuler) {
      clearMyRuler(userId, userName, broadcast);
    } else {
      updateMyRuler(userId, userName, { showRuler: true }, broadcast);
    }
  }, [clearMyRuler, updateMyRuler]);

  const clearUserRuler = useCallback((
    targetUserId: string,
    isDM: boolean,
    broadcast: (event: string, payload: any) => void,
  ) => {
    if (!isDM) return;
    setRulers(prev => {
      const next = new Map(prev);
      const userRuler = next.get(targetUserId);
      if (!userRuler) return prev;
      const cleared = {
        ...userRuler,
        showRuler: false,
        rulerStart: null,
        rulerEnd: null,
        rulerLocked: false,
        isRulerDragging: false,
      };
      next.set(targetUserId, cleared);
      broadcast('ruler-change', cleared);
      return next;
    });
  }, []);

  const getRulerDistance = useCallback((
    ruler: UserRuler,
    gridSize: number,
    gridDistanceInfo: { value: number; unit: string },
  ) => {
    if (!ruler.rulerStart || !ruler.rulerEnd) return null;
    const dx = ruler.rulerEnd.x - ruler.rulerStart.x;
    const dy = ruler.rulerEnd.y - ruler.rulerStart.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    const squares = pixelDistance / gridSize;
    const baseDistance = squares * gridDistanceInfo.value;
    const meters = gridDistanceInfo.unit === 'm' ? baseDistance : baseDistance * 0.3048;
    const feet = gridDistanceInfo.unit === 'm' ? baseDistance * 3.28084 : baseDistance;
    return { pixelDistance, squares, baseDistance, meters, feet };
  }, []);

  return {
    rulers,
    visibleRulers,
    isDraggingRulerRef,
    getRulerDistance,
    initUserRuler,
    updateMyRuler,
    clearMyRuler,
    toggleMyRuler,
    clearUserRuler,
    setRulers,
  };
}
