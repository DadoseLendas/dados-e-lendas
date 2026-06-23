"use client";
import { useState, useMemo, useCallback } from 'react';
import { EffectResult, SpellExecution } from '@/domain/spells/spell-executor';
import { Token } from '@/features/mesa/types';
import { computeTokenLabels } from '@/features/mesa/utils/token-labels';
import { applyHpDeltaToCharacter, applyHpDeltaToMonsterToken } from '@/features/mesa/services/mesa-service';

interface UseMesaSpellCasterReturn {
  activeSpellCast: SpellExecution | null;
  setActiveSpellCast: (spell: SpellExecution | null) => void;
  casterToken: Token | null;
  spellCasterTokens: {
    id: string; x: number; y: number; raio: number;
    nome: string; pvAtuais?: number; pvMax?: number;
    characterId?: number | null; isMonster?: boolean;
  }[];
  handleSpellLaunch: (spell: SpellExecution) => void;
  handleSpellCast: (results: EffectResult[]) => void;
  handleOpenTokenSheet: (tokenId: string) => void;
}

export function useMesaSpellCaster(
  tokens: Token[],
  fichaCharacterId: number | string | null,
  tokenSelecionado: string | null,
  gridSize: number,
  footprintForCategory: (cat?: string) => number,
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>,
  setShowSpellModal: (v: boolean) => void,
  setTokenSelecionado: (id: string | null) => void,
  openTokenSheet: (tokenId: string) => void,
): UseMesaSpellCasterReturn {
  const [activeSpellCast, setActiveSpellCast] = useState<SpellExecution | null>(null);

  const casterToken = useMemo(() => {
    const ownToken = tokens.find(t => String(t.characterId) === String(fichaCharacterId));
    if (ownToken) return ownToken;
    if (tokenSelecionado) return tokens.find(t => t.id === tokenSelecionado) ?? null;
    return tokens[0] ?? null;
  }, [fichaCharacterId, tokenSelecionado, tokens]);

  const spellCasterTokens = useMemo(() => {
    const labels = computeTokenLabels(tokens);
    return tokens.map(token => ({
      id: token.id, x: token.x, y: token.y,
      raio: gridSize * footprintForCategory(token.sizeCategory) * 0.5,
      nome: labels.get(token.id) || token.name || `Token-${token.id.slice(0, 4)}`,
      pvAtuais: token.hp, pvMax: token.maxHp,
      characterId: token.characterId, isMonster: token.isMonster,
    }));
  }, [gridSize, tokens, footprintForCategory]);

  const handleSpellLaunch = useCallback((spell: SpellExecution) => {
    setActiveSpellCast(spell);
    setShowSpellModal(false);
  }, [setShowSpellModal]);

  const handleSpellCast = useCallback((results: EffectResult[]) => {
    setTokens(prev => prev.map(token => {
      const result = results.find(item => item.tokenId === token.id);
      if (!result) return token;
      const currentHp = token.hp ?? token.maxHp ?? 0;
      const maxHp = token.maxHp ?? currentHp;
      return { ...token, hp: Math.max(0, Math.min(maxHp, currentHp - result.danoRecebido)), maxHp };
    }));

    for (const r of results) {
      const token = tokens.find(t => t.id === r.tokenId);
      if (!token) continue;
      const delta = -r.danoRecebido;
      if (token.characterId) {
        void applyHpDeltaToCharacter(token.characterId, delta).catch(() => {});
      } else {
        void applyHpDeltaToMonsterToken(token.id, delta).catch(() => {});
      }
    }
  }, [setTokens, tokens]);

  const handleOpenTokenSheet = useCallback((tokenId: string) => {
    setTokenSelecionado(tokenId);
    openTokenSheet(tokenId);
  }, [setTokenSelecionado, openTokenSheet]);

  return {
    activeSpellCast,
    setActiveSpellCast,
    casterToken,
    spellCasterTokens,
    handleSpellLaunch,
    handleSpellCast,
    handleOpenTokenSheet,
  };
}