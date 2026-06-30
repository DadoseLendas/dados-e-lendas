'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface FowConfig {
  enabled: boolean;
  opacity: number;
  color: string;
  style: 'black' | 'gray' | 'desaturated_blur';
  gray_opacity: number;
  desaturated_blur_radius: number;
}

const DEFAULT_CONFIG: FowConfig = {
  enabled: true,
  opacity: 0.7,
  color: '#000000',
  style: 'black',
  gray_opacity: 0.6,
  desaturated_blur_radius: 15,
};

// Serializa Set<"x,y"> → array de {x,y} para o banco
function cellsToArray(cells: Set<string>): { x: number; y: number }[] {
  return Array.from(cells).map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
}

// Deserializa rows do banco → Set<"x,y">
function arrayToCells(rows: { x: number; y: number }[]): Set<string> {
  const s = new Set<string>();
  rows.forEach(r => s.add(`${r.x},${r.y}`));
  return s;
}

// Salvar no Supabase com debounce de 800ms para não sobrecarregar durante pintura
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function useFogOfWar(
  broadcast: (event: string, payload: Record<string, unknown>) => void,
  campaignId: string,
) {
  const supabase = createClient();

  const [fowConfig, setFowConfigState] = useState<FowConfig>(DEFAULT_CONFIG);
  const [hiddenCells, setHiddenCells] = useState<Set<string>>(new Set());
  const [fogTool, setFogTool] = useState<'brush' | 'erase'>('brush');
  const [brushSize, setBrushSize] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pendingCells = useRef<Set<string>>(new Set());

  // ── Carregar névoa salva ao entrar na mesa ──────────────────────────────────
  useEffect(() => {
    if (!campaignId) return;

    async function load() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('campaign_fog')
          .select('cells, config')
          .eq('campaign_id', campaignId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          if (data.cells) setHiddenCells(arrayToCells(data.cells));
          if (data.config) setFowConfigState(data.config as FowConfig);
        }
      } catch (e) {
        console.error('[FoW] Erro ao carregar névoa:', e);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // ── Persistir células no Supabase (debounced 800ms) ─────────────────────────
  const persistCells = useCallback((cells: Set<string>) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await supabase
          .from('campaign_fog')
          .upsert(
            { campaign_id: campaignId, cells: cellsToArray(cells) },
            { onConflict: 'campaign_id' },
          );
      } catch (e) {
        console.error('[FoW] Erro ao salvar névoa:', e);
      }
    }, 800);
  }, [campaignId, supabase]);

  // ── Persistir config ─────────────────────────────────────────────────────────
  const persistConfig = useCallback(async (config: FowConfig) => {
    try {
      await supabase
        .from('campaign_fog')
        .upsert(
          { campaign_id: campaignId, config },
          { onConflict: 'campaign_id' },
        );
    } catch (e) {
      console.error('[FoW] Erro ao salvar config:', e);
    }
  }, [campaignId, supabase]);

  // ── setFowConfig: atualiza estado + persiste + broadcast ────────────────────
  const setFowConfig = useCallback((config: FowConfig) => {
    setFowConfigState(config);
    persistConfig(config);
    broadcast('fog-config', { config });
  }, [persistConfig, broadcast]);

  // ── Pintar névoa ─────────────────────────────────────────────────────────────
  const applyFogAtCell = useCallback((x: number, y: number) => {
    const r = Math.max(1, brushSize) - 1;
    const keys: string[] = [];
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        keys.push(`${x + dx},${y + dy}`);

    setHiddenCells(prev => {
      const next = new Set(prev);
      if (fogTool === 'brush') keys.forEach(k => next.add(k));
      else keys.forEach(k => next.delete(k));

      // Broadcast delta (só as células afetadas, não o estado completo)
      broadcast('fog:update', { action: fogTool, keys });

      persistCells(next);
      return next;
    });
  }, [fogTool, brushSize, broadcast, persistCells]);

  const resetLastCell = useCallback(() => {}, []);

  // ── Revelar tudo ─────────────────────────────────────────────────────────────
  const revealAll = useCallback(async () => {
    setHiddenCells(new Set());
    broadcast('fog:revealAll', {});
    try {
      await supabase
        .from('campaign_fog')
        .upsert(
          { campaign_id: campaignId, cells: [] },
          { onConflict: 'campaign_id' },
        );
    } catch (e) {
      console.error('[FoW] Erro ao revelar tudo:', e);
    }
  }, [broadcast, campaignId, supabase]);

  // ── Receber update remoto (delta) ─────────────────────────────────────────────
  const applyRemoteFogUpdate = useCallback((payload: Record<string, unknown>) => {
    // Suporta dois formatos:
    // 1. Novo: { action: 'brush'|'erase', keys: string[] }
    // 2. Legado: { cells: {x,y}[], tool: 'brush'|'erase' }
    if (payload.action !== undefined && payload.keys !== undefined) {
      const action = payload.action as 'brush' | 'erase';
      const keys = payload.keys as string[];
      setHiddenCells(prev => {
        const next = new Set(prev);
        if (action === 'brush') keys.forEach(k => next.add(k));
        else keys.forEach(k => next.delete(k));
        return next;
      });
    } else if (payload.cells !== undefined) {
      // legado: estado completo enviado
      const cells = payload.cells as { x: number; y: number }[];
      const tool = payload.tool as 'brush' | 'erase' | undefined;
      setHiddenCells(prev => {
        const next = new Set(prev);
        if (tool === 'erase') {
          cells.forEach(c => next.delete(`${c.x},${c.y}`));
        } else {
          cells.forEach(c => next.add(`${c.x},${c.y}`));
        }
        return next;
      });
    }
  }, []);

  const applyRemoteFogConfig = useCallback((payload: Record<string, unknown>) => {
    if (payload.config) {
      setFowConfigState(payload.config as FowConfig);
    } else {
      // legado campo-a-campo
      setFowConfigState(prev => ({ ...prev, ...(payload as Partial<FowConfig>) }));
    }
  }, []);

  // ── Receber fog:revealAll remoto ──────────────────────────────────────────────
  const applyRemoteFogRevealAll = useCallback(() => {
    setHiddenCells(new Set());
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
    applyRemoteFogRevealAll,
    isLoading,
  };
}