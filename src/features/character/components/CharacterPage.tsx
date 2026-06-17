'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/shared/components/navbar';
import Footer from '@/shared/components/footer';
import Card from '@/shared/components/card';
import CharacterGrimorioPanel from '@/features/character/components/grimorio_ficha';
import type { JSX } from 'react';
import { Plus, ArrowLeft, ShieldAlert, Sparkles, Trash2, Save, Shield, Zap, BookOpen, Backpack, ScrollText, Sword, FlaskConical, Pencil, Coins, ChevronDown } from 'lucide-react';

// --- DADOS DE RAÇAS (Adicionado) ---
const RACE_DATA: Record<string, { stats: Record<string, number>, traits: string, note?: string }> = {
  "Anão": { stats: { con: 2 }, traits: "Visão no Escuro, Resiliência Anã, Treino de Combate Anão, Proficiência com ferramentas, Talento Com Pedra" },
  "Elfo": { stats: { dex: 2 }, traits: "Visão no Escuro, Sentidos Apurados, Ascendência Fey, Transe" },
  "Draconato": { stats: { str: 2, cha: 1 }, traits: "Ancestralidade Draconiana, Arma de Bafo, Resistência a Danos" },
  "Gnomo": { stats: { int: 2 }, traits: "Visão no escuro, Astúcia dos Gnomos" },
  "Tiefling": { stats: { int: 1, cha: 2 }, traits: "Visão no escuro, Resistência infernal, Legado infernal" },
  "Halfling": { stats: { dex: 2 }, traits: "Sortudo, Corajoso, Agilidade de Halfling" },
  "Humano": { stats: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, traits: "Proficiência em 1 skill à escolha" },
  "Humano (Variante)": { stats: {}, traits: "1 Talento à escolha, Proficiência em 1 skill", note: "+1 em dois atributos e +1 Talento. Adicione os pontos manualmente." },
  "Meio-Elfo": { stats: { cha: 2 }, traits: "Visão no Escuro, Ascendência Fey, Versatilidade em Skills", note: "Já somamos +2 em Carisma. Adicione manualmente +1 em outros dois atributos." },
  "Meio-Orc": { stats: { str: 2, con: 1 }, traits: "Visão no Escuro, Ameaçador, Resistência Implacável, Ataques Selvagens" },
};

const CLASS_DATA: Record<string, { hp: number; primaryAttr: string; savingThrows: string[] }> = {
  "Artífice": { hp: 8, primaryAttr: "Inteligência", savingThrows: ["con", "int"] },
  "Bárbaro": { hp: 12, primaryAttr: "Força", savingThrows: ["str", "con"] },
  "Bardo": { hp: 8, primaryAttr: "Carisma", savingThrows: ["dex", "cha"] },
  "Bruxo": { hp: 8, primaryAttr: "Carisma", savingThrows: ["wis", "cha"] },
  "Clérigo": { hp: 8, primaryAttr: "Sabedoria", savingThrows: ["wis", "cha"] },
  "Druida": { hp: 8, primaryAttr: "Sabedoria", savingThrows: ["int", "wis"] },
  "Feiticeiro": { hp: 6, primaryAttr: "Carisma", savingThrows: ["con", "cha"] },
  "Patrulheiro": { hp: 10, primaryAttr: "Destreza & Sabedoria", savingThrows: ["str", "dex"] },
  "Guerreiro": { hp: 10, primaryAttr: "Força ou Destreza", savingThrows: ["str", "con"] },
  "Ladino": { hp: 8, primaryAttr: "Destreza", savingThrows: ["dex", "int"] },
  "Mago": { hp: 6, primaryAttr: "Inteligência", savingThrows: ["int", "wis"] },
  "Monge": { hp: 8, primaryAttr: "Destreza & Sabedoria", savingThrows: ["str", "dex"] },
  "Paladino": { hp: 10, primaryAttr: "Força & Carisma", savingThrows: ["wis", "cha"] },
};

const WEAPON_ATTRIBUTE_OPTIONS = ['str', 'dex'] as const;
type WeaponAttribute = (typeof WEAPON_ATTRIBUTE_OPTIONS)[number];

const weaponAttributeLabels: Record<WeaponAttribute, string> = {
  str: 'Força',
  dex: 'Destreza',
};

type Character = {
  id: string | number;
  name: string;
  class: string;
  level: number;
  race: string;
  background?: string;
  alignment: string;
  experiencePoints: number;
  proficiencyBonus: number;
  inspiration: boolean;
  ac: number;
  hp_current: number;
  hp_max: number;
  initiative: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number; };
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  inventory: InventoryItem[];
  spells: { id: number; name: string; level: string }[];
  img: string;
  currency?: { pl: number; po: number; pp: number; pc: number };
  imgOffsetX?: number;
  imgOffsetY?: number;
  is_linked?: boolean;
  owner_id?: string;
}

type InventoryItem = {
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
};

type ItemCategoria = 'arma' | 'armadura' | 'consumivel' | 'item';

const CATEGORIA_LABELS: Record<ItemCategoria, string> = {
  arma: 'Arma',
  armadura: 'Armadura',
  consumivel: 'Consumível',
  item: 'Item',
};

const TIPO_ARMADURA_OPTIONS = [
  { value: 'leve', label: 'Leve' },
  { value: 'media', label: 'Média' },
  { value: 'pesada', label: 'Pesada' },
  { value: 'escudo', label: 'Escudo' },
];

const categoriaIcons: Record<ItemCategoria, JSX.Element> = {
  arma: <Sword size={14} className="text-[#00ff66]" />,
  armadura: <Shield size={14} className="text-[#4a9eff]" />,
  consumivel: <FlaskConical size={14} className="text-[#e5acff]" />,
  item: <Backpack size={14} className="text-[#f1e5ac]" />,
};

type InventoryFormState = {
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

const EMPTY_INVENTORY_FORM: InventoryFormState = {
  nome: '',
  categoria: 'arma',
  tipo: '',
  atributo: '',
  ataque: '',
  dano: '',
  caBase: '',
  tipoArmadura: '',
  quantidade: '1',
  efeito: '',
  desc: '',
  proficiente: false,
};

export default function PersonagensPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [characters, setCharacters] = useState<Partial<Character>[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [editingCharacterImg, setEditingCharacterImg] = useState(false);
  const [tempCharacterImg, setTempCharacterImg] = useState('');
  const [tempOffsetX, setTempOffsetX] = useState(50);
  const [tempOffsetY, setTempOffsetY] = useState(50);
  const [showFramingSliders, setShowFramingSliders] = useState(false);

  const [newAbilityName, setNewAbilityName] = useState('');
  const [newItem, setNewItem] = useState<InventoryFormState>(EMPTY_INVENTORY_FORM);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [expandedSpellId, setExpandedSpellId] = useState<number | null>(null);
  const [editingSpellId, setEditingSpellId] = useState<number | null>(null);
  const [spellForm, setSpellForm] = useState<{ name: string; level: string; desc?: string; tipo?: string }>({ name: '', level: '', desc: '', tipo: 'Habilidade' });
  const [showSpellForm, setShowSpellForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [sheetView, setSheetView] = useState<'ficha' | 'grimorio' | 'inventario'>('ficha');
  const [abaAtiva, setAbaAtiva] = useState<string>('personagens');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [raceModalOpen, setRaceModalOpen] = useState(false);
  const [raceModalSelections, setRaceModalSelections] = useState<Record<string, string>>({});

  const getModifier = (value: number) => {
    const normalizedValue = Math.floor(Number(value) || 0);
    return Math.floor((normalizedValue - 10) / 2);
  };

  const fetchCharacters = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('characters').select('id, name, class, level, race, img, imgOffsetX, imgOffsetY, owner_id, is_linked, hp_current, hp_max, ac').eq('owner_id', user.id);
    if (!error && data) setCharacters(data);
  }, [supabase]);

  const extractMissingColumn = (message?: string) => {
    if (!message) return null;
    const match = message.match(/Could not find the '([^']+)' column/);
    return match?.[1] ?? null;
  };

  // A grade de personagens carrega apenas colunas resumidas. Ao abrir uma ficha
  // precisamos do registro completo, senão stats/savingThrows/skills vêm undefined
  // e a renderização quebra ("Cannot read properties of undefined").
  const openCharacter = async (id: string | number) => {
    setLoadingAction(true);
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();
    setLoadingAction(false);
    if (error || !data) {
      alert('Não foi possível carregar a ficha: ' + (error?.message ?? 'registro não encontrado'));
      return;
    }
    // Defaults defensivos: garante que objetos esperados nunca sejam undefined
    const safe: Character = {
      ...(data as Character),
      stats: data.stats ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      savingThrows: data.savingThrows ?? {},
      skills: data.skills ?? {},
      inventory: data.inventory ?? [],
      spells: data.spells ?? [],
    };
    setActiveCharacter(safe);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        await fetchCharacters();
      }
      setIsLoadingAuth(false);
    };
    checkUser();
  }, [fetchCharacters, supabase.auth]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const saveToDatabase = async (char: Character) => {
    setLoadingAction(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload: Record<string, unknown> = {
      ...char,
      is_linked: char.is_linked ?? false,
      owner_id: user?.id
    };

    let saveError: { message?: string } | null = null;
    // P-02: Retry apenas para schema mismatch ("Could not find column").
    // Outros erros (rede, permissão, constraint) propagam imediatamente.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase.from('characters').upsert(payload);
      if (!error) { saveError = null; break; }
      const missingColumn = extractMissingColumn(error.message);
      if (missingColumn && missingColumn in payload) {
        // Erro retryável: coluna não existe no schema ainda
        delete payload[missingColumn];
        saveError = error;
        continue;
      }
      // Erro não-retryável: propagar imediatamente
      saveError = error;
      break;
    }

    if (saveError) alert("Erro ao salvar: " + (saveError.message ?? 'Erro desconhecido'));
    else await fetchCharacters();
    setLoadingAction(false);
  };

  const createCharacter = async () => {
    if (characters.length >= 6) return alert('Limite de 6 personagens atingido.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newChar = {
      name: 'Novo Herói', class: 'Guerreiro', level: 1, race: 'Humano',
      background: '', alignment: '', experiencePoints: 0, proficiencyBonus: 2,
      inspiration: false, ac: 10, hp_current: 10, hp_max: 10, initiative: 0,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      skills: {}, savingThrows: {}, inventory: [], spells: [],
      img: '/placeholder-rpg.png', is_linked: false, owner_id: user.id
    };

    const insertPayload: Record<string, unknown> = { ...newChar };
    let data: Character | null = null;
    let createError: { message?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabase.from('characters').insert([insertPayload]).select('id, name, class, level, race, alignment, experiencePoints, proficiencyBonus, inspiration, ac, hp_current, hp_max, initiative, stats, savingThrows, skills, inventory, spells, img, currency, imgOffsetX, imgOffsetY, is_linked, owner_id, classLevels, spellSlots, preparedSpells, lastLongRest, customSkills').single();      if (!result.error) { data = result.data; createError = null; break; }
      const missingColumn = extractMissingColumn(result.error.message);
      if (missingColumn && missingColumn in insertPayload) {
        delete insertPayload[missingColumn];
        createError = result.error;
        continue;
      }
      createError = result.error;
      break;
    }

    if (createError) alert('Erro ao criar: ' + (createError.message ?? 'Erro desconhecido'));
    if (data) { setCharacters((prev) => [...prev, data]); setActiveCharacter(data); }
    else await fetchCharacters();
  };

  const deleteCharacter = async (id: string | number) => {
    // T-04: Verificar ownership antes de deletar (previne IDOR)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('campaign_members').update({ current_character_id: null }).eq('current_character_id', id);
    await supabase.from('campaign_logs').delete().eq('character_id', id);
    const { error } = await supabase.from('characters').delete().eq('id', id).eq('owner_id', user.id);
    if (error) return;
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    setActiveCharacter(null);
    setConfirmDeleteId(null);
  };

  const updateCharacter = (field: string, value: unknown) => {
    if (!activeCharacter) return;
    setActiveCharacter({ ...activeCharacter, [field]: value } as Character);
  };

  const resetInventoryForm = () => {
    setNewItem(EMPTY_INVENTORY_FORM);
    setEditingInventoryId(null);
  };

  const startEditingInventoryItem = (item: InventoryItem) => {
    setEditingInventoryId(item.id);
    setNewItem({
      nome: item.nome || item.name || '',
      categoria: item.categoria || 'arma',
      tipo: item.tipo || '',
      atributo: item.atributo || '',
      ataque: item.ataque || '',
      dano: item.dano || '',
      caBase: item.caBase?.toString() || '',
      tipoArmadura: item.tipoArmadura || '',
      quantidade: item.quantidade?.toString() || '1',
      efeito: item.efeito || '',
      desc: item.desc || '',
      proficiente: item.proficiente || false,
    });
    setShowInventoryForm(true);
  };

  const saveInventoryItem = () => {
    if (!activeCharacter || !newItem.nome.trim()) return;
    const baseItem = {
      id: editingInventoryId ?? Date.now(),
      nome: newItem.nome.trim(),
      name: newItem.nome.trim(),
      categoria: newItem.categoria,
      desc: newItem.desc.trim(),
      proficiente: newItem.proficiente,
    };

    let normalizedItem: InventoryItem;

    if (newItem.categoria === 'arma') {
      normalizedItem = {
        ...baseItem,
        tipo: 'Arma',
        atributo: newItem.atributo || undefined,
        ataque: newItem.ataque.trim(),
        dano: newItem.dano.trim(),
      };
    } else if (newItem.categoria === 'armadura') {
      normalizedItem = {
        ...baseItem,
        tipo: 'Armadura',
        tipoArmadura: newItem.tipoArmadura || undefined,
        caBase: newItem.caBase ? Number(newItem.caBase) : undefined,
      };
    } else if (newItem.categoria === 'consumivel') {
      normalizedItem = {
        ...baseItem,
        tipo: 'Consumível',
        quantidade: newItem.quantidade ? Number(newItem.quantidade) : 1,
        efeito: newItem.efeito.trim(),
      };
    } else {
      normalizedItem = {
        ...baseItem,
        tipo: newItem.tipo.trim() || 'Item',
      };
    }

    const currentInventory = activeCharacter.inventory ?? [];
    const nextInventory = editingInventoryId === null
      ? [...currentInventory, normalizedItem]
      : currentInventory.map((item) => item.id === editingInventoryId ? normalizedItem : item);

    updateCharacter('inventory', nextInventory);
    resetInventoryForm();
    setShowInventoryForm(false);
  };

  const removeInventoryItem = (id: number) => {
    if (!activeCharacter) return;
    updateCharacter('inventory', activeCharacter.inventory.filter((item) => item.id !== id));
  };

  const HealthBar = ({ current, max }: { current: number, max: number }) => {
    const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
    const color = percentage > 50 ? 'bg-[#00ff66]' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-600';
    return (
      <div className="w-full">
        <div className="flex justify-between text-[14px] font-black uppercase mb-1 text-[#4a5a4a]">
          <span>Pontos de Vida</span>
          <span>{current} / {max}</span>
        </div>
        <div className="w-full h-3 bg-black border border-[#1a2a1a] rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };
  const skillsData: Record<string, { name: string; attr: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' }> = {
    atletismo: { name: 'Atletismo', attr: 'str' }, acrobacia: { name: 'Acrobacia', attr: 'dex' }, furtividade: { name: 'Furtividade', attr: 'dex' },
    prestidigitacao: { name: 'Prestidigitação', attr: 'dex' }, arcanismo: { name: 'Arcanismo', attr: 'int' }, historia: { name: 'História', attr: 'int' },
    investigacao: { name: 'Investigação', attr: 'int' }, natureza: { name: 'Natureza', attr: 'int' }, religiao: { name: 'Religião', attr: 'int' },
    adestrarAnimais: { name: 'Adestrar Animais', attr: 'wis' }, intuicao: { name: 'Intuição', attr: 'wis' }, medicina: { name: 'Medicina', attr: 'wis' },
    percepcao: { name: 'Percepção', attr: 'wis' }, sobrevivencia: { name: 'Sobrevivência', attr: 'wis' }, atuacao: { name: 'Atuação', attr: 'cha' },
    enganacao: { name: 'Enganação', attr: 'cha' }, intimidacao: { name: 'Intimidação', attr: 'cha' }, persuasao: { name: 'Persuasão', attr: 'cha' },
  };

  const statLabels: Record<string, string> = { str: 'Força', dex: 'Destreza', con: 'Constituição', int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma' };

  const renderCharacterSheet = () => {
    if (!activeCharacter) return null;
    const raceInfo = RACE_DATA[activeCharacter.race];

    const handleCharacterImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => setTempCharacterImg(event.target?.result as string);
      reader.readAsDataURL(file);
    };

    return (
      <div className="space-y-0">
        {/* Modal de regras de raça */}
        {raceModalOpen && (() => {
          const race = activeCharacter.race;
          if (race === 'Meio-Elfo') {
            const options = (['str', 'dex', 'con', 'int', 'wis'] as const);
            const selected = Object.values(raceModalSelections).filter(Boolean);
            return (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                <div className="bg-[#050a05] border border-[#1a2a1a] rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <h3 className="text-[#f1e5ac] text-base font-black uppercase text-center">Meio-Elfo: Escolha 2 Atributos</h3>
                  <p className="text-[14px] text-[#4a5a4a] text-center uppercase">Selecione 2 atributos para receber +1 (exceto Carisma)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((s) => {
                      const isSelected = raceModalSelections[s] === s;
                      const selectedCount = Object.values(raceModalSelections).filter(Boolean).length;
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            if (isSelected) {
                              setRaceModalSelections((prev) => ({ ...prev, [s]: '' }));
                            } else if (selectedCount < 2) {
                              setRaceModalSelections((prev) => ({ ...prev, [s]: s }));
                            }
                          }}
                          className={`p-2 rounded border text-[14px] font-black uppercase transition-all ${isSelected ? 'bg-[#00ff66] text-black border-[#00ff66]' : 'bg-black/40 text-gray-300 border-[#1a2a1a] hover:border-[#00ff66]/50'}`}
                        >
                          {statLabels[s]}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={selected.length < 2}
                    onClick={() => {
                      const newStats = { ...activeCharacter.stats };
                      Object.values(raceModalSelections).filter(Boolean).forEach((s) => {
                        newStats[s as keyof typeof newStats] += 1;
                      });
                      updateCharacter('stats', newStats);
                      setRaceModalOpen(false);
                      setRaceModalSelections({});
                    }}
                    className="w-full bg-[#00ff66] text-black py-2 rounded-full text-base font-black uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            );
          }

          if (race === 'Humano (Variante)') {
            const options = (['str', 'dex', 'con', 'int', 'wis', 'cha'] as const);
            const selected = Object.values(raceModalSelections).filter(Boolean);
            return (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
                <div className="bg-[#050a05] border border-[#1a2a1a] rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <h3 className="text-[#f1e5ac] text-base font-black uppercase text-center">Humano (Variante): Escolha 2 Atributos</h3>
                  <p className="text-[14px] text-[#4a5a4a] text-center uppercase">Selecione 2 atributos diferentes para receber +1</p>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((s) => {
                      const isSelected = raceModalSelections[s] === s;
                      const selectedCount = Object.values(raceModalSelections).filter(Boolean).length;
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            if (isSelected) {
                              setRaceModalSelections((prev) => ({ ...prev, [s]: '' }));
                            } else if (selectedCount < 2) {
                              setRaceModalSelections((prev) => ({ ...prev, [s]: s }));
                            }
                          }}
                          className={`p-2 rounded border text-[14px] font-black uppercase transition-all ${isSelected ? 'bg-[#00ff66] text-black border-[#00ff66]' : 'bg-black/40 text-gray-300 border-[#1a2a1a] hover:border-[#00ff66]/50'}`}
                        >
                          {statLabels[s]}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={selected.length < 2}
                    onClick={() => {
                      const newStats = { ...activeCharacter.stats };
                      Object.values(raceModalSelections).filter(Boolean).forEach((s) => {
                        newStats[s as keyof typeof newStats] += 1;
                      });
                      updateCharacter('stats', newStats);
                      setRaceModalOpen(false);
                      setRaceModalSelections({});
                    }}
                    className="w-full bg-[#00ff66] text-black py-2 rounded-full text-base font-black uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })()}
        {/* Botões de navegação */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setActiveCharacter(null)}
            className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-base font-black transition-colors"
          >
            <ArrowLeft size={14} /> VOLTAR
          </button>
          <button
            onClick={() => saveToDatabase(activeCharacter)}
            className="flex items-center gap-2 bg-[#00ff66] text-black px-6 py-2 rounded-full text-base font-black uppercase tracking-widest hover:scale-105 transition-all"
            disabled={loadingAction}
          >
            <Save size={14} /> {loadingAction ? 'Salvando...' : 'Salvar Ficha'}
          </button>
        </div>

        <div className="mb-4 bg-[#050a05] border border-[#1a2a1a] rounded-xl p-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSheetView('ficha')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-black uppercase tracking-widest transition-all ${sheetView === 'ficha'
                ? 'bg-[#00ff66]/18 border-[#00ff66]/60 text-[#00ff66]'
                : 'bg-black/40 border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/30 hover:text-[#8a9a8a]'}`}
            >
              <ScrollText size={14} /> Ficha
            </button>
            <button
              type="button"
              onClick={() => setSheetView('grimorio')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-black uppercase tracking-widest transition-all ${sheetView === 'grimorio'
                ? 'bg-[#00ff66]/18 border-[#00ff66]/60 text-[#00ff66]'
                : 'bg-black/40 border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/30 hover:text-[#8a9a8a]'}`}
            >
              <BookOpen size={14} /> Grimório
            </button>
            <button
              type="button"
              onClick={() => setSheetView('inventario')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-black uppercase tracking-widest transition-all ${sheetView === 'inventario'
                ? 'bg-[#00ff66]/18 border-[#00ff66]/60 text-[#00ff66]'
                : 'bg-black/40 border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/30 hover:text-[#8a9a8a]'}`}
            >
              <Backpack size={14} /> Inventário
            </button>
          </div>
        </div>

        {sheetView === 'ficha' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUNA 1 - col-span-4 */}
            <div className="lg:col-span-4 space-y-4">
              {/* Foto */}
              <div className="bg-[#050a05] border border-[#1a2a1a] p-2 rounded-2xl flex flex-col items-center gap-1 w-fit mx-auto">
                <div
                  className="w-52 h-52 bg-black rounded-xl bg-cover border border-[#1a2a1a] cursor-pointer relative group"
                  style={{
                    backgroundImage: `url(${activeCharacter.img || '/placeholder.png'})`,
                    backgroundPosition: `${activeCharacter.imgOffsetX ?? 50}% ${activeCharacter.imgOffsetY ?? 50}%`
                  }}
                  onClick={() => { setTempCharacterImg(activeCharacter.img || ''); setTempOffsetX(activeCharacter.imgOffsetX ?? 50); setTempOffsetY(activeCharacter.imgOffsetY ?? 50); setShowFramingSliders(false); setEditingCharacterImg(true); }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-xl">
                    <span className="text-[12px] text-white font-black uppercase tracking-widest text-center px-2">Editar imagem</span>
                  </div>
                </div>
              </div>

              {/* Infos Básicas */}
              <div className="bg-black/60 border border-[#1a2a1a] p-4 rounded-xl grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">Nome</label>
                  <input
                    value={activeCharacter.name}
                    onChange={(e) => updateCharacter('name', e.target.value)}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-white text-center outline-none"
                    placeholder="Nome do Herói"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">Raça</label>
                  <select
                    value={activeCharacter.race ?? ''}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      updateCharacter('race', chosen);
                      if (chosen === 'Meio-Elfo' || chosen === 'Humano (Variante)') {
                        setRaceModalSelections({});
                        setRaceModalOpen(true);
                      }
                    }}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-white"
                  >
                    <option value="">Selecione...</option>
                    {Object.keys(RACE_DATA).map((race) => (
                      <option key={race} value={race}>{race}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">Classe</label>
                  <select
                    value={activeCharacter.class ?? ''}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      const classInfo = CLASS_DATA[chosen];
                      if (classInfo) {
                        const newSavingThrows = { str: false, dex: false, con: false, int: false, wis: false, cha: false };
                        classInfo.savingThrows.forEach((s) => { newSavingThrows[s as keyof typeof newSavingThrows] = true; });
                        const conMod = getModifier(activeCharacter.stats?.con ?? 10);
                        const newHp = classInfo.hp + conMod;
                        setActiveCharacter((prev) => prev ? {
                          ...prev,
                          class: chosen,
                          savingThrows: newSavingThrows,
                          hp_max: newHp,
                          hp_current: newHp,
                        } : prev);
                      } else {
                        updateCharacter('class', chosen);
                      }
                    }}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-white"
                  >
                    <option value="">Selecione...</option>
                    {Object.keys(CLASS_DATA).map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  {CLASS_DATA[activeCharacter.class] && (
                    <div className="mt-1 flex justify-between text-[12px] text-[#4a5a4a] font-black uppercase px-1">
                      <span> {CLASS_DATA[activeCharacter.class].hp} +con </span>
                      <span> {CLASS_DATA[activeCharacter.class].primaryAttr}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">Nível</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={activeCharacter.level ?? 1}
                    onChange={(e) => {
                      const nextValue = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                      const profBonus = Math.ceil(nextValue / 4) + 1;
                      setActiveCharacter((prev) => prev ? { ...prev, level: nextValue, proficiencyBonus: profBonus } : prev);
                    }}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-[#00ff66] font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">XP</label>
                  <input
                    type="number"
                    value={activeCharacter.experiencePoints ?? 0}
                    onChange={(e) => updateCharacter('experiencePoints', Number(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-[#f1e5ac] text-center"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">Alinhamento</label>
                  <input
                    value={activeCharacter.alignment ?? ''}
                    onChange={(e) => updateCharacter('alignment', e.target.value)}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[12px] text-[#4a5a4a] font-black uppercase">Antecedente</label>
                  <input
                    value={activeCharacter.background ?? ''}
                    onChange={(e) => updateCharacter('background', e.target.value)}
                    className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-white"
                  />
                </div>
              </div>

              {/* CA e Iniciativa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                  <Shield className="mx-auto text-[#00ff66] mb-1" size={18} />
                  <input
                    type="number"
                    value={activeCharacter.ac ?? 10}
                    onChange={(e) => updateCharacter('ac', Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-2xl font-black outline-none text-center"
                  />
                  <span className="text-[12px] text-[#4a5a4a] font-black uppercase">Classe de Armadura</span>
                </div>
                <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                  <Zap className="mx-auto text-[#f1e5ac] mb-1" size={18} />
                  <div className="text-2xl font-black">{getModifier(activeCharacter.stats?.dex ?? 10)}</div>
                  <span className="text-[12px] text-[#4a5a4a] font-black uppercase">Iniciativa</span>
                </div>
              </div>

              {/* HP */}
              <div className="bg-[#0a150a] border border-[#1a2a1a] rounded-xl p-4 space-y-3">
                <HealthBar current={activeCharacter.hp_current ?? 0} max={activeCharacter.hp_max ?? 1} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[12px] text-[#4a5a4a] font-black uppercase">HP Atual</label>
                    <input
                      type="number"
                      value={activeCharacter.hp_current ?? 0}
                      onChange={(e) => updateCharacter('hp_current', Number(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-[#00ff66] font-bold text-center outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#4a5a4a] font-black uppercase">HP Máximo</label>
                    <input
                      type="number"
                      value={activeCharacter.hp_max ?? 0}
                      onChange={(e) => updateCharacter('hp_max', Number(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-base rounded text-white text-center outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA 2 - col-span-5 */}
            <div className="lg:col-span-5 space-y-4">
              {/* Atributos */}
              <div className="grid grid-cols-3 gap-3">
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                  const mod = getModifier(activeCharacter.stats?.[s] ?? 10);
                  return (
                    <div key={s} className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center">
                      <span className="text-[13px] text-[#4a5a4a] font-black uppercase">{statLabels[s]}</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={activeCharacter.stats?.[s] ?? 10}
                        onChange={(e) => {
                          const nextValue = Math.floor(Number(e.target.value) || 0);
                          updateCharacter('stats', { ...activeCharacter.stats, [s]: Math.min(20, Math.max(0, nextValue)) });
                        }}
                        className="w-full bg-transparent text-center text-xl font-black outline-none text-white"
                      />
                      <div className="text-[#00ff66] text-base font-black mt-1">
                        {mod >= 0 ? '+' : ''}{mod}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Salvaguardas */}
              <div className="bg-black/40 border border-[#1a2a1a] p-4 rounded-xl">
                <h3 className="text-[13px] text-[#4a5a4a] font-black uppercase mb-3 flex items-center gap-2">
                  <ShieldAlert size={12} /> Salvaguardas
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => (
                    <div key={s} className="flex items-center justify-between border-b border-[#1a2a1a]/50 py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!activeCharacter.savingThrows?.[s]}
                          onChange={(e) =>
                            updateCharacter('savingThrows', {
                              ...activeCharacter.savingThrows,
                              [s]: e.target.checked,
                            })
                          }
                          className="accent-[#00ff66] w-3 h-3"
                        />
                        <span className="text-[14px] uppercase text-gray-300">{s}</span>
                      </div>
                      <span className="text-[14px] font-black text-[#00ff66]">
                        {(getModifier(activeCharacter.stats?.[s] ?? 10) +
                          (activeCharacter.savingThrows[s] ? activeCharacter.proficiencyBonus : 0)) >= 0 ? '+' : ''}
                        {getModifier(activeCharacter.stats?.[s] ?? 10) +
                          (activeCharacter.savingThrows[s] ? activeCharacter.proficiencyBonus : 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Habilidades (principal) */}
              <div className="bg-[#050a05] border border-[#1a2a1a] p-5 rounded-xl">
                <h3 className="text-[#f1e5ac] text-[14px] font-black uppercase mb-4 flex items-center gap-2">
                  <Sparkles size={14} /> Habilidades
                </h3>
                <div className="max-h-[200px] overflow-y-auto space-y-2 mb-4 pr-2">
                  {raceInfo?.traits && raceInfo.traits.split(', ').map((trait) => (
                    <div
                      key={trait}
                      className="bg-[#0a1a0a] p-2 rounded border border-[#1a2a1a]/60 flex justify-between items-center"
                    >
                      <span className="text-[14px] uppercase font-bold text-[#4a7a4a]">{trait}</span>
                      <span className="text-[12px] text-[#2a4a2a] font-black uppercase">Raça</span>
                    </div>
                  ))}

                  {activeCharacter.spells?.filter((s: any) => s.tipo !== 'Magia').map((ability: any) => {
                    const isExpanded = expandedSpellId === ability.id;
                    return (
                      <div key={ability.id} className="bg-black/60 p-2 rounded border border-[#1a2a1a] flex justify-between items-center group">
                        <div className="min-w-0 cursor-pointer" onClick={() => setExpandedSpellId(isExpanded ? null : ability.id)}>
                          <span className="text-[14px] uppercase font-bold text-gray-300 block truncate">{ability.name}</span>
                          {ability.level && <div className="text-[11px] text-gray-500 uppercase">{ability.level}</div>}
                          {isExpanded && ability.desc && <div className="text-[13px] text-gray-400 mt-2 whitespace-pre-line">{ability.desc}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setEditingSpellId(ability.id); setSpellForm({ name: ability.name ?? '', level: ability.level ?? '', desc: ability.desc ?? '', tipo: ability.tipo ?? 'Habilidade' }); setShowSpellForm(true); }}
                            className="text-gray-400 hover:text-white p-1"
                            title="Editar"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => updateCharacter('spells', activeCharacter.spells.filter((s: { id: number }) => s.id !== ability.id))}
                            className="text-red-900 group-hover:text-red-500 p-1"
                            title="Remover"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingSpellId(null); setSpellForm({ name: '', level: '', desc: '', tipo: 'Habilidade' }); setShowSpellForm(true); }}
                    className="w-6 h-6 rounded-md bg-[#f1e5ac] text-black flex items-center justify-center text-xs font-black transition-all hover:brightness-110 shadow-[0_0_8px_rgba(241,229,172,0.4)]"
                    title="Adicionar Habilidade/Magia"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
            {/* COLUNA 3 - col-span-3 — PERÍCIAS */}
            <div className="lg:col-span-3">
              <div className="bg-black border border-[#1a2a1a] p-4 rounded-xl h-full">
                <h3 className="text-[#f1e5ac] text-[14px] font-black uppercase mb-4 text-center">Perícias</h3>
                <div className="space-y-1 overflow-y-auto pr-2">
                  {Object.entries(skillsData).map(([key, info]) => {
                    const mod = getModifier(activeCharacter.stats[info.attr]);
                    const total = mod + (activeCharacter.skills[key] ? activeCharacter.proficiencyBonus : 0);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-black/40 p-2 rounded border border-[#1a2a1a] hover:border-[#00ff66]/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!activeCharacter.skills?.[key]}
                            onChange={(e) =>
                              updateCharacter('skills', {
                                ...activeCharacter.skills,
                                [key]: e.target.checked,
                              })
                            }
                            className="accent-[#00ff66] w-3 h-3"
                          />
                          <span className="text-[13px] uppercase text-gray-300">{info.name} <span className="text-gray-500">({info.attr})</span></span>
                        </div>
                        <span className="text-[14px] font-black text-[#00ff66]">{total >= 0 ? '+' : ''}{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : sheetView === 'grimorio' ? (
          <CharacterGrimorioPanel
            characterId={activeCharacter.id}
            onSaved={async (spells) => {
              const normalizedSpells = spells.map((spell, index) => ({
                id: typeof spell.id === 'number' ? spell.id : Number(spell.id ?? index + 1),
                name: spell.name ?? 'Sem nome',
                level: spell.level ?? '0',
              }));
              setActiveCharacter((prev) => prev ? { ...prev, spells: normalizedSpells } : prev);
              await fetchCharacters();
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* DINHEIRO */}
            <div className="bg-[#050a05] border border-[#1a2a1a] rounded-xl p-4">
              <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase mb-3 flex items-center gap-2">
                <Coins size={14} className="text-[#f1e5ac]" /> Dinheiro
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {([
                  { key: 'pl', label: 'PL', color: 'text-[#e5e4e2] border-[#e5e4e2]/30 bg-[#e5e4e2]/5', badge: 'Platina', title: '1 PL = 10 PO' },
                  { key: 'po', label: 'PO', color: 'text-[#f1e5ac] border-[#f1e5ac]/30 bg-[#f1e5ac]/5', badge: 'Ouro', title: '1 PO = 10 PP' },
                  { key: 'pp', label: 'PP', color: 'text-[#c0c0c0] border-[#c0c0c0]/30 bg-[#c0c0c0]/5', badge: 'Prata', title: '1 PP = 10 PC' },
                  { key: 'pc', label: 'PC', color: 'text-[#b87333] border-[#b87333]/30 bg-[#b87333]/5', badge: 'Cobre', title: 'Menor unidade' },
                ] as const).map(({ key, label, color, badge, title }) => (
                  <div key={key} title={title} className={`flex flex-col items-center border rounded-xl p-3 ${color}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{badge}</span>
                    <span className="text-lg font-black mb-1">{label}</span>
                    <input
                      type="number"
                      min={0}
                      value={activeCharacter.currency?.[key] ?? 0}
                      onChange={(e) => updateCharacter('currency', { ...(activeCharacter.currency ?? { pl: 0, po: 0, pp: 0, pc: 0 }), [key]: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-center text-lg font-black outline-none focus:border-[#00ff66]/40 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* INVENTÁRIO */}
            <div className="bg-[#050a05] border border-[#1a2a1a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#00ff66] text-[13px] font-black uppercase flex items-center gap-2">
                  <Backpack size={13} /> Inventário
                  {activeCharacter.inventory?.length > 0 && (
                    <span className="bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] px-1.5 rounded text-[10px] font-black">{activeCharacter.inventory.length}</span>
                  )}
                </h3>
                <button
                  onClick={() => setShowInventoryForm(true)}
                  className="w-7 h-7 rounded-md bg-[#00ff66] text-black flex items-center justify-center text-base font-black transition-all hover:brightness-110 shadow-[0_0_8px_rgba(0,255,102,0.5)]"
                  title="Adicionar item"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Lista de itens */}
              <div className="space-y-1.5">
                {activeCharacter.inventory?.length ? activeCharacter.inventory.map((item: InventoryItem) => {
                  const isExpanded = expandedItemId === item.id;
                  const cat = item.categoria || 'item';
                  return (
                    <div key={item.id} className="bg-black/40 rounded-lg border border-[#1a2a1a] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                          <div className="flex items-center gap-2">
                            {categoriaIcons[cat]}
                            <span className="text-[14px] font-black uppercase text-gray-200 truncate">{item.nome || item.name || 'Item sem nome'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] uppercase text-gray-500 ml-5">{item.tipo || item.categoria || 'Item'}</span>
                            {item.categoria === 'consumivel' && item.quantidade !== undefined && (
                              <span className="bg-purple-900/40 border border-purple-800/40 text-purple-300 px-1.5 rounded text-[10px] font-black">x{item.quantidade}</span>
                            )}
                            {item.categoria === 'armadura' && item.caBase !== undefined && (
                              <span className="bg-blue-900/40 border border-blue-800/40 text-blue-300 px-1.5 rounded text-[10px] font-black">CA {item.caBase}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/40 hover:text-[#00ff66] transition-all shrink-0"
                        >
                          <ChevronDown size={12} className={`transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                      </div>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-80' : 'max-h-0'}`}>
                        <div className="space-y-2 border-t border-[#1a2a1a] p-3 bg-black/20">
                          {item.atributo && <span className="inline-block bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 py-0.5 rounded text-[11px] font-black uppercase">{weaponAttributeLabels[item.atributo]}</span>}
                          {item.categoria === 'armadura' && (item.tipoArmadura || item.caBase !== undefined) && (
                            <div className="flex flex-wrap gap-1.5">
                              {item.tipoArmadura && <span className="bg-blue-900/30 border border-blue-800/40 text-blue-300 px-2 py-0.5 rounded text-[11px] font-black uppercase">{item.tipoArmadura}</span>}
                              {item.caBase !== undefined && <span className="bg-blue-900/30 border border-blue-800/40 text-blue-300 px-2 py-0.5 rounded text-[11px] font-black uppercase">CA base: {item.caBase}</span>}
                            </div>
                          )}
                          {item.categoria === 'consumivel' && item.efeito && <span className="inline-block bg-purple-900/30 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded text-[11px] font-black">Efeito: {item.efeito}</span>}
                          {item.desc && <p className="text-[13px] text-gray-400 leading-relaxed">{item.desc}</p>}
                          <div className="flex justify-end gap-3 pt-1">
                            <button onClick={() => startEditingInventoryItem(item)} className="flex items-center gap-1 text-[#00ff66] text-[12px] font-bold uppercase hover:text-white transition-colors"><Pencil size={12} /> Editar</button>
                            <button onClick={() => removeInventoryItem(item.id)} className="flex items-center gap-1 text-red-500/70 text-[12px] font-bold uppercase hover:text-red-400 transition-colors"><Trash2 size={12} /> Excluir</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-[13px] text-[#4a5a4a] py-3 text-center">Inventário vazio.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Popup unificado: trocar imagem + enquadramento */}
        {editingCharacterImg && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
            onClick={(e) => e.target === e.currentTarget && setEditingCharacterImg(false)}
          >
            <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-96 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              <h3 className="text-[#f1e5ac] text-base font-black uppercase text-center tracking-widest">Imagem do Personagem</h3>

              {/* Preview */}
              {(tempCharacterImg || activeCharacter.img) && (
                <div
                  className="w-full h-44 rounded-xl border border-[#1a2a1a] bg-cover"
                  style={{
                    backgroundImage: `url(${tempCharacterImg || activeCharacter.img})`,
                    backgroundPosition: `${tempOffsetX}% ${tempOffsetY}%`
                  }}
                />
              )}

              {/* Upload */}
              <div>
                <label className="block text-[#4a5a4a] text-[14px] font-black uppercase tracking-widest mb-1">Ou faça upload</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCharacterImageFileChange}
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-2 px-3 text-white text-base focus:outline-none focus:border-[#00ff66] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-base file:font-black file:bg-[#00ff66] file:text-black cursor-pointer"
                />
              </div>

              {/* Botão enquadramento */}
              <button
                type="button"
                onClick={() => setShowFramingSliders((v) => !v)}
                className="w-full border border-[#1a2a1a] text-[#4a5a4a] hover:text-[#00ff66] hover:border-[#00ff66]/40 text-[14px] font-black uppercase py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ChevronDown size={12} className={`${showFramingSliders ? 'rotate-180' : 'rotate-0'} transition-transform`} />
                {showFramingSliders ? 'Ocultar enquadramento' : 'Ajustar enquadramento'}
              </button>

              {/* Sliders (condicional) */}
              {showFramingSliders && (
                <div className="space-y-3 border border-[#1a2a1a] rounded-xl p-3">
                  <div>
                    <label className="block text-[#4a5a4a] text-[14px] font-black uppercase tracking-widest mb-1">Horizontal ({tempOffsetX}%)</label>
                    <input type="range" min={0} max={100} value={tempOffsetX} onChange={(e) => setTempOffsetX(Number(e.target.value))} className="w-full accent-[#00ff66] cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-[#4a5a4a] text-[14px] font-black uppercase tracking-widest mb-1">Vertical ({tempOffsetY}%)</label>
                    <input type="range" min={0} max={100} value={tempOffsetY} onChange={(e) => setTempOffsetY(Number(e.target.value))} className="w-full accent-[#00ff66] cursor-pointer" />
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingCharacterImg(false)}
                  className="flex-1 border border-[#1a2a1a] text-[#4a5a4a] text-[14px] font-black uppercase py-2 rounded-lg hover:border-[#00ff66]/40 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const updated = { ...activeCharacter, img: tempCharacterImg || activeCharacter.img, imgOffsetX: tempOffsetX, imgOffsetY: tempOffsetY };
                    setActiveCharacter(updated);
                    setEditingCharacterImg(false);
                    await saveToDatabase(updated);
                  }}
                  className="flex-1 bg-[#00ff66] text-black text-[14px] font-black uppercase py-2 rounded-lg hover:brightness-110 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE ADICIONAR/EDITAR ITEM (POPUP) */}
              {showInventoryForm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80" onClick={(e) => e.target === e.currentTarget && setShowInventoryForm(false)}>
            <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-5 w-[450px] max-w-[90vw] space-y-3 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
              <div className="flex justify-between items-center border-b border-[#1a2a1a] pb-2">
                <h3 className="text-[#f1e5ac] text-sm font-black uppercase tracking-widest">
                  {editingInventoryId !== null ? 'Editar Item' : 'Adicionar Item'}
                </h3>
                <button onClick={() => { resetInventoryForm(); setShowInventoryForm(false); }} className="text-[#4a5a4a] hover:text-red-400 transition-colors text-lg">&times;</button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(CATEGORIA_LABELS) as ItemCategoria[]).map((cat) => (
                  <button key={cat} onClick={() => setNewItem(prev => ({ ...prev, categoria: cat }))} className={`text-[10px] font-black uppercase py-1.5 rounded border transition-all ${newItem.categoria === cat ? 'bg-[#00ff66]/20 border-[#00ff66]/60 text-[#00ff66]' : 'bg-black/40 border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/30'}`}>
                    {CATEGORIA_LABELS[cat]}
                  </button>
                ))}
              </div>

              <input className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors" placeholder={newItem.categoria === 'arma' ? 'Nome da arma' : newItem.categoria === 'armadura' ? 'Nome da armadura' : newItem.categoria === 'consumivel' ? 'Nome do consumível' : 'Nome do item'} value={newItem.nome} onChange={(e) => setNewItem(prev => ({ ...prev, nome: e.target.value }))} />

              {newItem.categoria === 'arma' && (
                <>
                  <div className="flex items-center gap-2 mb-1 mt-2">
                    <input type="checkbox" id="proficiente_inv" checked={newItem.proficiente} onChange={(e) => setNewItem(prev => ({ ...prev, proficiente: e.target.checked }))} className="accent-[#00ff66] w-4 h-4 cursor-pointer" />
                    <label htmlFor="proficiente_inv" className="text-[11px] text-[#4a5a4a] font-black uppercase tracking-widest cursor-pointer">Proficiente com esta arma</label>
                  </div>
                  <select className="w-full bg-[#050a05] border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors cursor-pointer" value={newItem.atributo} onChange={(e) => setNewItem(prev => ({ ...prev, atributo: e.target.value as WeaponAttribute }))}>
                    <option value="">Sem atributo</option>
                    {WEAPON_ATTRIBUTE_OPTIONS.map((opt) => <option key={opt} value={opt}>{weaponAttributeLabels[opt]}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50" placeholder="ATK (ex: 1d20+3)" value={newItem.ataque} onChange={(e) => setNewItem(prev => ({ ...prev, ataque: e.target.value }))} />
                    <input className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50" placeholder="DANO (ex: 1d8+3)" value={newItem.dano} onChange={(e) => setNewItem(prev => ({ ...prev, dano: e.target.value }))} />
                  </div>
                </>
              )}

              {newItem.categoria === 'armadura' && (
                <div className="grid grid-cols-2 gap-2">
                  <select className="w-full bg-[#050a05] border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none cursor-pointer" value={newItem.tipoArmadura} onChange={(e) => setNewItem(prev => ({ ...prev, tipoArmadura: e.target.value }))}>
                    <option value="">Tipo de armadura</option>
                    {TIPO_ARMADURA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <input type="number" min={0} className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-[#00ff66] font-bold text-center outline-none" placeholder="CA base" value={newItem.caBase} onChange={(e) => setNewItem(prev => ({ ...prev, caBase: e.target.value }))} />
                </div>
              )}

              {newItem.categoria === 'consumivel' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={1} className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-[#00ff66] font-bold text-center outline-none" placeholder="Qtd" value={newItem.quantidade} onChange={(e) => setNewItem(prev => ({ ...prev, quantidade: e.target.value }))} />
                  <input className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none" placeholder="Efeito (ex: Cura 2d4+2)" value={newItem.efeito} onChange={(e) => setNewItem(prev => ({ ...prev, efeito: e.target.value }))} />
                </div>
              )}

              {newItem.categoria === 'item' && (
                <input className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none" placeholder="Subtipo (ex: Ferramenta, Chave, Joia...)" value={newItem.tipo} onChange={(e) => setNewItem(prev => ({ ...prev, tipo: e.target.value }))} />
              )}

              <textarea className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1.5 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 h-14 resize-none transition-colors" placeholder="Descrição (opcional)" value={newItem.desc} onChange={(e) => setNewItem(prev => ({ ...prev, desc: e.target.value }))} />

              <div className="flex gap-2">
                <button
                  onClick={saveInventoryItem}
                  className="flex-1 bg-[#00ff66] text-black px-2 py-1.5 rounded hover:brightness-110 transition-colors text-[12px] font-black uppercase"
                >
                  {editingInventoryId !== null ? 'Salvar edição' : 'Adicionar'}
                </button>
                <button onClick={() => { resetInventoryForm(); setShowInventoryForm(false); }} className="bg-black/40 border border-[#1a2a1a] text-[#4a5a4a] px-4 rounded hover:border-[#00ff66]/40 transition-colors text-[12px] font-black uppercase">Cancelar</button>
              </div>
            </div>
          </div>
        )}
              {/* POPUP ADICIONAR/EDITAR HABILIDADE */}
              {showSpellForm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={(e) => e.target === e.currentTarget && setShowSpellForm(false)}>
                  <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-full max-w-[600px] shadow-[0_0_50px_rgba(0,0,0,0.95)] space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
                    <h3 className="text-[#f1e5ac] text-sm font-black uppercase tracking-widest text-center shrink-0">
                      {editingSpellId !== null ? 'Editar Habilidade' : 'Nova Habilidade'}
                    </h3>
                    <div className="space-y-3 flex-1 flex flex-col min-h-0">
                      <div className="shrink-0">
                        <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Nome</label>
                        <input type="text" className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-white rounded" value={spellForm.name} onChange={(e) => setSpellForm(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="shrink-0">
                        <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Nível / Custo</label>
                        <input type="text" className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-white rounded" value={spellForm.level} onChange={(e) => setSpellForm(prev => ({ ...prev, level: e.target.value }))} />
                      </div>
                      <div className="flex-1 flex flex-col min-h-[150px]">
                        <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1 shrink-0">Descrição</label>
                        <textarea className="w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-white rounded resize-y flex-1 min-h-[100px]" value={spellForm.desc} onChange={(e) => setSpellForm(prev => ({ ...prev, desc: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 shrink-0">
                      <button onClick={() => { setShowSpellForm(false); setEditingSpellId(null); setSpellForm({ name: '', level: '', desc: '', tipo: 'Habilidade' }); }} className="flex-1 bg-transparent border border-[#1a2a1a] text-[#4a5a4a] hover:text-white uppercase text-[11px] font-black tracking-widest py-2 rounded-xl">Cancelar</button>
                      <button onClick={() => {
                        if (!spellForm.name.trim()) return;
                        if (editingSpellId !== null) {
                          const updated = activeCharacter.spells.map((s: any) => s.id === editingSpellId ? { ...s, name: spellForm.name.trim(), level: spellForm.level.trim(), desc: spellForm.desc?.trim(), tipo: spellForm.tipo ?? 'Habilidade' } : s);
                          updateCharacter('spells', updated);
                        } else {
                          const payload = { id: Date.now(), name: spellForm.name.trim(), level: spellForm.level.trim(), desc: spellForm.desc?.trim(), tipo: spellForm.tipo ?? 'Habilidade' };
                          updateCharacter('spells', [...(activeCharacter.spells ?? []), payload]);
                        }
                        setShowSpellForm(false);
                        setEditingSpellId(null);
                        setSpellForm({ name: '', level: '', desc: '', tipo: 'Habilidade' });
                      }} className="flex-1 bg-[#f1e5ac] text-black uppercase text-[11px] font-black tracking-widest py-2 rounded-xl">Salvar</button>
                    </div>
                  </div>
                </div>
              )}
      </div>
    );
  };

  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-black text-[#00ff66] font-black uppercase">Sincronizando com a Névoa...</div>;
  if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-black text-red-500 font-black">Acesso negado. Faça login.</div>;

  return (
    <>
      <div className="min-h-screen bg-[#020502]">
        <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
        <div className={`${activeCharacter ? 'max-w-[1400px]' : 'max-w-[1000px]'} mx-auto py-12 px-6`}>
          {!activeCharacter ? (
            <div>
              <h2 className="text-[#f1e5ac] text-2xl font-serif mb-10 tracking-[0.2em] uppercase italic">Grimório de Heróis</h2>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[#4a5a4a] text-base font-black uppercase tracking-[0.2em]">Personagens: {characters.length}</h3>
                  <button onClick={createCharacter} className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[14px] font-black uppercase hover:brightness-110 transition-all">
                    <Plus size={14} /> Criar Novo
                  </button>
                </div>
                {characters.length === 0 ? (
                  <div className="text-center text-[#8a9a8a] text-base py-20 border border-dashed border-[#1a2a1a] rounded-2xl">Nenhum personagem encontrado na taverna.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {characters.map((char) => (
                      <Card
                        key={char.id ?? Math.random()} 
                        id={char.id!} 
                        title={char.name ?? 'Herói Sem Nome'} 
                        subtitle={`${char.class ?? 'Sem Classe'} • Nível ${char.level ?? 1}`}
                        metaLeft={{ icon: 'hp', label: `${char.hp_current ?? 0}/${char.hp_max ?? 0}` }}
                        metaRight={{ icon: 'ca', label: `${char.ac ?? 10}` }}
                        showMetaDivider={false} 
                        metaLarge 
                        image={char.img}
                        dropdownOpen={dropdownOpen === String(char.id)}
                        onDropdownToggle={() => setDropdownOpen((prev) => prev === String(char.id) ? null : String(char.id))}
                        dropdownRef={dropdownRef} 
                        onDelete={() => { 
                          setDropdownOpen(null); 
                          if (char.id) setConfirmDeleteId(char.id); 
                        }}
                        onAccess={() => { 
                          setDropdownOpen(null); 
                          if (char.id != null) openCharacter(char.id); 
                        }}
                        accessLabel="Acessar" 
                        deleteLabel="Excluir"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : renderCharacterSheet()}
        </div>
        <Footer />
      </div>

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
          <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-80 flex flex-col gap-5">
            <h3 className="text-white text-base font-black uppercase text-center tracking-widest">Excluir personagem?</h3>
            <p className="text-[#4a5a4a] text-[14px] text-center uppercase">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-[#1a2a1a] text-[#4a5a4a] text-[14px] font-black uppercase py-2 rounded-lg">
                Cancelar
              </button>
              <button type="button" onClick={() => deleteCharacter(confirmDeleteId)}
                className="flex-1 bg-red-600 text-white text-[14px] font-black uppercase py-2 rounded-lg">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}