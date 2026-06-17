import { Character } from "../../features/character/types";
import { getEffectiveCasterType } from "./class-tables";

// Círculo máximo que uma classe pode acessar
export function getMaxCircle(className: string, level: number, subclass?: string | null): number {
  const type = getEffectiveCasterType(className, subclass);
  if (type === 'none') return 0;
  if (type === 'warlock') return Math.min(5, Math.ceil(level / 2)); // Warlock slots param no 5º. Arcanum é magia conhecida, não slot normal.
  if (type === 'half') {
      if (level === 1 && className !== 'Artífice') return 0; // Paladino e Ranger não têm slots nv1
      return Math.ceil(level / 4); 
  }
  if (type === 'third') return Math.ceil(level / 6);               
  return Math.ceil(level / 2);                                      // Full caster
}

// Limite de magias conhecidas (para classes que limitam)
export const KNOWN_SPELLS_TABLE: Record<string, Record<number, number>> = {
  "Bardo":    { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14,
                11: 15, 12: 15, 13: 16, 14: 18, 15: 19, 16: 19, 17: 20, 18: 22,
                19: 22, 20: 22 },
  "Feiticeiro": { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11,
                  11: 12, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15,
                  19: 15, 20: 15 },
  "Bruxo":    { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10,
                11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14,
                19: 15, 20: 15 },
  "Patrulheiro": { 1: 0, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6,
                   11: 7, 12: 7, 13: 8, 14: 8, 15: 9, 16: 9, 17: 10, 18: 10,
                   19: 11, 20: 11 },
};

// Classes que preparam magias
export const PREPARER_CLASSES = new Set(["Clérigo", "Druida", "Mago", "Paladino", "Artífice"]);

// Número de magias preparadas
export function getMaxPrepared(className: string, level: number, castingMod: number): number {
  if (!PREPARER_CLASSES.has(className)) return 0;
  
  const type = getEffectiveCasterType(className);
  // Half-casters (Paladino/Artífice) preparam: Nível / 2 (arredondado para baixo) + modificador
  const effectiveLevel = type === 'half' ? Math.floor(level / 2) : level;
  
  return Math.max(1, effectiveLevel + castingMod);
}

// Cantrips conhecidas
export const CANTRIPS_TABLE: Record<string, Record<number, number>> = {
  "Bardo":       { 1: 2, 4: 3, 10: 4 },
  "Clérigo":     { 1: 3, 4: 4, 10: 5 },
  "Druida":      { 1: 2, 4: 3, 10: 4 },
  "Feiticeiro":  { 1: 4, 4: 5, 10: 6 },
  "Mago":        { 1: 3, 4: 4, 10: 5 },
  "Bruxo":       { 1: 2, 4: 3, 10: 4 },
  "Paladino":    { 1: 0 },
  "Patrulheiro": { 1: 0 },
  "Artífice":    { 1: 2, 10: 3, 14: 4 },
};

export interface SpellCatalogItem {
    classes_disponivel: string | string[];
    nivel_magia: number;
    // outros campos...
}

export function parseClassesDisponivel(val: string | string[]): string[] {
    if (Array.isArray(val)) return val.map(c => c.toLowerCase());
    try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map(c => String(c).toLowerCase());
    } catch {
        // se não for json, tenta split por vírgula ou espaço
        return val.toLowerCase().split(/[\s,]+/).filter(Boolean);
    }
    return [];
}

export function canLearnSpell(
  character: Character,
  spell: SpellCatalogItem,
  className: string,
  isInnateOrFeat: boolean = false
): { allowed: boolean; reason?: string } {
  if (isInnateOrFeat) return { allowed: true };

  // 1. Verificar classe
  const classes = parseClassesDisponivel(spell.classes_disponivel);
  if (!classes.includes(className.toLowerCase())) {
    return { allowed: false, reason: "Magia não disponível para esta classe" };
  }

  // 2. Verificar círculo máximo da classe
  const classLevel = character.classLevels.find(c => c.className === className);
  if (!classLevel) return { allowed: false, reason: "Classe não encontrada no personagem" };
  const maxCircle = getMaxCircle(className, classLevel.level, classLevel.subclass);
  if (spell.nivel_magia > 0 && spell.nivel_magia > maxCircle) {
    return { allowed: false, reason: `Círculo máximo para ${className} nível ${classLevel.level} é ${maxCircle}` };
  }

  // 3. Verificar limite de conhecidas (se aplicável)
  const knownLimit = KNOWN_SPELLS_TABLE[className]?.[classLevel.level];
  if (knownLimit !== undefined) {
    const knownOfClass = character.spells.filter(s => s.className === className).length;
    if (knownOfClass >= knownLimit) {
      return { allowed: false, reason: `Limite de magias conhecidas para ${className} atingido (${knownLimit})` };
    }
  }

  // 4. Verificar se é truque — cada classe tem limite próprio
  if (spell.nivel_magia === 0) {
    let cantripLimit = 0;
    
    if (CANTRIPS_TABLE[className]) {
      const cantripTiers = Object.keys(CANTRIPS_TABLE[className]).map(Number).sort((a, b) => a - b);
      for (const tier of cantripTiers) {
          if (classLevel.level >= tier) cantripLimit = CANTRIPS_TABLE[className][tier];
      }
    }
    
    const knownCantrips = character.spells.filter(
      s => s.className === className && s.level === 0
    ).length;
    
    if (knownCantrips >= cantripLimit) {
      return { allowed: false, reason: `Limite de truques para ${className} atingido (${cantripLimit})` };
    }
  }

  return { allowed: true };
}