import { Character } from "../../features/character/types";

export function longRest(character: Character): Character {
  // If the character doesn't have spellSlots initialized, initialize them empty
  const currentSlots = character.spellSlots || {
    max: {},
    used: {},
    pact: null,
    arcanum: null
  };

  return {
    ...character,
    hp_current: character.hp_max,
    spellSlots: {
      ...currentSlots,
      used: Object.fromEntries(
        Object.keys(currentSlots.max).map(k => [k, 0])
      ),
      pact: currentSlots.pact
        ? { ...currentSlots.pact, used: 0 }
        : null,
      arcanum: currentSlots.arcanum 
        ? Object.keys(currentSlots.arcanum).reduce((acc, k) => { 
            acc[Number(k)] = 1; return acc; 
          }, {} as Record<number, number>)
        : null
    },
    lastLongRest: new Date().toISOString(),
  };
}

export function shortRest(character: Character): Character {
  const currentSlots = character.spellSlots || {
    max: {},
    used: {},
    pact: null,
    arcanum: null
  };

  // Apenas Warlock recupera slots em short rest (Pact Magic). Arcanum não recupera em short rest.
  return {
    ...character,
    spellSlots: currentSlots.pact
      ? { ...currentSlots, pact: { ...currentSlots.pact, used: 0 } }
      : currentSlots,
  };
}