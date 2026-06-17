"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { updateToken, fetchTokenSheet } from '@/features/mesa/services/mesa-service';
import { parseMonsterSheetFromClipboardText } from '@/features/monsters/utils/monster-sheet-parser';
import TokenSheetPanel, { TokenSheet } from '@/features/monsters/components/token-sheet-panel';
import {
  buildEmptySheet, normalizeTokenSheet,
  toNumberOrNull, toLeadingNumberOrNull, toList, fromList, EMPTY_ABILITIES,
} from '@/features/mesa/utils/constants';

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

interface UseTokenSheetProps {
  tokens: Token[];
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>;
  campaignId: string;
  selectedToken: Token | null;
  isDM: boolean;
}

interface UseTokenSheetReturn {
  showTokenSheet: boolean;
  tokenSheet: TokenSheet;
  tokenSheetLoading: boolean;
  tokenSheetSaving: boolean;
  tokenSheetAutoFillLoading: boolean;
  tokenSheetAutoFillSource: string | null;
  tokenSheetAutoFillError: string | null;
  tokenLabel: string | undefined;
  openTokenSheet: (tokenId: string) => void;
  handleTokenSheetChange: (nextSheet: TokenSheet) => void;
  handleSaveTokenSheet: () => Promise<boolean>;
  handleAutoFillTokenSheet: () => Promise<boolean>;
  handleAutoFillTokenSheetFromText: (rawText: string) => Promise<boolean>;
  closeTokenSheet: () => void;
}

export interface TokenSheetInstance {
  tokenId: string;
  loading: boolean;
  saving: boolean;
  autoFillLoading: boolean;
  autoFillSource: string | null;
  autoFillError: string | null;
  tokenLabel: string | undefined;
  sheet: TokenSheet;
}

export function useTokenSheet({ tokens, setTokens, campaignId, selectedToken, isDM }: UseTokenSheetProps): UseTokenSheetReturn {
  const [showTokenSheet, setShowTokenSheetInner] = useState(false);
  const [tokenSheetTokenId, setTokenSheetTokenId] = useState<string | null>(null);
  const [tokenSheetLoading, setTokenSheetLoading] = useState(false);
  const [tokenSheetSaving, setTokenSheetSaving] = useState(false);
  const [tokenSheetAutoFillLoading, setTokenSheetAutoFillLoading] = useState(false);
  const [tokenSheetAutoFillSource, setTokenSheetAutoFillSource] = useState<string | null>(null);
  const [tokenSheetAutoFillError, setTokenSheetAutoFillError] = useState<string | null>(null);
  const [tokenSheet, setTokenSheet] = useState<TokenSheet>(buildEmptySheet());
  const tokenSheetRef = useRef<TokenSheet>(buildEmptySheet());

  useEffect(() => {
    tokenSheetRef.current = tokenSheet;
  }, [tokenSheet]);

  const showTokenSheetState = showTokenSheet;
  const setShowTokenSheet = setShowTokenSheetInner;

  const openTokenSheet = useCallback((tokenId: string) => {
    const token = tokens.find((item) => item.id === tokenId) ?? null;
    setTokenSheetTokenId(tokenId);
    setTokenSheet(
      normalizeTokenSheet({
        ...buildEmptySheet(token?.name ?? selectedToken?.name ?? ""),
        size_category: token?.sizeCategory ?? selectedToken?.sizeCategory ?? "",
      })
    );
    tokenSheetRef.current = normalizeTokenSheet({
      ...buildEmptySheet(token?.name ?? selectedToken?.name ?? ""),
      size_category: token?.sizeCategory ?? selectedToken?.sizeCategory ?? "",
    });
    setTokenSheetAutoFillSource(null);
    setTokenSheetAutoFillError(null);
    setShowTokenSheet(true);
  }, [tokens, selectedToken]);

  const closeTokenSheet = useCallback(() => {
    setShowTokenSheet(false);
    setTokenSheetTokenId(null);
    setTokenSheetAutoFillLoading(false);
    setTokenSheetAutoFillSource(null);
    setTokenSheetAutoFillError(null);
  }, []);

  useEffect(() => {
    if (!showTokenSheet || !tokenSheetTokenId) return;
    let active = true;
    const loadSheet = async () => {
      setTokenSheetLoading(true);
      const data = await fetchTokenSheet(tokenSheetTokenId);
      if (!active) return;
      if (!data) {
        setTokenSheetLoading(false);
        return;
      }

      const abilities = (data as any).abilities ?? {};
      const saves = (data as any).saving_throws ?? {};
      const normalizeAbility = (obj: any) => ({
        str: obj?.str != null ? String(obj.str) : "",
        dex: obj?.dex != null ? String(obj.dex) : "",
        con: obj?.con != null ? String(obj.con) : "",
        int: obj?.int != null ? String(obj.int) : "",
        wis: obj?.wis != null ? String(obj.wis) : "",
        cha: obj?.cha != null ? String(obj.cha) : "",
      });

      setTokenSheet({
        name: (data as any).name ?? selectedToken?.name ?? "",
        size_category: (data as any).size_category ?? selectedToken?.sizeCategory ?? "",
        type: (data as any).type ?? "",
        alignment: (data as any).alignment ?? "",
        armorClass: (data as any).armor_class != null ? String((data as any).armor_class) : "",
        hitPoints: (data as any).hit_points != null ? String((data as any).hit_points) : "",
        speed: (data as any).speed ?? "",
        abilities: normalizeAbility(abilities),
        saves: normalizeAbility(saves),
        skills: {},
        damageResistances: fromList((data as any).damage_resistances),
        conditionImmunities: fromList((data as any).condition_immunities),
        senses: (data as any).senses ?? "",
        languages: (data as any).languages ?? "",
        challengeRating: (data as any).challenge_rating ?? "",
        xp: (data as any).xp != null ? String((data as any).xp) : "",
        abilitiesText: (data as any).abilities_text ?? "",
        actionsText: (data as any).actions_text ?? "",
      });
      setTokenSheetLoading(false);
    };

    loadSheet();
    return () => { active = false; };
  }, [showTokenSheet, tokenSheetTokenId, selectedToken?.name]);

  useEffect(() => {
    if (!tokenSheetTokenId) return;
    const stillExists = tokens.some((token) => token.id === tokenSheetTokenId);
    if (!stillExists) {
      setShowTokenSheet(false);
      setTokenSheetTokenId(null);
    }
  }, [tokenSheetTokenId, tokens]);

  const handleTokenSheetChange = useCallback((nextSheet: TokenSheet) => {
    tokenSheetRef.current = nextSheet;
    setTokenSheet(nextSheet);
  }, []);

  const handleSaveTokenSheet = useCallback(async () => {
    const sheetToSave = tokenSheetRef.current;
    if (!tokenSheetTokenId) return false;
    setTokenSheetSaving(true);
    try {
      const safeSheet = normalizeTokenSheet(sheetToSave);
      const fallbackSizeCategory = safeSheet.size_category || selectedToken?.sizeCategory || tokenSheet.size_category || 'Medium';
      const payload = {
        name: safeSheet.name || null,
        size_category: fallbackSizeCategory,
        type: safeSheet.type || null,
        alignment: safeSheet.alignment || null,
        armor_class: toLeadingNumberOrNull(safeSheet.armorClass),
        hit_points: toLeadingNumberOrNull(safeSheet.hitPoints),
        speed: safeSheet.speed || null,
        abilities: {
          str: toNumberOrNull(safeSheet.abilities.str),
          dex: toNumberOrNull(safeSheet.abilities.dex),
          con: toNumberOrNull(safeSheet.abilities.con),
          int: toNumberOrNull(safeSheet.abilities.int),
          wis: toNumberOrNull(safeSheet.abilities.wis),
          cha: toNumberOrNull(safeSheet.abilities.cha),
        },
        saving_throws: {
          str: toNumberOrNull(safeSheet.saves.str),
          dex: toNumberOrNull(safeSheet.saves.dex),
          con: toNumberOrNull(safeSheet.saves.con),
          int: toNumberOrNull(safeSheet.saves.int),
          wis: toNumberOrNull(safeSheet.saves.wis),
          cha: toNumberOrNull(safeSheet.saves.cha),
        },
        damage_resistances: toList(safeSheet.damageResistances),
        condition_immunities: toList(safeSheet.conditionImmunities),
        senses: safeSheet.senses || null,
        languages: safeSheet.languages || null,
        challenge_rating: safeSheet.challengeRating || null,
        xp: toLeadingNumberOrNull(safeSheet.xp),
        abilities_text: safeSheet.abilitiesText || null,
        actions_text: safeSheet.actionsText || null,
        updated_at: new Date().toISOString(),
      };

      try {
        await updateToken(tokenSheetTokenId, { ...payload, campaign_id: campaignId });
      } catch (err: any) {
        alert(`Erro ao salvar ficha: ${err.message}`);
        return false;
      }

      // Atualiza token local com nome e tamanho
      const newSize = (safeSheet.size_category ?? 'Medium') as any;
      setTokens((prev) => prev.map((token) => {
        if (token.id !== tokenSheetTokenId) return token;
        return {
          ...token,
          ...(safeSheet.name ? { name: safeSheet.name } : {}),
          sizeCategory: newSize,
        };
      }));

      // Fecha a ficha após salvar
      setShowTokenSheet(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao salvar ficha';
      alert(`Erro ao salvar ficha: ${message}`);
      return false;
    } finally {
      setTokenSheetSaving(false);
    }
  }, [tokenSheetTokenId, selectedToken, tokenSheet, campaignId, setTokens]);

  const applyAutoFillSheet = useCallback((sheetFromSource: Partial<TokenSheet>, sourceLabel?: string | null): boolean => {
    const currentTokenName = tokenSheet.name || selectedToken?.name || '';
    const mergedSheet: TokenSheet = {
      ...buildEmptySheet(currentTokenName),
      ...tokenSheet,
      ...sheetFromSource,
      abilities: {
        ...EMPTY_ABILITIES,
        ...tokenSheet.abilities,
        ...(sheetFromSource?.abilities ?? {}),
      },
      saves: {
        ...EMPTY_ABILITIES,
        ...tokenSheet.saves,
        ...(sheetFromSource?.saves ?? {}),
      },
      skills: {
        ...tokenSheet.skills,
        ...(sheetFromSource?.skills ?? {}),
      },
    };

    tokenSheetRef.current = mergedSheet;
    setTokenSheet(mergedSheet);
    setTokenSheetAutoFillSource(sourceLabel ?? null);
    setTokenSheetAutoFillError(null);
    return true;
  }, [tokenSheet, selectedToken]);

  const handleAutoFillTokenSheet = useCallback(async () => {
    if (!tokenSheetTokenId) return false;
    const currentTokenName = tokenSheet.name || selectedToken?.name || "";
    if (!currentTokenName.trim()) {
      setTokenSheetAutoFillError('Nome do token ausente para auto-preenchimento.');
      return false;
    }

    setTokenSheetAutoFillLoading(true);
    setTokenSheetAutoFillError(null);
    try {
      const response = await fetch('/api/monster-sheet-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, tokenName: currentTokenName }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao ler o PDF');
      }

      const sheetFromPdf = data?.sheet as Partial<TokenSheet> | undefined;
      return applyAutoFillSheet(sheetFromPdf ?? {}, data?.sourceBook?.title ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao auto-preencher';
      setTokenSheetAutoFillError(`Não foi possível ler o livro PDF. ${message}. Tente a opção copiar e colar.`);
      return false;
    } finally {
      setTokenSheetAutoFillLoading(false);
    }
  }, [tokenSheetTokenId, tokenSheet, selectedToken, campaignId, applyAutoFillSheet]);

  const handleAutoFillTokenSheetFromText = useCallback(async (rawText: string) => {
    if (!tokenSheetTokenId) return false;

    setTokenSheetAutoFillLoading(true);
    setTokenSheetAutoFillError(null);
    try {
      const parsedSheet = parseMonsterSheetFromClipboardText(rawText);

      if (!parsedSheet) {
        throw new Error('Não encontrei um bloco de ficha no texto colado.');
      }

      return applyAutoFillSheet(parsedSheet, 'Texto colado');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada ao preencher com texto';
      setTokenSheetAutoFillError(`Não foi possível preencher com o texto colado. ${message}`);
      return false;
    } finally {
      setTokenSheetAutoFillLoading(false);
    }
  }, [tokenSheetTokenId, applyAutoFillSheet]);

  return {
    showTokenSheet: showTokenSheetState,
    tokenSheet,
    tokenSheetLoading,
    tokenSheetSaving,
    tokenSheetAutoFillLoading,
    tokenSheetAutoFillSource,
    tokenSheetAutoFillError,
    tokenLabel: tokenSheet.name || selectedToken?.name,
    openTokenSheet,
    handleTokenSheetChange,
    handleSaveTokenSheet,
    handleAutoFillTokenSheet,
    handleAutoFillTokenSheetFromText,
    closeTokenSheet,
  };
}