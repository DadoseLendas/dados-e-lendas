'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface WeatherConfig {
  enabled: boolean;
  type: 'rain' | 'snow' | 'sand' | 'fog';
  intensity: number;   // 0..1 — densidade de partículas
  windSpeed: number;   // -1..1 — direção/força do vento
}

const DEFAULT_CONFIG: WeatherConfig = {
  enabled: false,
  type: 'rain',
  intensity: 0.5,
  windSpeed: 0,
};

// Salvar no Supabase com debounce de 500ms para não disparar update a cada drag de slider
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function useWeather(
  broadcast: (event: string, payload: Record<string, unknown>) => void,
  campaignId: string,
) {
  const supabase = createClient();

  const [weatherConfig, setWeatherConfigState] = useState<WeatherConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  // ── Carregar clima salvo ao entrar na mesa ───────────────────────────────────
  useEffect(() => {
    if (!campaignId) return;

    async function load() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('campaign_weather')
          .select('config')
          .eq('campaign_id', campaignId)
          .maybeSingle();

        if (error) throw error;

        if (data?.config) {
          setWeatherConfigState({ ...DEFAULT_CONFIG, ...(data.config as Partial<WeatherConfig>) });
        }
      } catch (e) {
        console.error('[Weather] Erro ao carregar clima:', e);
      } finally {
        loadedRef.current = true;
        setIsLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // ── Persistir config (debounced) ─────────────────────────────────────────────
  const persistConfig = useCallback((config: WeatherConfig) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await supabase
          .from('campaign_weather')
          .upsert(
            { campaign_id: campaignId, config },
            { onConflict: 'campaign_id' },
          );
      } catch (e) {
        console.error('[Weather] Erro ao salvar clima:', e);
      }
    }, 500);
  }, [campaignId, supabase]);

  // ── setWeatherConfig: atualiza estado + persiste + broadcast (só o mestre chama) ──
  const setWeatherConfig = useCallback((config: WeatherConfig) => {
    setWeatherConfigState(config);
    persistConfig(config);
    broadcast('weather-config', { config });
  }, [persistConfig, broadcast]);

  // ── Receber config remota (jogadores recebem do mestre) ──────────────────────
  const applyRemoteWeatherConfig = useCallback((payload: Record<string, unknown>) => {
    if (payload.config) {
      setWeatherConfigState({ ...DEFAULT_CONFIG, ...(payload.config as Partial<WeatherConfig>) });
    }
  }, []);

  return {
    weatherConfig,
    setWeatherConfig,
    applyRemoteWeatherConfig,
    isLoading,
  };
}