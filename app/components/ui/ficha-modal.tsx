'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, Shield, Zap, ShieldAlert, Sparkles, Box, Save, Trash2, Pencil, Sword, ShieldHalf, FlaskConical, Backpack, Wand2, Eye, EyeOff, Plus
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

type Character = {
    id: string | number;
    name: string;
    class: string;
    level: number;
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
    customSkills?: { id: string; nome: string; custo: string; desc: string }[];
    inventory: InventoryItem[];
    spells: { id: number; name: string; level?: string }[];
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
    item: <Box size={14} className="text-[#f1e5ac]" />,
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
    const [currentUserName, setCurrentUserName] = useState('Aventureiro');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
    const [showInventoryForm, setShowInventoryForm] = useState(false);
    const [rollPopup, setRollPopup] = useState<{ label: string; modifier: number; isSecret: boolean } | null>(null);

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
        setRollPopup({ label, modifier, isSecret: false });
    };

    const executeRoll = async (mode: 'normal' | 'advantage' | 'disadvantage') => {
        if (!rollPopup) return;
        const { label, modifier, isSecret } = rollPopup;
        setRollPopup(null);

        const result = await onRollDice('d20', isSecret, mode);
        if (!result) return;

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

    const buildWeaponFormula = (formula: string, attribute?: WeaponAttribute) => {
        const cleaned = formula.toLowerCase().replace(/\s+/g, '');
        const normalized = cleaned || '1d20';
        const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);
        if (!match) return null;

        const quantity = match[1] ? parseInt(match[1]) : 1;
        const faces = parseInt(match[2]);
        const baseModifier = match[3] ? parseInt(match[3]) : 0;
        const attributeModifier = attribute ? getModifier(draft?.stats?.[attribute] ?? 0) : 0;
        const totalModifier = baseModifier + attributeModifier;

        return `${quantity}d${faces}${totalModifier !== 0 ? (totalModifier > 0 ? `+${totalModifier}` : `${totalModifier}`) : ''}`;
    };

    const rollWeaponFormula = async (itemName: string, formula: string, label: 'ataque' | 'dano', attribute?: WeaponAttribute) => {
        const resolvedFormula = buildWeaponFormula(formula, attribute);
        if (!resolvedFormula) {
            alert('Fórmula inválida. Use algo como 1d20+5, 2d6+3 ou d20.');
            return;
        }

        const rawResult = await onRollDice(resolvedFormula, false, 'normal');
        if (rawResult === null) return;
        const finalValue: number = typeof rawResult === 'object' && rawResult !== null
            ? Number((rawResult as { finalValue: number }).finalValue)
            : Number(rawResult);
        if (currentUserId) {
            await supabase.from('chat_messages').insert([{
                campaign_id: campaignId,
                user_name: currentUserName,
                text: `${currentUserName} rolou ${label} da arma ${itemName}: ${resolvedFormula} = ${finalValue}`,
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
                .select('*')
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
                .select('*')
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
            {rollPopup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-[350px] shadow-[0_0_50px_rgba(0,0,0,0.95)]">
                        <div className="flex justify-between items-center mb-1">
                            <div className="w-8"></div>
                            <h3 className="text-[#f1e5ac] text-sm font-black uppercase tracking-widest text-center">
                                {rollPopup.label}
                            </h3>
                            <button
                                onClick={() => setRollPopup(prev => prev ? { ...prev, isSecret: !prev.isSecret } : null)}
                                className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center
                                    ${rollPopup.isSecret
                                        ? 'bg-red-900/30 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                        : 'bg-transparent border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66] hover:text-[#00ff66]'}`}
                                title={rollPopup.isSecret ? 'Desativar rolagem secreta' : 'Ativar rolagem secreta'}
                            >
                                {rollPopup.isSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                        <p className="text-[#4a5a4a] text-[10px] uppercase tracking-widest text-center mb-1">
                            d20 {rollPopup.modifier >= 0 ? `+${rollPopup.modifier}` : rollPopup.modifier}
                        </p>
                        <div className="h-4 mb-4 flex items-center justify-center">
                            {rollPopup.isSecret && (
                                <p className="text-[9px] font-bold tracking-widest text-red-400/80 uppercase flex items-center gap-1 animate-pulse">
                                    <EyeOff size={10} /> Apenas o Mestre verá
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => executeRoll('disadvantage')}
                                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wide py-3 px-1 rounded-xl transition-all">
                                Desvantagem
                            </button>
                            <button onClick={() => executeRoll('normal')}
                                className="flex-1 bg-[#00ff66] text-black font-black text-[10px] sm:text-[11px] uppercase tracking-wide py-3 px-1 rounded-xl hover:brightness-110 transition-all">
                                Normal
                            </button>
                            <button onClick={() => executeRoll('advantage')}
                                className="flex-1 bg-green-700 hover:bg-green-600 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wide py-3 px-1 rounded-xl transition-all">
                                Vantagem
                            </button>
                        </div>
                        <button onClick={() => setRollPopup(null)}
                            className="w-full mt-4 text-[10px] text-[#4a5a4a] hover:text-white uppercase tracking-widest transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <div className="bg-[#020502]/95 border border-[#1a2a1a] rounded-2xl shadow-[0_0_80px_rgba(0,255,102,0.06),0_0_60px_rgba(0,0,0,0.9)] w-2/3 min-w-[480px] h-[88vh] flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-8">

                        {loading && (
                            <div className="text-center text-[#8a9a8a] text-base py-20">Carregando ficha...</div>
                        )}
                        {!loading && !draft && (
                            <div className="text-center text-red-400 text-base py-20">Não foi possível carregar a ficha.</div>
                        )}

                        {!loading && draft && (
                            <>
                                {/* BARRA DE NAVEGAÇÃO SUPERIOR COM SALVAMENTO */}
                                <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#1a2a1a]">
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-base font-black transition-colors"
                                    >
                                        Fechar Ficha
                                    </button>
                                    {!readOnly && (
                                        <button
                                            onClick={saveCharacter}
                                            disabled={saving}
                                            className="bg-[#00ff66]/10 hover:bg-[#00ff66]/20 border border-[#00ff66]/40 text-[#00ff66] px-4 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                        >
                                            {saving ? '⏳ Salvando...' : saveSuccess ? '✅ Salvo!' : '💾 Salvar Alterações'}
                                        </button>
                                    )}
                                </div>

                                <div className="bg-black/65 border border-[#1a2a1a] rounded-2xl p-3 sm:p-4 space-y-4 shadow-[0_0_24px_rgba(0,0,0,0.35)] mb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* COLUNA ESQUERDA */}
                                        <div className="space-y-3">
                                            {/* CABEÇALHO ATUALIZADO: NOME ESTÁTICO, NÍVEL E XP GRANDES LADO A LADO */}
                                            <div className="flex flex-col gap-3 bg-black/40 p-3 rounded-xl border border-[#1a2a1a]">
                                                <div>
                                                    <label className="text-[10px] text-[#4a5a4a] font-black uppercase tracking-widest block text-left">Personagem</label>
                                                    <h1 className="text-2xl font-black uppercase text-gray-200 tracking-wide mt-0.5 truncate text-left">
                                                        {draft.name || 'Sem Nome'}
                                                    </h1>
                                                </div>

                                                <div className="flex gap-3">
                                                    <div className="flex-1 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-2 text-center shadow-[0_0_12px_rgba(0,0,0,0.2)]">
                                                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#f1e5ac]">Nível</span>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={20}
                                                            className="mt-1 w-full bg-transparent text-2xl font-black text-white text-center outline-none focus:text-[#00ff66]"
                                                            value={levelValue}
                                                            onChange={(e) => updateDraft('level', Math.max(1, Number(e.target.value) || 1))}
                                                        />
                                                    </div>
                                                    <div className="flex-1 rounded-xl border border-[#1a2a1a] bg-[#0a120a] p-2 text-center shadow-[0_0_12px_rgba(0,0,0,0.2)]">
                                                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#f1e5ac]">XP Atual</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="mt-1 w-full bg-transparent text-xl font-black text-[#00ff66] text-center outline-none"
                                                            value={xpValue}
                                                            onChange={(e) => updateDraft('experiencePoints', Math.max(0, Number(e.target.value) || 0))}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="w-40 h-40 shrink-0 rounded-2xl border border-[#1a2a1a] bg-black bg-cover bg-center cursor-pointer overflow-hidden relative group shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                                                    style={{
                                                        backgroundImage: `url(${draft.img || '/placeholder.png'})`,
                                                        backgroundPosition: `${draft.imgOffsetX ?? 50}% ${draft.imgOffsetY ?? 50}%`
                                                    }}
                                                    onClick={openFraming}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>

                                                <div className="flex flex-col gap-2 justify-center h-40">
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2a1a] bg-[#0a120a] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#4a5a4a]">
                                                        Raça: <span className="text-[#00ff66]">{draft.race}</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2a1a] bg-[#0a120a] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#4a5a4a]">
                                                        Classe: <span className="text-[#f1e5ac]">{draft.class}</span>
                                                    </span>
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
                                                    <div className="rounded-2xl border border-[#1a2a1a] bg-[#0a150a] p-2 text-center flex flex-col">
                                                        <Zap className="mx-auto text-[#f1e5ac] mb-1" size={16} />
                                                        <div className="text-2xl font-black text-white leading-none">{initiativeValue}</div>
                                                        <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a]">Iniciativa</span>
                                                    </div>
                                                </div>

                                                <label className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1a2a1a] bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] w-fit">
                                                    <input type="checkbox" id="inspiration" checked={!!draft.inspiration} onChange={(e) => updateDraft('inspiration', e.target.checked)} className="accent-[#00ff66] w-3 h-3 cursor-pointer" />
                                                    Inspiração
                                                </label>
                                            </div>
                                        </div>

                                        {/* COLUNA DIREITA */}
                                        <div className="space-y-3">
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
                                                <div className="bg-black/40 border border-[#1a2a1a] p-3 rounded-xl">
                                                    <h3 className="text-[13px] text-[#4a5a4a] font-black uppercase mb-2 flex items-center gap-2">
                                                        <ShieldAlert size={11} /> Salvaguardas
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                            const proficient = draft.savingThrows?.[s];
                                                            const mod = getModifier(draft.stats[s]);
                                                            const total = mod + (proficient ? (draft.proficiencyBonus ?? 2) : 0);
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

                                                <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl">
                                                    <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase mb-3 flex items-center gap-2">
                                                        <Sparkles size={12} /> Traços de Raça & Magias
                                                    </h3>
                                                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 mb-2">
                                                        {RACE_DATA[draft.race]?.traits.split(', ').map((trait) => (
                                                            <div key={trait} className="bg-[#0a1a0a] p-1.5 rounded border border-[#1a2a1a]/60 flex justify-between items-center">
                                                                <span className="text-[13px] uppercase font-bold text-[#4a7a4a]">{trait}</span>
                                                                <span className="text-[14px] text-[#2a4a2a] font-black uppercase">Raça</span>
                                                            </div>
                                                        ))}
                                                        {RACE_DATA[draft.race]?.traits && draft.spells?.length > 0 && <div className="border-t border-[#1a2a1a] my-1" />}
                                                        {draft.spells?.map((spell: { id: number; name: string }) => (
                                                            <div key={spell.id} className="bg-black/60 p-1.5 rounded border border-[#1a2a1a] flex justify-between items-center">
                                                                <span className="text-[13px] uppercase font-bold text-gray-300">{spell.name}</span>
                                                                <button onClick={() => removeSpell(spell.id)} className="text-red-500/60 hover:text-red-400 transition-colors ml-2 shrink-0"><Trash2 size={10} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SEÇÃO ATUALIZADA: EDIÇÃO DE HABILIDADES COM DESCRIÇÃO DETALHADA */}
                                <div className="bg-black/40 border border-[#1a2a1a] p-4 rounded-xl mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase flex items-center gap-2">
                                            <Sparkles size={13} /> Customização de Habilidades
                                        </h3>
                                        {!readOnly && (
                                            <button
                                                onClick={() => {
                                                    const novaSkill = { id: crypto.randomUUID(), nome: 'Nova Habilidade', custo: '-', desc: '' };
                                                    updateDraft('customSkills', [...(draft.customSkills || []), novaSkill]);
                                                }}
                                                className="text-[10px] bg-[#1a2a1a] hover:bg-[#00ff66]/10 border border-[#4a5a4a] hover:border-[#00ff66]/40 text-gray-300 hover:text-[#00ff66] px-2 py-1 rounded font-bold uppercase transition-all"
                                            >
                                                + Habilidade
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {draft.customSkills?.length ? draft.customSkills.map((skill: any, idx: number) => (
                                            <div key={skill.id || idx} className="bg-black/40 rounded-lg border border-[#1a2a1a] p-3">
                                                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        value={skill.nome}
                                                        placeholder="Nome da Habilidade"
                                                        onChange={(e) => {
                                                            const novas = [...(draft.customSkills || [])];
                                                            novas[idx].nome = e.target.value;
                                                            updateDraft('customSkills', novas);
                                                        }}
                                                        className="w-full sm:flex-1 bg-black/50 border border-[#1a2a1a] rounded px-2 py-1 text-[12px] text-white font-black uppercase tracking-wide focus:border-[#00ff66]/40 outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={skill.custo}
                                                        placeholder="Custo (ex: 2 PM, 1/descanso)"
                                                        onChange={(e) => {
                                                            const novas = [...(draft.customSkills || [])];
                                                            novas[idx].custo = e.target.value;
                                                            updateDraft('customSkills', novas);
                                                        }}
                                                        className="w-full sm:w-44 bg-black/50 border border-[#1a2a1a] rounded px-2 py-1 text-[12px] text-center text-[#f1e5ac] font-bold focus:border-[#00ff66]/40 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const novas = (draft.customSkills || []).filter((_, sIdx) => sIdx !== idx);
                                                            updateDraft('customSkills', novas);
                                                        }}
                                                        className="text-red-500/70 hover:text-red-400 p-1 text-[12px] font-bold uppercase shrink-0 transition-colors self-end sm:self-auto"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={skill.desc}
                                                    placeholder="Descrição detalhada e mecânicas da habilidade..."
                                                    onChange={(e) => {
                                                        const novas = [...(draft.customSkills || [])];
                                                        novas[idx].desc = e.target.value;
                                                        updateDraft('customSkills', novas);
                                                    }}
                                                    rows={2}
                                                    className="w-full bg-black/30 border border-[#1a2a1a] rounded p-1.5 text-[12px] text-gray-400 leading-relaxed resize-none focus:border-[#00ff66]/40 outline-none"
                                                />
                                            </div>
                                        )) : (
                                            <p className="text-[12px] text-[#4a5a4a] py-2 text-center">Nenhuma habilidade customizada criada.</p>
                                        )}
                                    </div>
                                </div>

                                {/* PERÍCIAS */}
                                <div className={`bg-black border border-[#1a2a1a] p-3 rounded-xl mt-5 ${readOnly ? 'pointer-events-none select-none' : ''}`}>
                                    <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase mb-3 text-center">Perícias</h3>
                                    <div className="grid grid-cols-2 gap-1">
                                        {Object.entries(skillsData).map(([key, info]) => {
                                            const mod = getModifier(draft.stats[info.attr]);
                                            const proficient = draft.skills?.[key];
                                            const total = mod + (proficient ? (draft.proficiencyBonus ?? 2) : 0);
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

                                {/* INVENTÁRIO INTEGRALMENTE REPOSTO */}
                                <div className={`bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl mt-3 ${readOnly ? 'pointer-events-none select-none' : ''}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-[#00ff66] text-[13px] font-black uppercase flex items-center gap-2">
                                            <Box size={12} /> Inventário
                                        </h3>
                                        {!readOnly && (
                                            <button onClick={() => { resetInventoryForm(); setShowInventoryForm(true); }} className="w-7 h-7 rounded-md bg-[#00ff66] text-black flex items-center justify-center text-base font-black transition-all hover:brightness-110 shadow-[0_0_8px_rgba(0,255,102,0.5)]" title="Adicionar item">
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* DINHEIRO minimalista */}
                                    <div className="bg-black/30 rounded-lg p-2 mb-3 border border-[#1a2a1a]">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-[#f1e5ac] tracking-wider flex items-center gap-1">💰 Troco</span>
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

                                    {/* Lista de itens */}
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
                                                        <div className="flex gap-1 shrink-0">
                                                            {item.ataque && (
                                                                <button onClick={() => rollWeaponFormula(item.nome || item.name || 'arma', item.ataque ?? '', 'ataque', item.atributo)} className="bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 py-0.5 rounded text-[10px] font-black uppercase hover:bg-[#f1e5ac]/20 transition-colors">ATK</button>
                                                            )}
                                                            {item.dano && (
                                                                <button onClick={() => rollWeaponFormula(item.nome || item.name || 'arma', item.dano ?? '', 'dano', item.atributo)} className="bg-[#1a0a0a] border border-red-900/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-colors">DANO</button>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="w-6 h-6 flex items-center justify-center rounded-md border border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/40 hover:text-[#00ff66] transition-all shrink-0">
                                                            <span className={`text-[9px] transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                                                        </button>
                                                    </div>
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-80' : 'max-h-0'}`}>
                                                        <div className="space-y-2 border-t border-[#1a2a1a] p-2 bg-black/20">
                                                            {item.atributo && <span className="inline-block bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 py-0.5 rounded text-[11px] font-black uppercase">{weaponAttributeLabels[item.atributo]}</span>}
                                                            {item.categoria === 'armadura' && (item.tipoArmadura || item.caBase !== undefined) && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {item.tipoArmadura && <span className="bg-blue-900/30 border border-blue-800/40 text-blue-300 px-2 py-0.5 rounded text-[11px] font-black uppercase">{item.tipoArmadura}</span>}
                                                                    {item.caBase !== undefined && <span className="bg-blue-900/30 border border-blue-800/40 text-blue-300 px-2 py-0.5 rounded text-[11px] font-black uppercase">CA base: {item.caBase}</span>}
                                                                </div>
                                                            )}
                                                            {item.categoria === 'consumivel' && item.efeito && <span className="inline-block bg-purple-900/30 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded text-[11px] font-black">Efeito: {item.efeito}</span>}
                                                            {item.desc && <p className="text-[12px] text-gray-400 leading-relaxed">{item.desc}</p>}
                                                            <div className="flex justify-end gap-3 pt-1">
                                                                <button onClick={() => editInventoryItem(item)} className="flex items-center gap-1 text-[#00ff66] text-[11px] font-bold uppercase hover:text-white transition-colors"><Pencil size={11} /> Editar</button>
                                                                <button onClick={() => removeInventoryItem(item.id)} className="flex items-center gap-1 text-red-500/70 text-[11px] font-bold uppercase hover:text-red-400 transition-colors"><Trash2 size={11} /> Excluir</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <p className="text-[13px] text-[#4a5a4a] py-2 text-center">Inventário vazio.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}