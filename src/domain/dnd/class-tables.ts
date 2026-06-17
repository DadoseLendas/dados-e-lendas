import { CasterType } from "../../features/character/types";

// Tipo de conjurador por classe
export const CASTER_TYPES: Record<string, CasterType> = {
  "Artífice": "half",
  "Bardo": "full",
  "Bruxo": "warlock",
  "Clérigo": "full",
  "Druida": "full",
  "Feiticeiro": "full",
  "Mago": "full",
  "Paladino": "half",
  "Patrulheiro": "half",
  // Bárbaro, Guerreiro, Guardião, Ladino, Monge → "none"
};

// Subclasses que concedem conjuração 1/3 (Cavaleiro Arcano, Trapaceiro Arcano)
export const SUBCLASSES_THIRD: Record<string, string[]> = {
  "Guerreiro": ["Cavaleiro Arcano (1/3)"],
  "Ladino": ["Trapaceiro Arcano (1/3)"],
};

// Retorna o tipo de conjurador efetivo considerando subclasses 1/3
export function getEffectiveCasterType(className: string, subclass?: string | null): CasterType {
  const baseType = CASTER_TYPES[className] || 'none';
  if (baseType !== 'none') return baseType;
  if (subclass && SUBCLASSES_THIRD[className]?.includes(subclass)) return 'third';
  return baseType;
}

// Tabela de slots FULL CASTER (Wizard, Cleric, Sorcerer, Bard, Druid)
// Level → { 1: N, 2: N, ... 9: N }
export const FULL_CASTER_SLOTS: Record<number, Record<number, number>> = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

// WARLOCK (Pact Magic): slots de nível fixo (5), número limitado
export const WARLOCK_SLOTS: Record<number, { slots: number; level: number }> = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

export interface ClassInfo {
  hp: number;
  primaryAttr: string;
  savingThrows: string[];
  casterType: CasterType;
  subclasses: string[];
}

export const CLASS_DATA: Record<string, ClassInfo> = {
  "Artífice": {
    hp: 8, primaryAttr: "Inteligência",
    savingThrows: ["con", "int"], casterType: "half",
    subclasses: ["Alquimista", "Armeiro", "Artilheiro", "Ferreiro de Batalha"],
  },
  "Bárbaro": {
    hp: 12, primaryAttr: "Força",
    savingThrows: ["str", "con"], casterType: "none",
    subclasses: ["Caminho do Berserker", "Caminho do Totem", "Caminho do Ancestral"],
  },
  "Bardo": {
    hp: 8, primaryAttr: "Carisma",
    savingThrows: ["dex", "cha"], casterType: "full",
    subclasses: ["Colégio do Conhecimento", "Colégio da Bravura", "Colégio do Glamour"],
  },
  "Bruxo": {
    hp: 8, primaryAttr: "Carisma",
    savingThrows: ["wis", "cha"], casterType: "warlock",
    subclasses: ["A Arquifada", "O Corruptor (Diabólico)", "O Grande Antigo"],
  },
  "Clérigo": {
    hp: 8, primaryAttr: "Sabedoria",
    savingThrows: ["wis", "cha"], casterType: "full",
    subclasses: [
      "Conhecimento", "Enganação", "Luz", "Natureza", "Tempestade", "Vida", "Guerra",
    ],
  },
  "Druida": {
    hp: 8, primaryAttr: "Sabedoria",
    savingThrows: ["int", "wis"], casterType: "full",
    subclasses: ["Círculo da Terra", "Círculo da Lua", "Círculo dos Sonhos"],
  },
  "Feiticeiro": {
    hp: 6, primaryAttr: "Carisma",
    savingThrows: ["con", "cha"], casterType: "full",
    subclasses: ["Linhagem Dracônica", "Magia Selvagem", "Magia Sombria"],
  },
  "Guardião": { // Classe Homebrew, mantida conforme requisição.
    hp: 10, primaryAttr: "Destreza & Sabedoria",
    savingThrows: ["str", "dex"], casterType: "none",
    subclasses: ["Juramento da Guarda"],
  },
  "Guerreiro": {
    hp: 10, primaryAttr: "Força ou Destreza",
    savingThrows: ["str", "con"], casterType: "none",
    subclasses: ["Cavaleiro Arcano (1/3)", "Campeão", "Mestre de Batalha"],
  },
  "Ladino": {
    hp: 8, primaryAttr: "Destreza",
    savingThrows: ["dex", "int"], casterType: "none",
    subclasses: ["Ladrão", "Assassino", "Trapaceiro Arcano (1/3)"],
  },
  "Mago": {
    hp: 6, primaryAttr: "Inteligência",
    savingThrows: ["int", "wis"], casterType: "full",
    subclasses: [
      "Abjuração", "Adivinhação", "Conjuração", "Encantamento",
      "Evocação", "Ilusão", "Necromancia", "Transmutação",
    ],
  },
  "Monge": {
    hp: 8, primaryAttr: "Destreza & Sabedoria",
    savingThrows: ["str", "dex"], casterType: "none",
    subclasses: ["Caminho da Mão Aberta", "Caminho da Sombra", "Caminho dos Quatro Elementos"],
  },
  "Paladino": {
    hp: 10, primaryAttr: "Força & Carisma",
    savingThrows: ["wis", "cha"], casterType: "half",
    subclasses: ["Juramento da Devoção", "Juramento dos Anciões", "Juramento da Vingança"],
  },
  "Patrulheiro": {
    hp: 10, primaryAttr: "Destreza & Sabedoria",
    savingThrows: ["str", "dex"], casterType: "half",
    subclasses: ["Mestre das Feras", "Caçador", "Rastreador Sombrio"],
  },
};
