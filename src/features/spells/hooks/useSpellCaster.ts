import type React from 'react';
import { SpellExecution } from '@/domain/spells/spell-executor';

interface Token {
  id: string;
  x: number;
  y: number;
  raio: number;
  nome: string;
  pvAtuais?: number;
  pvMax?: number;
  characterId?: number | null;
  isMonster?: boolean;
}

export const safeJson = (v: unknown): Record<string, unknown> => {
  if (typeof v === 'object' && v !== null) return v as Record<string, unknown>;
  if (typeof v === 'string') try { return JSON.parse(v); } catch { return {}; }
  return {};
};

export const mapSalvacaoParaAtributo = (tipo: string): string => {
  const map: Record<string, string> = {
    "força": "str", "for": "str", "strength": "str", "str": "str",
    "destreza": "dex", "dex": "dex", "dexterity": "dex",
    "constituição": "con", "constituicao": "con", "con": "con", "constitution": "con",
    "inteligência": "int", "inteligencia": "int", "int": "int", "intelligence": "int",
    "sabedoria": "wis", "sab": "wis", "wis": "wis", "wisdom": "wis",
    "carisma": "cha", "car": "cha", "cha": "cha", "charisma": "cha",
  };
  return map[tipo.trim().toLowerCase()] || "dex";
};

export const isHealingSpell = (currentSpell: SpellExecution): boolean => {
  if (currentSpell.danoRolagem && currentSpell.salvacao) return false;
  const corpus = [
    currentSpell.categoriaMagia,
    currentSpell.efeitoPrincipal,
    currentSpell.beneficioConcedido,
    currentSpell.descricao,
    currentSpell.spellName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(cura|curar|curou|recuper|restaura|restaurar|healing|heal)/.test(corpus);
};

export const getMousePoint = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export const resolverNomesAlvos = (resultados: { tokenId: string }[], resolvedTokens: Map<string, { nome: string | null; bonusPorAtributo: Record<string, number> }> | undefined, tokens: Token[]) => {
  const nomes = resultados
    .map((resultado) => {
      const rt = resolvedTokens?.get(resultado.tokenId);
      return rt?.nome || tokens.find((token) => token.id === resultado.tokenId)?.nome || `Token-${resultado.tokenId.slice(0, 4)}`;
    })
    .filter(Boolean);

  const unicos = Array.from(new Set(nomes));
  if (unicos.length === 0) return 'Nenhum alvo na área';
  if (unicos.length === 1) return unicos[0];
  if (unicos.length === 2) return `${unicos[0]} e ${unicos[1]}`;
  return `${unicos[0]}, ${unicos[1]} e mais ${unicos.length - 2}`;
};