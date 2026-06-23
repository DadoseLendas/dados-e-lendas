'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { ActiveEffect } from '@/features/mesa/utils/character-effects';
import { setCharacterEffects } from '@/features/mesa/services/mesa-service';
import SpellModal from '@/features/spells/components/spell-modal';
import {
    ArrowLeft, Shield, ShieldAlert, Sparkles, Save, Trash2, Pencil, Sword, ShieldHalf, FlaskConical, Backpack, BookOpen, Wand2, Eye, EyeOff, Plus, X
} from 'lucide-react';

// ─── Dados estáticos (espelho de personagens/page.tsx) ────────────────────────
const RACE_DATA: Record<string, { stats: Record<string, number>; traits: string }> = {
    "Anão": { stats: { con: 2 }, traits: "Visão no Escuro, Resiliência Anã, Treino de Combate Anão, Proficiência com ferramentas, Talento Com Pedra" },
    "Elfo": { stats: { dex: 2 }, traits: "Visão no Escuro, Sentidos Apurados, Ascendência Fey, Transe" },
    "Draconato": { stats: { str: 2, cha: 1 }, traits: "Ancestralidade Draconiana, Arma de Bafo, Resistência a Danos" },
    "Gnomo": { stats: { int: 2 }, traits: "Visão no escuro, Astúcia dos Gnomos" },
    "Tiefling": { stats: { int: 1, cha: 2 }, traits: "Visão no escuro, Resistência infernal, Legado infernal" },
    "Halfling": { stats: { dex: 2 }, traits: "Sortudo, Corajoso, Agilidade de Halfling" },
    "Humano": { stats: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, traits: "Proficiência em 1 skill à escolha" },
    "Humano (Variante)": { stats: {}, traits: "1 Talento à escolha, Proficiência em 1 skill" },
    "Meio-Elfo": { stats: { cha: 2 }, traits: "Visão no Escuro, Ascendência Fey, Versatilidade em Skills" },
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
    "Guardião": { hp: 10, primaryAttr: "Destreza & Sabedoria", savingThrows: ["str", "dex"] },
    "Guerreiro": { hp: 10, primaryAttr: "Força ou Destreza", savingThrows: ["str", "con"] },
    "Ladino": { hp: 8, primaryAttr: "Destreza", savingThrows: ["dex", "int"] },
    "Mago": { hp: 6, primaryAttr: "Inteligência", savingThrows: ["int", "wis"] },
    "Monge": { hp: 8, primaryAttr: "Destreza & Sabedoria", savingThrows: ["str", "dex"] },
    "Paladino": { hp: 10, primaryAttr: "Força & Carisma", savingThrows: ["wis", "cha"] },
};

const skillsData: Record<string, { name: string; attr: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' }> = {
    atletismo: { name: 'Atletismo', attr: 'str' },
    acrobacia: { name: 'Acrobacia', attr: 'dex' },
    furtividade: { name: 'Furtividade', attr: 'dex' },
    prestidigitacao: { name: 'Prestidigitação', attr: 'dex' },
    arcanismo: { name: 'Arcanismo', attr: 'int' },
    historia: { name: 'História', attr: 'int' },
    investigacao: { name: 'Investigação', attr: 'int' },
    natureza: { name: 'Natureza', attr: 'int' },
    religiao: { name: 'Religião', attr: 'int' },
    adestrarAnimais: { name: 'Adestrar Animais', attr: 'wis' },
    intuicao: { name: 'Intuição', attr: 'wis' },
    medicina: { name: 'Medicina', attr: 'wis' },
    percepcao: { name: 'Percepção', attr: 'wis' },
    sobrevivencia: { name: 'Sobrevivência', attr: 'wis' },
    atuacao: { name: 'Atuação', attr: 'cha' },
    enganacao: { name: 'Enganação', attr: 'cha' },
    intimidacao: { name: 'Intimidação', attr: 'cha' },
    persuasao: { name: 'Persuasão', attr: 'cha' },
};

const statLabels: Record<string, string> = {
    str: 'Força', dex: 'Destreza', con: 'Constituição',
    int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma',
};

const WEAPON_ATTRIBUTE_OPTIONS = ['str', 'dex'] as const;
type WeaponAttribute = (typeof WEAPON_ATTRIBUTE_OPTIONS)[number];

const weaponAttributeLabels: Record<WeaponAttribute, string> = {
    str: 'Força',
    dex: 'Destreza',
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

const getModifier = (value: number) => {
    const normalizedValue = Math.floor(Number(value) || 0);
    return Math.floor((normalizedValue - 10) / 2);
};
const fmtMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

// Bônus de proficiência derivado do nível (D&D 5e):
// nv 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6.
const proficiencyByLevel = (level: number) => {
    const lv = Math.min(Math.max(Math.floor(Number(level)) || 1, 1), 20);
    return Math.ceil(lv / 4) + 1;
};

// Atributo de conjuração por classe (CD de Magia = 8 + proficiência + mod do atributo).
// Classes não listadas não exibem CD de magia (sem conjuração).
// Guerreiro/Cavaleiro Arcano e Ladino/Trapaceiro Arcano foram desconsiderados (Notion).
const SPELL_ATTR_BY_CLASS: Record<string, 'int' | 'wis' | 'cha'> = {
    'Bardo': 'cha', 'Bruxo': 'cha', 'Feiticeiro': 'cha', 'Paladino': 'cha',
    'Clérigo': 'wis', 'Druida': 'wis', 'Guardião': 'wis',
    'Mago': 'int',
};

// Fallback local: usado quando o motor 3D de dados não responde
// (ex.: assets offline). Garante que a rolagem ainda aconteça e chegue ao chat.
const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;

const localD20Roll = (mode: 'normal' | 'advantage' | 'disadvantage') => {
    if (mode === 'normal') {
        const v = rollDie(20);
        return { finalValue: v, values: [v], diceType: 'd20' };
    }
    const v1 = rollDie(20);
    const v2 = rollDie(20);
    const finalValue = mode === 'advantage' ? Math.max(v1, v2) : Math.min(v1, v2);
    return { finalValue, values: [v1, v2], diceType: 'd20' };
};

const localFormulaRoll = (formula: string) => {
    const cleaned = formula.toLowerCase().replace(/\s+/g, '');
    const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) return null;
    const qtd = match[1] ? parseInt(match[1]) : 1;
    const faces = parseInt(match[2]);
    const mod = match[3] ? parseInt(match[3]) : 0;
    const values: number[] = [];
    for (let i = 0; i < qtd; i++) values.push(rollDie(faces));
    const finalValue = values.reduce((a, b) => a + b, 0) + mod;
    return { finalValue, values, diceType: `d${faces}` };
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
    active_effects?: ActiveEffect[];
    stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    savingThrows: Record<string, boolean>;
    skills: Record<string, boolean>;
    inventory: InventoryItem[];
    spells: { id: number; name: string; level?: string; tipo?: string; desc?: string }[];
    img: string;
    currency?: { pl: number; po: number; pp: number; pc: number };
    imgOffsetX?: number;
    imgOffsetY?: number;
};

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

const EMPTY_FORM: InventoryFormState = {
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

type SpellFormState = {
    name: string;
    level: string;
    tipo: string;
    desc: string;
};

const EMPTY_SPELL_FORM: SpellFormState = {
    name: '',
    level: '',
    tipo: 'Magia',
    desc: '',
};

interface FichaModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: number | string | null;
    onUpdate?: (character: Character) => void;
    campaignId: string;
    onRollDice: (diceType: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage') => Promise<unknown | null>;
    readOnly?: boolean;
}

const categoriaIcons: Record<ItemCategoria, React.ReactNode> = {
    arma: <Sword size={14} className="text-[#00ff66]" />,
    armadura: <Shield size={14} className="text-[#4a9eff]" />,
    consumivel: <FlaskConical size={14} className="text-[#e5acff]" />,
    item: <Backpack size={14} className="text-[#f1e5ac]" />,
};

export default function FichaModal({ isOpen, onClose, characterId, onUpdate, campaignId, onRollDice, readOnly = false }: FichaModalProps) {
    const supabase = useMemo(() => createClient(), []);
    const [draft, setDraft] = useState<Character | null>(null);
    const [initialChar, setInitialChar] = useState<Character | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [newInventoryItem, setNewInventoryItem] = useState<InventoryFormState>(EMPTY_FORM);
    const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
    
    // Estados para o Pop-up de Habilidades
    const [newSpellItem, setNewSpellItem] = useState<SpellFormState>(EMPTY_SPELL_FORM);
    const [editingSpellId, setEditingSpellId] = useState<number | null>(null);
    const [showSpellForm, setShowSpellForm] = useState(false);

    const [currentUserName, setCurrentUserName] = useState('Aventureiro');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
    const [expandedSpellId, setExpandedSpellId] = useState<number | null>(null);
    const [showInventoryForm, setShowInventoryForm] = useState(false);
    const [rollPopup, setRollPopup] = useState<{ label: string; modifier: number; isSecret: boolean } | null>(null);

    const [showSpellModal, setShowSpellModal] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);
            setCurrentUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Aventureiro');
        };
        fetchUser();
    }, [supabase]);

    const rollD20 = (label: string, modifier: number) => {
        if (readOnly) return; // mestre em modo visualização não rola pelo jogador
        setRollPopup({ label, modifier, isSecret: false });
    };

    const executeRoll = async (mode: 'normal' | 'advantage' | 'disadvantage') => {
        if (!rollPopup) return;
        const { label, modifier, isSecret } = rollPopup;
        setRollPopup(null);

        let result = await onRollDice('d20', isSecret, mode);
        if (!result) {
            // Motor 3D indisponível → rola localmente para não travar a ficha
            result = localD20Roll(mode);
        }

        const res = result as { finalValue: number; values: number[]; diceType: string };
        const total = res.finalValue + modifier;
        const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;

        let textPublico = '';
        if (mode === 'normal' || res.values.length < 2) {
            textPublico = `rolou ${label} (d20${modStr}): **${total}**`;
        } else {
            const v1 = res.values[0];
            const v2 = res.values[1];
            const isV1Chosen = mode === 'advantage' ? v1 >= v2 : v1 <= v2;
            const res1 = v1 + modifier;
            const res2 = v2 + modifier;
            const str1 = isV1Chosen ? `**${v1}${modStr}=${res1}**` : `${v1}${modStr}=${res1}`;
            const str2 = !isV1Chosen ? `**${v2}${modStr}=${res2}**` : `${v2}${modStr}=${res2}`;
            const modoTexto = mode === 'advantage' ? 'Vantagem' : 'Desvantagem';
            textPublico = `rolou ${label} (d20${modStr}) com ${modoTexto}, dado 1: ${str1}, dado 2: ${str2}, resultado **${total}**`;
        }

        if (currentUserId) {
            await supabase.from('chat_messages').insert([{
                campaign_id: campaignId,
                user_name: currentUserName,
                text: textPublico,
                is_roll: true,
                is_secret: isSecret,
                channel: 'campanha',
                sender_id: currentUserId,
                dice_type: res.diceType || 'd20',
                roll_mode: mode,
                roll_values: res.values,
                final_value: total
            }]);
        }
    };

    const buildWeaponFormula = (formula: string, attribute?: WeaponAttribute, isProficient?: boolean) => {
        const cleaned = formula.toLowerCase().replace(/\s+/g, '');
        const normalized = cleaned || '1d20';
        const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);
        if (!match) return null;

        const quantity = match[1] ? parseInt(match[1]) : 1;
        const faces = parseInt(match[2]);
        const baseModifier = match[3] ? parseInt(match[3]) : 0;
        const attributeModifier = attribute ? getModifier(draft?.stats?.[attribute] ?? 0) : 0;
        const profBonus = isProficient ? proficiencyByLevel(draft?.level ?? 1) : 0;
        const totalModifier = baseModifier + attributeModifier + profBonus;

        return `${quantity}d${faces}${totalModifier !== 0 ? (totalModifier > 0 ? `+${totalModifier}` : `${totalModifier}`) : ''}`;
    };

    const rollWeaponFormula = async (itemName: string, formula: string, label: 'ataque' | 'dano' | 'efeito', attribute?: WeaponAttribute, isProficient?: boolean) => {
        if (readOnly) return; // mestre em modo visualização não rola pelo jogador
        const resolvedFormula = buildWeaponFormula(formula, attribute, isProficient);
        if (!resolvedFormula) {
            alert('Fórmula inválida. Use algo como 1d20+5, 2d6+3 ou d20.');
            return;
        }

        let rawResult = await onRollDice(resolvedFormula, false, 'normal');
        if (rawResult === null || rawResult === undefined) {
            // Motor 3D indisponível → rola localmente
            rawResult = localFormulaRoll(resolvedFormula);
        }
        if (rawResult === null) return;
        const finalValue: number = typeof rawResult === 'object' && rawResult !== null 
            ? Number((rawResult as { finalValue: number }).finalValue) 
            : Number(rawResult);
        if (currentUserId) {
            await supabase.from('chat_messages').insert([{
                campaign_id: campaignId,
                user_name: currentUserName,
                text: `${currentUserName} rolou ${label === 'efeito' ? 'efeito do item' : `${label} da arma`} ${itemName}: ${resolvedFormula} = ${finalValue}`,
                is_roll: true,
                is_secret: false,
                channel: 'campanha',
                sender_id: currentUserId,
            }]);
        }
    };

    const [framingOpen, setFramingOpen] = useState(false);
    const [tempOffsetX, setTempOffsetX] = useState(50);
    const [tempOffsetY, setTempOffsetY] = useState(50);
    const [savingFrame, setSavingFrame] = useState(false);

    const openFraming = () => {
        setTempOffsetX(draft?.imgOffsetX ?? 50);
        setTempOffsetY(draft?.imgOffsetY ?? 50);
        setFramingOpen(true);
    };

    const saveFraming = async () => {
        if (!draft) return;
        setSavingFrame(true);
        await supabase.from('characters').update({ imgOffsetX: tempOffsetX, imgOffsetY: tempOffsetY }).eq('id', draft.id);
        const updated = { ...draft, imgOffsetX: tempOffsetX, imgOffsetY: tempOffsetY };
        setDraft(updated);
        onUpdate?.(updated);
        setSavingFrame(false);
        setFramingOpen(false);
    };

    const updateDraft = (field: string, value: unknown) =>
        setDraft(prev => prev ? { ...prev, [field]: value } : prev);

    const removeEffect = async (effectId: string) => {
        if (!draft) return;
        const next = (draft.active_effects ?? []).filter(e => e.id !== effectId);
        setDraft(prev => prev ? { ...prev, active_effects: next } : prev);
        try { await setCharacterEffects(draft.id, next); } catch { /* ignore */ }
    };

    const updateStat = (key: string, value: number) =>
        setDraft(prev => prev ? { ...prev, stats: { ...prev.stats, [key]: Math.floor(Number(value) || 0) } } : prev);

    const toggleSavingThrow = (key: string) =>
        setDraft(prev => prev ? {
            ...prev,
            savingThrows: { ...prev.savingThrows, [key]: !prev.savingThrows?.[key] }
        } : prev);

    const toggleSkill = (key: string) =>
        setDraft(prev => prev ? {
            ...prev,
            skills: { ...prev.skills, [key]: !prev.skills?.[key] }
        } : prev);

    const resetInventoryForm = () => {
        setNewInventoryItem(EMPTY_FORM);
        setEditingInventoryId(null);
    };

    const editInventoryItem = (item: InventoryItem) => {
        setNewInventoryItem({
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
        setEditingInventoryId(item.id);
        setShowInventoryForm(true);
    };

    const addInventoryItem = () => {
        if (!draft || !newInventoryItem.nome.trim()) return;

        const base = {
            id: editingInventoryId ?? Date.now(),
            nome: newInventoryItem.nome.trim(),
            name: newInventoryItem.nome.trim(),
            categoria: newInventoryItem.categoria,
            desc: newInventoryItem.desc.trim(),
            proficiente: newInventoryItem.proficiente,
        };

        let payload: InventoryItem;

        if (newInventoryItem.categoria === 'arma') {
            payload = {
                ...base,
                tipo: 'Arma',
                atributo: newInventoryItem.atributo || undefined,
                ataque: newInventoryItem.ataque.trim(),
                dano: newInventoryItem.dano.trim(),
            };
        } else if (newInventoryItem.categoria === 'armadura') {
            payload = {
                ...base,
                tipo: 'Armadura',
                tipoArmadura: newInventoryItem.tipoArmadura || undefined,
                caBase: newInventoryItem.caBase ? Number(newInventoryItem.caBase) : undefined,
            };
        } else if (newInventoryItem.categoria === 'consumivel') {
            payload = {
                ...base,
                tipo: 'Consumível',
                quantidade: newInventoryItem.quantidade ? Number(newInventoryItem.quantidade) : 1,
                efeito: newInventoryItem.efeito.trim(),
            };
        } else {
            payload = {
                ...base,
                tipo: newInventoryItem.tipo.trim() || 'Item',
            };
        }

        if (editingInventoryId !== null) {
            updateDraft('inventory', (draft.inventory ?? []).map(i =>
                i.id === editingInventoryId ? payload : i
            ));
        } else {
            updateDraft('inventory', [...(draft.inventory ?? []), payload]);
        }

        resetInventoryForm();
        setShowInventoryForm(false);
    };

    const removeInventoryItem = (id: number) =>
        setDraft(prev => prev ? { ...prev, inventory: prev.inventory.filter(i => i.id !== id) } : prev);

    // Funções de Gerenciamento das Habilidades via Pop-up
    const resetSpellForm = () => {
        setNewSpellItem(EMPTY_SPELL_FORM);
        setEditingSpellId(null);
    };

    const editSpellItem = (spell: any) => {
        setNewSpellItem({
            name: spell.name || '',
            level: spell.level || '',
            tipo: spell.tipo || 'Magia',
            desc: spell.desc || '',
        });
        setEditingSpellId(spell.id);
        setShowSpellForm(true);
    };

    const addSpellItem = () => {
        if (!draft || !newSpellItem.name.trim()) return;

        const payload = {
            id: editingSpellId ?? Date.now(),
            name: newSpellItem.name.trim(),
            level: newSpellItem.level.trim(),
            tipo: (newSpellItem.tipo ?? '').trim() || 'Magia',
            desc: newSpellItem.desc.trim(),
        };

        if (editingSpellId !== null) {
            updateDraft('spells', (draft.spells ?? []).map(s =>
                s.id === editingSpellId ? payload : s
            ));
        } else {
            updateDraft('spells', [...(draft.spells ?? []), payload]);
        }

        resetSpellForm();
        setShowSpellForm(false);
    };

    const removeSpell = (id: number) =>
        setDraft(prev => prev ? { ...prev, spells: prev.spells.filter(s => s.id !== id) } : prev);

    const saveCharacter = async () => {
        if (!draft || !initialChar) return;
        setSaving(true);
        const payload: Record<string, unknown> = { ...draft };
        let saved: Character | null = null;
        let saveError: Error | any = null;

        for (let attempt = 0; attempt < 5; attempt++) {
            const { data, error } = await supabase
                .from('characters')
                .update(payload)
                .eq('id', draft.id)
                .select('id, name, class, level, race, alignment, experiencePoints, proficiencyBonus, inspiration, ac, hp_current, hp_max, stats, savingThrows, skills, inventory, spells, img, currency, imgOffsetX, imgOffsetY, is_linked, owner_id, classLevels, spellSlots, preparedSpells, lastLongRest, customSkills, active_effects')
                .single();
            if (!error && data) { saved = data as Character; saveError = null; break; }
            if (error) {
                const match = error.message?.match(/Could not find the '([^']+)' column/);
                const col = match?.[1];
                if (col && col in payload) { delete payload[col]; saveError = error; continue; }
                saveError = error; break;
            }
        }

        if (saveError) {
            alert('Erro ao salvar: ' + saveError.message);
        } else if (saved) {
            setDraft(saved);
            onUpdate?.(saved);

            const changes = [];
            if (initialChar.hp_current !== saved.hp_current) changes.push(`HP (${initialChar.hp_current} ➔ ${saved.hp_current})`);
            if (initialChar.hp_max !== saved.hp_max) changes.push(`HP Máx (${initialChar.hp_max} ➔ ${saved.hp_max})`);
            if (initialChar.ac !== saved.ac) changes.push(`CA (${initialChar.ac} ➔ ${saved.ac})`);
            if (initialChar.level !== saved.level) changes.push(`Nível (${initialChar.level} ➔ ${saved.level})`);

            if (changes.length > 0 && currentUserId) {
                await supabase.from('chat_messages').insert([{
                    campaign_id: campaignId,
                    user_name: saved.name,
                    text: `${currentUserName} alterou atributos: ${changes.join(', ')}`,
                    is_roll: false,
                    is_secret: true,
                    channel: 'fichas',
                    sender_id: currentUserId,
                }]);
            }

            setInitialChar(saved);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
        setSaving(false);
    };

    useEffect(() => {
        if (!isOpen || !characterId) return;
        const fetchCharacter = async () => {
            setLoading(true);
            setDraft(null);
            const { data, error } = await supabase
                .from('characters')
                .select('id, name, class, level, race, alignment, experiencePoints, proficiencyBonus, inspiration, ac, hp_current, hp_max, stats, savingThrows, skills, inventory, spells, img, currency, imgOffsetX, imgOffsetY, is_linked, owner_id, classLevels, spellSlots, preparedSpells, lastLongRest, customSkills, active_effects')
                .eq('id', characterId)
                .single();
            if (!error && data) {
                setDraft(data as Character);
                setInitialChar(data as Character);
            }
            setLoading(false);
        };
        fetchCharacter();
    }, [isOpen, characterId, supabase]);

    // Item 7a: reflete em tempo real mudanças de PV feitas por fora (ex.: magia do mestre)
    // na ficha aberta — tanto na visão do mestre quanto na do jogador.
    useEffect(() => {
        if (!isOpen || !characterId) return;
        const channel = supabase
            .channel(`ficha-${characterId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${characterId}` },
                ({ new: row }) => {
                    const r = row as { hp_current?: number; hp_max?: number; active_effects?: ActiveEffect[] };
                    setDraft(prev => prev ? { ...prev, hp_current: r.hp_current ?? prev.hp_current, hp_max: r.hp_max ?? prev.hp_max, active_effects: r.active_effects ?? prev.active_effects } : prev);
                    setInitialChar(prev => prev ? { ...prev, hp_current: r.hp_current ?? prev.hp_current, hp_max: r.hp_max ?? prev.hp_max, active_effects: r.active_effects ?? prev.active_effects } : prev);
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [isOpen, characterId, supabase]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const inputCls = "w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors";
    const selectCls = "w-full bg-[#050a05] border border-[#1a2a1a] px-2 py-1 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors cursor-pointer";
    const numInputCls = "w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-[14px] rounded text-[#00ff66] font-bold text-center outline-none focus:border-[#00ff66]/50 transition-colors";

    const hpCurrent = draft?.hp_current ?? 0;
    const hpMax = Math.max(draft?.hp_max ?? 0, 1);
    const levelValue = draft?.level ?? 1;
    const xpValue = draft?.experiencePoints ?? 0;
    const initiativeValue = fmtMod(getModifier(draft?.stats?.dex ?? 0));

return (
    <>
        {/* POPUP ROLAGEM DE DADOS */}
        {rollPopup && (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && setRollPopup(null)}
            >
                <div className="bg-[#080f08] border border-[#1a2a1a] rounded-2xl w-[320px] shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden">

                    {/* Header */}
                    <div className="relative flex items-center justify-center px-5 pt-5 pb-3">
                        <div className="text-center">
                            <p className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-[0.25em] mb-1">Rolagem</p>
                            <h3 className="text-white text-[18px] font-black uppercase tracking-wider leading-none">
                                {rollPopup.label}
                            </h3>
                            <p className="text-[#00ff66] text-[12px] font-black mt-1.5 tabular-nums">
                                D20 {rollPopup.modifier >= 0 ? `+${rollPopup.modifier}` : rollPopup.modifier}
                            </p>
                        </div>
                        {/* Secret toggle */}
                        <button
                            onClick={() => setRollPopup(prev => prev ? { ...prev, isSecret: !prev.isSecret } : null)}
                            className={`absolute right-4 top-4 p-2 rounded-lg border transition-all flex items-center justify-center
                                ${rollPopup.isSecret
                                    ? 'bg-red-900/30 border-red-500/60 text-red-400'
                                    : 'bg-transparent border-[#1a2a1a] text-[#3a4a3a] hover:border-[#00ff66]/40 hover:text-[#00ff66]'}`}
                            title={rollPopup.isSecret ? 'Desativar rolagem secreta' : 'Ativar rolagem secreta'}
                        >
                            {rollPopup.isSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                    </div>

                    {/* Secret warning */}
                    <div className="h-6 flex items-center justify-center mb-1">
                        {rollPopup.isSecret && (
                            <span className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.2em] text-red-400/80 uppercase animate-pulse">
                                <EyeOff size={9} /> Apenas o Mestre verá
                            </span>
                        )}
                    </div>
                    

                    {/* Roll mode buttons */}
                    <div className="px-4 pb-2 grid grid-cols-3 gap-2">
                        <button
                            onClick={() => executeRoll('disadvantage')}
                            className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-red-900/40 bg-red-900/10 hover:bg-red-900/25 hover:border-red-600/60 transition-all"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m7 10-5 5 5 5"/><path d="M2 15h15a4 4 0 0 0 0-8h-1"/></svg>
                            <span className="text-[10px] font-black uppercase tracking-wide text-red-400 group-hover:text-red-300 leading-none">Desvant.</span>
                        </button>
                        <button
                            onClick={() => executeRoll('normal')}
                            className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-[#00ff66]/40 bg-[#00ff66]/10 hover:bg-[#00ff66]/20 hover:border-[#00ff66]/70 transition-all"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#00ff66]"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/></svg>
                            <span className="text-[10px] font-black uppercase tracking-wide text-[#00ff66] group-hover:text-[#00ff66] leading-none">Normal</span>
                        </button>
                        <button
                            onClick={() => executeRoll('advantage')}
                            className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-emerald-700/40 bg-emerald-900/10 hover:bg-emerald-900/25 hover:border-emerald-500/60 transition-all"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="m17 10 5 5-5 5"/><path d="M22 15H7a4 4 0 0 1 0-8h1"/></svg>
                            <span className="text-[10px] font-black uppercase tracking-wide text-emerald-400 group-hover:text-emerald-300 leading-none">Vantagem</span>
                        </button>
                    </div>

                    {/* Cancel */}
                    <button
                        onClick={() => setRollPopup(null)}
                        className="w-full py-3 text-[10px] text-[#2a3a2a] hover:text-[#4a5a4a] uppercase tracking-[0.25em] font-black transition-colors border-t border-[#1a2a1a]/50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        )}

        {/* POPUP ADICIONAR/EDITAR INVENTÁRIO */}
        {showInventoryForm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-[400px] shadow-[0_0_50px_rgba(0,0,0,0.95)] space-y-4 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-[#00ff66] text-sm font-black uppercase tracking-widest text-center">
                        {editingInventoryId !== null ? 'Editar Item' : 'Novo Item'}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Nome do Item</label>
                            <input type="text" className={inputCls} value={newInventoryItem.nome} onChange={e => setNewInventoryItem(prev => ({ ...prev, nome: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Categoria</label>
                            <select className={selectCls} value={newInventoryItem.categoria} onChange={e => setNewInventoryItem(prev => ({ ...prev, categoria: e.target.value as ItemCategoria, tipo: '' }))}>
                                {Object.entries(CATEGORIA_LABELS).map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
                            </select>
                        </div>
                        {newInventoryItem.categoria === 'arma' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2 flex items-center gap-2 mb-1">
                                    <input type="checkbox" id="proficiente" checked={newInventoryItem.proficiente} onChange={e => setNewInventoryItem(prev => ({ ...prev, proficiente: e.target.checked }))} className="accent-[#00ff66] w-4 h-4 cursor-pointer" />
                                    <label htmlFor="proficiente" className="text-[11px] text-[#4a5a4a] font-black uppercase tracking-widest cursor-pointer">Proficiente com esta arma</label>
                                </div>
                                <div>
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Fórmula de Ataque</label>
                                    <input type="text" placeholder="ex: 1d20+5" className={inputCls} value={newInventoryItem.ataque} onChange={e => setNewInventoryItem(prev => ({ ...prev, ataque: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Fórmula de Dano</label>
                                    <input type="text" placeholder="ex: 1d8+3" className={inputCls} value={newInventoryItem.dano} onChange={e => setNewInventoryItem(prev => ({ ...prev, dano: e.target.value }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Atributo da Arma</label>
                                    <select className={selectCls} value={newInventoryItem.atributo} onChange={e => setNewInventoryItem(prev => ({ ...prev, atributo: e.target.value as WeaponAttribute | '' }))}>
                                        <option value="">Nenhum (Modificador Fixo)</option>
                                        {WEAPON_ATTRIBUTE_OPTIONS.map(opt => <option key={opt} value={opt}>{weaponAttributeLabels[opt]}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        {newInventoryItem.categoria === 'armadura' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">CA Base</label>
                                    <input type="number" className={inputCls} value={newInventoryItem.caBase} onChange={e => setNewInventoryItem(prev => ({ ...prev, caBase: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Tipo</label>
                                    <select className={selectCls} value={newInventoryItem.tipoArmadura} onChange={e => setNewInventoryItem(prev => ({ ...prev, tipoArmadura: e.target.value }))}>
                                        <option value="">Selecione...</option>
                                        {TIPO_ARMADURA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        {newInventoryItem.categoria === 'consumivel' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Quantidade</label>
                                    <input type="number" className={inputCls} value={newInventoryItem.quantidade} onChange={e => setNewInventoryItem(prev => ({ ...prev, quantidade: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Efeito</label>
                                    <input type="text" placeholder="ex: Cura 2d4+2" className={inputCls} value={newInventoryItem.efeito} onChange={e => setNewInventoryItem(prev => ({ ...prev, efeito: e.target.value }))} />
                                </div>
                            </div>
                        )}
                        {newInventoryItem.categoria === 'item' && (
                            <div>
                                <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Subtipo / Tags</label>
                                <input type="text" placeholder="ex: Ferramenta, Relíquia" className={inputCls} value={newInventoryItem.tipo} onChange={e => setNewInventoryItem(prev => ({ ...prev, tipo: e.target.value }))} />
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Descrição</label>
                            <textarea rows={3} className={inputCls + " resize-none"} value={newInventoryItem.desc} onChange={e => setNewInventoryItem(prev => ({ ...prev, desc: e.target.value }))} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => { resetInventoryForm(); setShowInventoryForm(false); }} className="flex-1 bg-transparent border border-[#1a2a1a] text-[#4a5a4a] hover:text-white uppercase text-[11px] font-black tracking-widest py-2 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={addInventoryItem} className="flex-1 bg-[#00ff66] text-black uppercase text-[11px] font-black tracking-widest py-2 rounded-xl hover:brightness-110 transition-all">Salvar Item</button>
                    </div>
                </div>
            </div>
        )}

        {/* POPUP ADICIONAR/EDITAR HABILIDADE (IGUAL AO INVENTÁRIO) */}
        {showSpellForm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-full max-w-[600px] shadow-[0_0_50px_rgba(0,0,0,0.95)] space-y-4 max-h-[90vh] overflow-y-auto flex flex-col">
                    <h3 className="text-[#f1e5ac] text-sm font-black uppercase tracking-widest text-center shrink-0">
                        {editingSpellId !== null ? 'Editar Habilidade' : 'Nova Habilidade'}
                    </h3>
                    <div className="space-y-3 flex-1 flex flex-col min-h-0">
                        <div className="shrink-0">
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Nome da Habilidade</label>
                            <input type="text" className={inputCls} value={newSpellItem.name} onChange={e => setNewSpellItem(prev => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 shrink-0">
                            <div>
                                <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Tipo</label>
                                <select className={selectCls} value={newSpellItem.tipo} onChange={e => setNewSpellItem(prev => ({ ...prev, tipo: e.target.value }))}>
                                    <option value="Magia">Magia</option>
                                    <option value="Poder">Poder</option>
                                    <option value="Passiva">Passiva</option>
                                    <option value="Talento">Talento</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Nível / Custo</label>
                                <input type="text" placeholder="ex: 1º Círculo, 2 PM" className={inputCls} value={newSpellItem.level} onChange={e => setNewSpellItem(prev => ({ ...prev, level: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-[150px]">
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1 shrink-0">Descrição</label>
                            <textarea className={inputCls + " flex-1 min-h-[100px] resize-y"} value={newSpellItem.desc} onChange={e => setNewSpellItem(prev => ({ ...prev, desc: e.target.value }))} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2 shrink-0">
                        <button onClick={() => { resetSpellForm(); setShowSpellForm(false); }} className="flex-1 bg-transparent border border-[#1a2a1a] text-[#4a5a4a] hover:text-white uppercase text-[11px] font-black tracking-widest py-2 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={addSpellItem} className="flex-1 bg-[#f1e5ac] text-black uppercase text-[11px] font-black tracking-widest py-2 rounded-xl hover:brightness-110 transition-all">Salvar</button>
                    </div>
                </div>
            </div>
        )}

        {/* CONTAINER PRINCIPAL DO MODAL */}
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative bg-[#020502]/95 border border-[#1a2a1a] rounded-2xl shadow-[0_0_80px_rgba(0,255,102,0.06),0_0_60px_rgba(0,0,0,0.9)] w-2/3 min-w-[480px] h-[88vh] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-8">

                    {loading && (
                        <div className="text-center text-[#8a9a8a] text-base py-20">Carregando ficha...</div>
                    )}
                    {!loading && !draft && (
                        <div className="text-center text-red-400 text-base py-20">Não foi possível carregar a ficha.</div>
                    )}

                    {!loading && draft && (
                        <>
                            {/* Barra de navegação */}
                                <div className="flex justify-between items-center mb-6">
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-base font-black transition-colors"
                                    >
                                        <ArrowLeft size={14} /> FECHAR
                                    </button>
                                    <span className="text-[#f1e5ac] text-base font-serif tracking-widest uppercase italic opacity-60">
                                        Ficha — {draft.name}
                                    </span>
                                    {readOnly ? (
                                        <span className="text-[14px] font-black uppercase tracking-widest text-[#4a5a4a] border border-[#1a2a1a] px-3 py-1.5 rounded-lg">
                                            Apenas visualização
                                        </span>
                                    ) : (
                                        <button
                                            onClick={saveCharacter}
                                            disabled={saving}
                                            className={`flex items-center gap-2 text-base font-black uppercase px-4 py-1.5 rounded-lg transition-all ${saveSuccess
                                                ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40'
                                                : 'bg-[#00ff66] text-black hover:brightness-110'
                                                } disabled:opacity-50`}
                                        >
                                            <Save size={12} />
                                            {saving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar'}
                                        </button>
                                    )}
                                </div>

                            <div className={`bg-black/65 border border-[#1a2a1a] rounded-2xl p-3 sm:p-4 space-y-4 shadow-[0_0_24px_rgba(0,0,0,0.35)] mb-6 ${readOnly ? 'pointer-events-none select-none' : ''}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* LADO ESQUERDO */}
                                    <div className="space-y-3">
                                        <div className="flex flex-col items-start gap-3">
                                            <div
                                                className="w-40 h-40 shrink-0 rounded-2xl border border-[#1a2a1a] bg-black bg-cover bg-center cursor-pointer overflow-hidden relative group shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                                                style={{
                                                    backgroundImage: `url(${draft.img || '/placeholder.png'})`,
                                                    backgroundPosition: `${framingOpen ? tempOffsetX : (draft.imgOffsetX ?? 50)}% ${framingOpen ? tempOffsetY : (draft.imgOffsetY ?? 50)}%`
                                                }}
                                                onClick={openFraming}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {/* NOME, RAÇA E CLASSE ESTRUTURADOS DEBAIXO DA FOTO, AINDA ESTÁTICOS */}
                                            <div className="w-full space-y-2 mt-1">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] text-[#4a5a4a] font-black uppercase tracking-widest block text-left">Nome</label>
                                                    <input className={inputCls + " text-left text-2xl font-black bg-transparent border-none p-0 focus:border-b focus:border-[#00ff66]/50"} value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
                                                </div>

                                                <div className="flex gap-2 flex-wrap">
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2a1a] bg-[#0a120a] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#4a5a4a]">
                                                        Raça: <span className="text-[#00ff66]">{draft.race}</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2a1a] bg-[#0a120a] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#4a5a4a]">
                                                        Classe: <span className="text-[#f1e5ac]">{draft.class}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="rounded-2xl border border-[#1a2a1a] bg-[#0a120a] p-2 text-center shadow-[0_0_12px_rgba(0,0,0,0.2)] w-20">
                                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">Nível</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={20}
                                                        className="mt-1 w-full bg-transparent text-2xl font-black text-white text-center outline-none"
                                                        value={levelValue}
                                                        onChange={(e) => {
                                                            const nextLevel = Number(e.target.value);
                                                            const nextProf = proficiencyByLevel(nextLevel);
                                                            setDraft(prev => prev ? { ...prev, level: nextLevel, proficiencyBonus: nextProf } : prev);
                                                        }}
                                                    />
                                                </div>
                                                {/* Bônus de Proficiência — calculado automaticamente pelo nível */}
                                                <div className="rounded-2xl border border-[#1a2a1a] bg-[#0a120a] p-2 text-center shadow-[0_0_12px_rgba(0,0,0,0.2)] w-20">
                                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">Prof.</span>
                                                    <div className="mt-1 text-2xl font-black text-[#00ff66] leading-none">
                                                        +{proficiencyByLevel(draft.level)}
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-[#1a2a1a] bg-[#0a120a] p-2 text-center shadow-[0_0_12px_rgba(0,0,0,0.2)] w-24">
                                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">XP</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="mt-1 w-full bg-transparent text-lg font-black text-[#f1e5ac] text-center outline-none"
                                                        value={xpValue}
                                                        onChange={(e) => updateDraft('experiencePoints', Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="w-full space-y-2">
                                                <div className="flex justify-between items-center text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-[#4a5a4a]">
                                                    <span>Pontos de Vida</span>
                                                    <span className="text-[#f1e5ac]">{hpCurrent} / {hpMax}</span>
                                                </div>
                                                <div className="relative w-full h-3 bg-black border border-[#1a2a1a] rounded-full overflow-hidden shadow-[inset_0_0_8px_rgba(0,0,0,0.55)]">
                                                    <div className={`absolute inset-y-0 left-0 ${hpMax > 0 ? (hpCurrent / hpMax * 100 > 50 ? 'bg-[#00ff66]' : hpCurrent / hpMax * 100 > 20 ? 'bg-yellow-500' : 'bg-red-600') : 'bg-red-600'} transition-all duration-500`} style={{ width: `${Math.min(Math.max(hpMax > 0 ? (hpCurrent / hpMax * 100) : 0, 0), 100)}%` }} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] block mb-1">Vida atual</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="w-full bg-black/50 border border-[#1a2a1a] rounded-lg px-2 py-1 text-base font-black text-white text-center outline-none focus:border-[#00ff66]/50"
                                                            value={draft.hp_current}
                                                            onChange={(e) => updateDraft('hp_current', Number(e.target.value))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] block mb-1">Vida máxima</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            className="w-full bg-black/50 border border-[#1a2a1a] rounded-lg px-2 py-1 text-base font-black text-white text-center outline-none focus:border-[#00ff66]/50"
                                                            value={draft.hp_max}
                                                            onChange={(e) => updateDraft('hp_max', Number(e.target.value))}
                                                        />
                                                    </div>
                                                </div>

                                                {(draft.active_effects?.length ?? 0) > 0 && (
                                                    <div className="mt-3 border-t border-[#1a2a1a] pt-3">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] block mb-2">Efeitos ativos</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(draft.active_effects ?? []).map((ef) => (
                                                                <span
                                                                    key={ef.id}
                                                                    title={ef.origem ? `${ef.rotulo} — ${ef.origem}` : ef.rotulo}
                                                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ef.tipo === 'beneficio' ? 'border-[#00ff66]/40 bg-[#00ff66]/10 text-[#00ff66]' : ef.tipo === 'restricao' ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'}`}
                                                                >
                                                                    <span className="max-w-[160px] truncate">{ef.rotulo}</span>
                                                                    {!readOnly && (
                                                                        <button type="button" onClick={() => removeEffect(ef.id)} className="opacity-60 hover:opacity-100" title="Remover efeito">×</button>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-2xl border border-[#1a2a1a] bg-[#0a150a] p-2 text-center">
                                                    <Shield className="mx-auto text-[#00ff66] mb-1" size={16} />
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="w-full bg-transparent text-2xl font-black text-white text-center outline-none"
                                                        value={draft.ac ?? 10}
                                                        onChange={(e) => updateDraft('ac', Number(e.target.value))}
                                                    />
                                                    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">CA</span>
                                                </div>
                                                {/* Iniciativa: clique para rolar automaticamente com o modificador de DES */}
                                                <div
                                                    className="rounded-2xl border border-[#1a2a1a] bg-[#0a150a] p-2 text-center flex flex-col cursor-pointer hover:border-[#f1e5ac]/40 hover:bg-[#1a150a] transition-all"
                                                    title="Clique para rolar Iniciativa (1d20 + DES)"
                                                    onClick={() => rollD20('Iniciativa', getModifier(draft?.stats?.dex ?? 0))}
                                                >
                                                    <div className="text-2xl font-black text-white leading-none">{initiativeValue}</div>
                                                    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">Iniciativa</span>
                                                </div>
                                            </div>

                                            {/* CD de Magia = 8 + Proficiência + Mod do atributo de conjuração da CLASSE.
                                                Classes sem conjuração (Bárbaro, Guerreiro, Ladino, Monge...) não exibem CD. */}
                                            {(() => {
                                                const spellAttr = SPELL_ATTR_BY_CLASS[draft.class];
                                                if (!spellAttr) return null;
                                                const prof = proficiencyByLevel(draft.level);
                                                const spellMod = getModifier(draft?.stats?.[spellAttr] ?? 10);
                                                const spellDC = 8 + prof + spellMod;
                                                return (
                                                    <div className="rounded-xl border border-[#1a2a1a] bg-black/30 px-3 py-2 flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">CD de Magia <span className="text-[#2a3a2a]">({statLabels[spellAttr]})</span></span>
                                                        <span className="text-[16px] font-black text-[#a78bfa]">{spellDC}</span>
                                                    </div>
                                                );
                                            })()}

                                            <label className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1a2a1a] bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] w-fit">
                                                <input type="checkbox" id="inspiration" checked={!!draft.inspiration} onChange={(e) => updateDraft('inspiration', e.target.checked)} className="accent-[#00ff66] w-3 h-3 cursor-pointer" />
                                                Inspiração
                                            </label>
                                        </div>
                                    </div>

                                    {/* LADO DIREITO - Atributos, Salvaguardas e Habilidades */}
                                    <div className="space-y-3">
                                        <div className="space-y-3">
                                            {/* Atributos */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                    const mod = getModifier(draft.stats[s]);
                                                    return (
                                                        <div
                                                            key={s}
                                                            onClick={() => rollD20(statLabels[s], mod)}
                                                            title={`Rolar ${statLabels[s]}`}
                                                            className="bg-black border border-[#1a2a1a] rounded-xl p-2 text-center group relative cursor-pointer hover:border-[#00ff66]/40 transition-colors"
                                                        >
                                                            <span className="text-[14px] text-[#4a5a4a] font-black uppercase">{statLabels[s]}</span>
                                                            <input
                                                                type="number" min={1} max={30}
                                                                className="w-full bg-transparent text-xl font-black text-white text-center outline-none my-0.5 border-b border-[#1a2a1a] focus:border-[#00ff66]/50"
                                                                value={draft.stats[s]}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => updateStat(s, Number(e.target.value))}
                                                            />
                                                            <div className="text-[#00ff66] text-[14px] font-black">{fmtMod(mod)}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="space-y-3">
                                                {/* Salvaguardas */}
                                                <div className="bg-black/40 border border-[#1a2a1a] p-3 rounded-xl">
                                                    <h3 className="text-[13px] text-[#4a5a4a] font-black uppercase mb-2 flex items-center gap-2">
                                                        <ShieldAlert size={11} /> Salvaguardas
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                            const proficient = draft.savingThrows?.[s];
                                                            const mod = getModifier(draft.stats[s]);
                                                            const total = mod + (proficient ? proficiencyByLevel(draft.level) : 0);
                                                            return (
                                                                <div
                                                                    key={s}
                                                                    onClick={() => rollD20(`Salv. ${statLabels[s]}`, total)}
                                                                    title={`Rolar salvaguarda de ${statLabels[s]}`}
                                                                    className="flex items-center justify-between border-b border-[#1a2a1a]/50 py-0.5 cursor-pointer hover:bg-white/5 rounded px-1 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input type="checkbox" checked={!!proficient} onClick={(e) => e.stopPropagation()} onChange={() => toggleSavingThrow(s)} className="accent-[#00ff66] w-3 h-3 cursor-pointer" />
                                                                        <span className="text-[13px] uppercase text-gray-300">{statLabels[s]}</span>
                                                                    </div>
                                                                    <span className="text-[13px] font-black text-[#00ff66]">{fmtMod(total)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* BLOCO DE HABILIDADES - IGUAL À LÓGICA DO INVENTÁRIO COM POPUP */}
                                                <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase flex items-center gap-2">
                                                            <Sparkles size={12} /> Habilidades 
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            {/*BOTÃO DE GRIMÓRIO*/}
                                                            <button 
                                                                onClick={() => setShowSpellModal(true)} 
                                                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 border border-[#f1e5ac]/40 text-[#f1e5ac] text-[10px] uppercase font-black hover:bg-[#f1e5ac]/10 transition-colors"
                                                                title="Abrir Grimório"
                                                            >
                                                                <BookOpen size={12} /> Grimório
                                                            </button>
                                                            
                                                            {!readOnly && (
                                                                <button onClick={() => { resetSpellForm(); setShowSpellForm(true); }} className="w-6 h-6 rounded-md bg-[#f1e5ac] text-black flex items-center justify-center text-xs font-black transition-all hover:brightness-110 shadow-[0_0_8px_rgba(241,229,172,0.4)]" title="Adicionar Habilidade/Magia">
                                                                    <Plus size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1 mb-2">
                                                        {/* Traços Raciais Estáticos */}
                                                        {RACE_DATA[draft.race]?.traits.split(', ').map((trait) => (
                                                            <div key={trait} className="bg-[#0a1a0a] p-1.5 rounded border border-[#1a2a1a]/60 flex justify-between items-center">
                                                                <span className="text-[13px] uppercase font-bold text-[#4a7a4a]">{trait}</span>
                                                                <span className="text-[11px] text-[#2a4a2a] font-black uppercase">Raça</span>
                                                            </div>
                                                        ))}
                                                        {RACE_DATA[draft.race]?.traits && draft.spells?.length > 0 && <div className="border-t border-[#1a2a1a] my-1" />}
                                                        
                                                        {/* Lista Dinâmica com Expansão e Edição de Habilidades (apenas Habilidades, sem Magias) */}
                                                        {draft.spells?.filter((s: any) => s.tipo !== 'Magia').map((spell: any) => {
                                                            const isSpellExpanded = expandedSpellId === spell.id;
                                                            return (
                                                                <div key={spell.id} className="bg-black/60 rounded border border-[#1a2a1a] overflow-hidden">
                                                                    <div className="p-1.5 flex justify-between items-center cursor-pointer hover:bg-white/5" onClick={() => setExpandedSpellId(isSpellExpanded ? null : spell.id)}>
                                                                        <div className="min-w-0">
                                                                            <span className="text-[13px] uppercase font-bold text-gray-300 block truncate">{spell.name}</span>
                                                                            <div className="flex gap-2 text-[10px] text-gray-500 uppercase">
                                                                                <span>{spell.tipo || 'Magia'}</span>
                                                                                {spell.level && <span>• {spell.level}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                                            <button onClick={() => editSpellItem(spell)} className="text-gray-400 hover:text-[#f1e5ac] transition-colors p-1"><Pencil size={11} /></button>
                                                                            <button onClick={() => removeSpell(spell.id)} className="text-red-500/60 hover:text-red-400 transition-colors p-1"><Trash2 size={11} /></button>
                                                                        </div>
                                                                    </div>
                                                                    {isSpellExpanded && spell.desc && (
                                                                        <div className="px-2 pb-2 pt-1 border-t border-[#1a2a1a]/50 text-[12px] text-gray-400 bg-black/40 break-words whitespace-pre-line">
                                                                            {spell.desc}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PERÍCIAS */}
                            <div className={`bg-black border border-[#1a2a1a] p-3 rounded-xl mt-5 ${readOnly ? 'pointer-events-none select-none' : ''}`}>
                                <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase mb-3 text-center">Perícias</h3>
                                <div className="grid grid-cols-2 gap-1">
                                    {Object.entries(skillsData).map(([key, info]) => {
                                        const mod = getModifier(draft.stats[info.attr]);
                                        const proficient = draft.skills?.[key];
                                        const total = mod + (proficient ? proficiencyByLevel(draft.level) : 0);
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => rollD20(info.name, total)}
                                                title={`Rolar ${info.name}`}
                                                className="flex items-center justify-between bg-black/40 px-2 py-1 rounded border border-[#1a2a1a] cursor-pointer hover:border-[#00ff66]/40 transition-colors"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <input type="checkbox" checked={!!proficient} onClick={(e) => e.stopPropagation()} onChange={() => toggleSkill(key)} className="accent-[#00ff66] w-3 h-3 cursor-pointer shrink-0" />
                                                    <span className="text-[13px] uppercase text-gray-300 leading-tight truncate">{info.name}</span>
                                                </div>
                                                <span className="text-[13px] font-black text-[#00ff66] ml-1 shrink-0">{fmtMod(total)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* INVENTÁRIO E MOEDAS */}
                            <div className={`bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl mt-3 ${readOnly ? 'pointer-events-none select-none' : ''}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[#00ff66] text-[13px] font-black uppercase flex items-center gap-2">
                                        <Backpack size={12} /> Inventário
                                    </h3>
                                    {!readOnly && (
                                        <button onClick={() => { resetInventoryForm(); setShowInventoryForm(true); }} className="w-7 h-7 rounded-md bg-[#00ff66] text-black flex items-center justify-center text-base font-black transition-all hover:brightness-110 shadow-[0_0_8px_rgba(0,255,102,0.5)]" title="Adicionar item">
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="bg-black/30 rounded-lg p-2 mb-3 border border-[#1a2a1a]">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-black uppercase text-[#f1e5ac] tracking-wider flex items-center gap-1"> Dinheiro</span>
                                        <div className="flex gap-3">
                                            {[
                                                { key: 'pl', label: 'PL', color: 'text-[#e5e4e2]', title: 'Platina' },
                                                { key: 'po', label: 'PO', color: 'text-[#f1e5ac]', title: 'Ouro' },
                                                { key: 'pp', label: 'PP', color: 'text-[#c0c0c0]', title: 'Prata' },
                                                { key: 'pc', label: 'PC', color: 'text-[#b87333]', title: 'Cobre' },
                                            ].map(({ key, label, color, title }) => (
                                                <div key={key} className="flex items-center gap-1" title={title}>
                                                    <span className={`text-[11px] font-black ${color}`}>{label}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={draft.currency?.[key as keyof typeof draft.currency] ?? 0}
                                                        onChange={(e) => updateDraft('currency', { ...(draft.currency ?? { pl: 0, po: 0, pp: 0, pc: 0 }), [key]: Math.max(0, Number(e.target.value) || 0) })}
                                                        className="w-12 bg-black/60 border border-[#1a2a1a] rounded px-1 py-0.5 text-[12px] text-white text-center outline-none focus:border-[#00ff66]/40"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    {draft.inventory?.length ? draft.inventory.map((item: InventoryItem) => {
                                        const isExpanded = expandedItemId === item.id;
                                        const cat = item.categoria || 'item';
                                        return (
                                            <div key={item.id} className="bg-black/40 rounded-lg border border-[#1a2a1a] overflow-hidden">
                                                <div className="flex items-center gap-2 px-2 py-1.5">
                                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                                                        <div className="flex items-center gap-2">
                                                            {categoriaIcons[cat]}
                                                            <span className="text-[13px] font-black uppercase text-gray-200 truncate">{item.nome || item.name || 'Item sem nome'}</span>
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
                                                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                        {item.ataque && (
                                                            <button onClick={() => rollWeaponFormula(item.nome || item.name || 'arma', item.ataque ?? '', 'ataque', item.atributo, item.proficiente)} className="bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 py-0.5 rounded text-[10px] font-black uppercase hover:bg-[#f1e5ac]/20 transition-colors">ATK</button>
                                                        )}
                                                        {item.dano && (
                                                            <button onClick={() => rollWeaponFormula(item.nome || item.name || 'arma', item.dano ?? '', 'dano', item.atributo, item.proficiente)} className="bg-red-900/30 border border-red-800/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-black uppercase hover:bg-red-800/40 transition-colors">DMG</button>
                                                        )}
                                                        {item.efeito && (
                                                            <button onClick={() => rollWeaponFormula(item.nome || item.name || 'item', item.efeito ?? '', 'efeito')} className="bg-purple-900/30 border border-purple-800/40 text-purple-400 px-2 py-0.5 rounded text-[10px] font-black uppercase hover:bg-purple-800/40 transition-colors">USAR</button>
                                                        )}
                                                        <button onClick={() => editInventoryItem(item)} className="text-gray-400 hover:text-white p-1"><Pencil size={12} /></button>
                                                        <button onClick={() => removeInventoryItem(item.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                                {isExpanded && item.desc && (
                                                    <div className="px-3 pb-2 pt-1 border-t border-[#1a2a1a]/50 text-[12px] text-gray-400 bg-black/20 break-words whitespace-pre-line ml-5">
                                                        {item.desc}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : <div className="text-center text-[#4a5a4a] text-xs py-4 uppercase">Inventário Vazio</div>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* MODAL DE ENQUADRAMENTO DA FOTO */}
        {framingOpen && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-[350px] space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.95)]">
                    <h3 className="text-[#f1e5ac] text-sm font-black uppercase tracking-widest text-center">Ajustar Foto</h3>
                    <div className="w-40 h-40 mx-auto rounded-2xl border border-[#1a2a1a] bg-black bg-cover" style={{ backgroundImage: `url(${draft?.img || '/placeholder.png'})`, backgroundPosition: `${tempOffsetX}% ${tempOffsetY}%` }} />
                    <div className="space-y-2">
                        <div>
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Eixo X ({tempOffsetX}%)</label>
                            <input type="range" min="0" max="100" value={tempOffsetX} onChange={e => setTempOffsetX(Number(e.target.value))} className="w-full accent-[#00ff66]" />
                        </div>
                        <div>
                            <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block mb-1">Eixo Y ({tempOffsetY}%)</label>
                            <input type="range" min="0" max="100" value={tempOffsetY} onChange={e => setTempOffsetY(Number(e.target.value))} className="w-full accent-[#00ff66]" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setFramingOpen(false)} className="flex-1 bg-transparent border border-[#1a2a1a] text-[#4a5a4a] hover:text-white uppercase text-[11px] font-black py-2 rounded-xl">Cancelar</button>
                        <button onClick={saveFraming} disabled={savingFrame} className="flex-1 bg-[#00ff66] text-black uppercase text-[11px] font-black py-2 rounded-xl hover:brightness-110 transition-all">{savingFrame ? 'Salvando...' : 'Aplicar'}</button>
                    </div>
                </div>
            </div>
        )}

        <SpellModal
            isOpen={showSpellModal}
            onClose={async () => {
                setShowSpellModal(false);
                // Busca as novas magias no banco caso o usuário tenha adicionado/removido algo
                if (draft) {
                    const { data } = await supabase.from('characters').select('spells').eq('id', draft.id).single();
                    if (data) updateDraft('spells', data.spells);
                }
            }}
            characterId={draft?.id ?? null}
            campaignId={campaignId}
        />
        
    </>
);
}