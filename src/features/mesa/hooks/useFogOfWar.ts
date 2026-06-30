// src/features/mesa/hooks/useFogOfWar.ts
import { useState, useEffect, useCallback } from 'react';

export interface FowConfig {
  enabled: boolean;
  opacity: number;
  color: string;
  style: 'black' | 'gray' | 'desaturated_blur';
  gray_opacity: number;
  desaturated_blur_radius: number;
}

export function useFogOfWar(
  broadcast: (event: string, payload: Record<string, unknown>) => void,
  campaignId: string
) {
  const [fowConfig, setFowConfig] = useState<FowConfig>({
    enabled: true,
    opacity: 0.7,
    color: '#000000',
    style: 'black',
    gray_opacity: 0.6,
    desaturated_blur_radius: 15
  });
  const [hiddenCells, setHiddenCells] = useState<Set<string>>(new Set());
  const [fogTool, setFogTool] = useState<'brush' | 'erase'>('brush');
  const [brushSize, setBrushSize] = useState(1);
  const [lastCell, setLastCell] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      const saved = localStorage.getItem(`fog_${campaignId}`);
      if (saved) {
        try {
          const cells = JSON.parse(saved);
          const newSet = new Set<string>();
          cells.forEach((cell: { x: number; y: number }) => {
            newSet.add(`${cell.x},${cell.y}`);
          });
          setHiddenCells(newSet);
        } catch (e) {
          console.error('Erro ao carregar névoa:', e);
        }
      }
    }
    setIsLoading(false);
  }, [campaignId]);

  useEffect(() => {
    if (campaignId && !isLoading) {
      const cells = Array.from(hiddenCells).map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      localStorage.setItem(`fog_${campaignId}`, JSON.stringify(cells));
    }
  }, [hiddenCells, campaignId, isLoading]);

  const applyFogAtCell = useCallback((x: number, y: number) => {
    const r = Math.max(1, brushSize) - 1; // brushSize=1 → single cell, 2 → 3x3, etc.
    const keys: string[] = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        keys.push(`${x + dx},${y + dy}`);
      }
    }

    setHiddenCells(prev => {
      const next = new Set(prev);
      if (fogTool === 'brush') {
        keys.forEach(k => next.add(k));
      } else {
        keys.forEach(k => next.delete(k));
      }

      broadcast('fog:update', {
        cells: Array.from(next).map(k => {
          const [cx, cy] = k.split(',').map(Number);
          return { x: cx, y: cy };
        }),
        tool: fogTool
      });

      return next;
    });
  }, [fogTool, brushSize, broadcast]);

  const resetLastCell = useCallback(() => {
    setLastCell(null);
  }, []);

  const revealAll = useCallback(() => {
    setHiddenCells(new Set());
    localStorage.removeItem(`fog_${campaignId}`);
    broadcast('fog:revealAll', {});
  }, [broadcast, campaignId]);

  const applyRemoteFogUpdate = useCallback((payload: Record<string, unknown>) => {
    const cells = payload.cells as { x: number; y: number }[];
    const tool = payload.tool as 'brush' | 'erase';
    
    setHiddenCells(prev => {
      const next = new Set(prev);
      cells.forEach(cell => {
        const key = `${cell.x},${cell.y}`;
        if (tool === 'brush') {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  }, []);

  const applyRemoteFogConfig = useCallback((payload: Record<string, unknown>) => {
    if (payload.enabled !== undefined) {
      setFowConfig(prev => ({ ...prev, enabled: payload.enabled as boolean }));
    }
    if (payload.opacity !== undefined) {
      setFowConfig(prev => ({ ...prev, opacity: payload.opacity as number }));
    }
    if (payload.style !== undefined) {
      setFowConfig(prev => ({ ...prev, style: payload.style as 'black' | 'gray' | 'desaturated_blur' }));
    }
    if (payload.gray_opacity !== undefined) {
      setFowConfig(prev => ({ ...prev, gray_opacity: payload.gray_opacity as number }));
    }
    if (payload.desaturated_blur_radius !== undefined) {
      setFowConfig(prev => ({ ...prev, desaturated_blur_radius: payload.desaturated_blur_radius as number }));
    }
  }, []);

  return {
    fowConfig,
    setFowConfig,
    hiddenCells,
    fogTool,
    setFogTool,
    brushSize,
    setBrushSize,
    applyFogAtCell,
    resetLastCell,
    revealAll,
    applyRemoteFogUpdate,
    applyRemoteFogConfig,
    isLoading,
  };
}