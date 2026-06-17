import { ClassLevel, SpellSlots } from "../../features/character/types";
import { FULL_CASTER_SLOTS, WARLOCK_SLOTS, getEffectiveCasterType } from "./class-tables";

// Calcula o caster level combinado (multiclasse)
export function getCombinedCasterLevel(classLevels: ClassLevel[]): number {
  let total = 0;
  for (const cl of classLevels) {
    const type = getEffectiveCasterType(cl.className, cl.subclass);
    if (type === 'full') {
      total += cl.level;
    } else if (type === 'half') {
      // Artífice arredonda para cima em multiclasse. Paladino e Patrulheiro arredondam para baixo.
       if (cl.className === "Artífice") {
           total += Math.ceil(cl.level / 2);
       } else {
           total += Math.floor(cl.level / 2);
       }
    } else if (type === 'third') {
      total += Math.floor(cl.level / 3);
    }
    // 'warlock' e 'none' não contribuem para o caster level combinado
  }
  return total;
}

// Calcula slots máximos para um personagem
export function calculateMaxSlots(classLevels: ClassLevel[]): SpellSlots {
  const combined = getCombinedCasterLevel(classLevels);
  const table = FULL_CASTER_SLOTS[Math.min(combined, 20)] || {};

  // Pact Magic (Warlock)
  const warlockLevel = classLevels.find(c => c.className === "Bruxo")?.level ?? 0;
  const pact = warlockLevel > 0 ? WARLOCK_SLOTS[warlockLevel] : null;
  
  // Arcanos Mistos (Warlock) - Ganhos nos níveis 11, 13, 15, e 17
  let arcanum: Record<number, number> | null = null;
  if (warlockLevel >= 11) {
      arcanum = {
          6: warlockLevel >= 11 ? 1 : 0,
          7: warlockLevel >= 13 ? 1 : 0,
          8: warlockLevel >= 15 ? 1 : 0,
          9: warlockLevel >= 17 ? 1 : 0,
      }
  }

  return {
    max: { ...table },  // slots do caster level combinado
    used: Object.keys(table).reduce((acc, k) => { acc[Number(k)] = 0; return acc; }, {} as Record<number, number>),
    pact: pact ? { max: pact.slots, used: 0 } : null,
    arcanum: arcanum
  };
}

// Verifica se pode gastar slot
export function canCastSpell(spellLevel: number, slots: SpellSlots, isPactMagic: boolean, isArcanum: boolean): boolean {
  // Cantrips don't use slots
  if (spellLevel === 0) return true;

  if (isArcanum && slots.arcanum) {
      return (slots.arcanum[spellLevel] || 0) > 0;
  }
  if (isPactMagic && slots.pact) {
    return slots.pact.used < slots.pact.max;
  }
  
  return (slots.max[spellLevel] || 0) - (slots.used[spellLevel] || 0) > 0;
}

// Gasta um slot
export function spendSlot(spellLevel: number, slots: SpellSlots, isPactMagic: boolean, isArcanum: boolean): SpellSlots {
  if (spellLevel === 0) return slots; // Truques não gastam slots

  const newSlots = { ...slots };

  if (isArcanum && newSlots.arcanum && newSlots.arcanum[spellLevel] > 0) {
    // Para o arcanum, vamos diminuir o máximo como forma de marcar que foi usado,
    // ou precisaria de um arcanum_used. Seguindo a simplicidade, vamos zerar o valor no record para uso.
    newSlots.arcanum = { ...newSlots.arcanum, [spellLevel]: 0 };
    return newSlots;
  }

  if (isPactMagic && newSlots.pact && newSlots.pact.used < newSlots.pact.max) {
    newSlots.pact = { ...newSlots.pact, used: newSlots.pact.used + 1 };
    return newSlots;
  }

  const max = newSlots.max[spellLevel] || 0;
  const used = newSlots.used[spellLevel] || 0;

  if (used < max) {
    newSlots.used = { ...newSlots.used, [spellLevel]: used + 1 };
  }

  return newSlots;
}
