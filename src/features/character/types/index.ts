export type WeaponAttribute = 'str' | 'dex';

export type ItemCategoria = 'arma' | 'armadura' | 'consumivel' | 'item';

export type CasterType = 'full' | 'half' | 'third' | 'warlock' | 'none';

export interface ClassLevel {
  className: string;          // "Mago", "Feiticeiro", etc.
  level: number;              // 1-20
  subclass: string | null;    // "Escola de Evocação", etc.
}

export interface SpellSlots {
  max: Record<number, number>;    // { 1: 4, 2: 3, 3: 3, ... }
  used: Record<number, number>;   // { 1: 0, 2: 1, 3: 0, ... }
  pact: { max: number; used: number } | null;  // Warlock Pact Magic
  arcanum: Record<number, number> | null; // { 6: 0|1, 7: 0|1, 8: 0|1, 9: 0|1 } para Warlock
}

export interface CharacterSpell {
  id: number;
  name: string;
  level: number;              // 0-9 (0 = truque)
  className: string | 'racial' | 'talent' | 'other'; // 'Mago', ou fonte externa
  source: 'catalog' | 'custom';
  prepared?: boolean;         // para classes que preparam (opcional)
  alwaysPrepared?: boolean;   // magias de domínio, círculo, ou juramento (ex: Clérigo, Druida, Paladino)
  isRitual?: boolean;         // Se pode ser conjurada como ritual
  castType?: 'slot' | 'innate'; // default 'slot'. 'innate' não checa slots na hora de lançar.
  innateUses?: { max: number; current: number; resetOn: 'short' | 'long' }; // Ex: 1/dia (long rest)
  // Campos legados mantidos temporariamente
  tipo?: string;
  desc?: string;
}

export type SpellCircle = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Character {
  id: string | number;
  name: string;
  
  // Campos legados (marcar como opcionais para migração)
  class?: string;
  level?: number;
  
  // Novos campos de classes
  classLevels: ClassLevel[];

  race: string;
  background: string;
  alignment: string;
  experiencePoints: number;
  proficiencyBonus: number;
  inspiration: boolean;
  ac: number;
  hp_current: number;
  hp_max: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  inventory: InventoryItem[];
  
  // Novos campos de magias
  spells: CharacterSpell[];
  spellSlots: SpellSlots;
  preparedSpells: number[];          // IDs das magias preparadas
  lastLongRest: string | null;       // ISO date da última long rest

  img: string;
  currency?: { pl: number; po: number; pp: number; pc: number };
  imgOffsetX?: number;
  imgOffsetY?: number;
  is_linked?: boolean;
  owner_id?: string;
}

export interface InventoryItem {
  id: number;
  name?: string;
  nome?: string;
  categoria?: ItemCategoria;
  tipo?: string;
  atributo?: WeaponAttribute;
  ataque?: string;
  dano?: string;
  caBase?: number;
  tipoArmadura?: string;
  quantidade?: number;
  efeito?: string;
  desc?: string;
  proficiente?: boolean;
}

export type InventoryFormState = {
  nome: string;
  categoria: ItemCategoria;
  tipo: string;
  atributo: WeaponAttribute | '';
  ataque: string;
  dano: string;
  caBase: string;
  tipoArmadura: string;
  quantidade: string;
  efeito: string;
  desc: string;
  proficiente: boolean;
};

export type SpellFormState = {
  name: string;
  level: string;
  tipo: string;
  desc: string;
};
