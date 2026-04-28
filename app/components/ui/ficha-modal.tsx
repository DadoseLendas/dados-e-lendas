'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, Shield, Zap, ShieldAlert, Sparkles, Box, Save, Trash2, Pencil, Sword, ShieldHalf, FlaskConical, Backpack, Wand2
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

// ─── Categorias de inventário ─────────────────────────────────────────────────
type ItemCategoria = 'arma' | 'armadura' | 'consumivel' | 'item';

const CATEGORIAS_CONFIG = {
    arma: { label: 'Arma', icon: <Sword size={16} />, cor: 'text-green-500' },
    armadura: { label: 'Armadura', icon: <Shield size={16} />, cor: 'text-blue-500' },
    consumivel: { label: 'Consumível', icon: <FlaskConical size={16} />, cor: 'text-purple-500' },
    item: { label: 'Item', icon: <Backpack size={16} />, cor: 'text-amber-500' },
};

// DEFINIÇÃO ADICIONADA: mapeamento de categoria para rótulo curto (usado nos botões)
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

// ─── Utilitários ──────────────────────────────────────────────────────────────
const getModifier = (value: number) => {
    const normalizedValue = Math.floor(Number(value) || 0);
    return Math.floor((normalizedValue - 10) / 2);
};
const fmtMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

// ─── Tipos ────────────────────────────────────────────────────────────────────
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
    inventory: InventoryItem[];
    spells: { id: number; name: string; level?: string }[];
    img: string;
    imgOffsetX?: number;
    imgOffsetY?: number;
};

type InventoryItem = {
    id: number;
    name?: string;
    nome?: string;
    categoria?: ItemCategoria;
    tipo?: string;
    // Arma
    atributo?: WeaponAttribute;
    ataque?: string;
    dano?: string;
    // Armadura
    caBase?: number;
    tipoArmadura?: string;
    // Consumível
    quantidade?: number;
    efeito?: string;
    // Compartilhado
    desc?: string;
};

type InventoryFormState = {
    nome: string;
    categoria: ItemCategoria;
    tipo: string;
    // Arma
    atributo: WeaponAttribute | '';
    ataque: string;
    dano: string;
    // Armadura
    caBase: string;
    tipoArmadura: string;
    // Consumível
    quantidade: string;
    efeito: string;
    // Compartilhado
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

// ─── Ícones por categoria (movido para fora do loop) ─────────────────────────
const categoriaIcons: Record<ItemCategoria, React.ReactNode> = {
    arma: <Sword size={14} className="text-[#00ff66]" />,
    armadura: <Shield size={14} className="text-[#4a9eff]" />,
    consumivel: <FlaskConical size={14} className="text-[#e5acff]" />,
    item: <Box size={14} className="text-[#f1e5ac]" />,
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FichaModal({ isOpen, onClose, characterId, onUpdate, campaignId, onRollDice, readOnly = false }: FichaModalProps) {
    const supabase = createClient();
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
    const [rollPopup, setRollPopup] = useState<{ label: string; modifier: number } | null>(null);
    const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);
            setCurrentUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Aventureiro');
        };
        fetchUser();
    }, [supabase]);

    useEffect(() => {
        if (!campaignId || campaignId === '00000000-0000-0000-0000-000000000000') return;
        const ch = supabase.channel(`chat_room_${campaignId}`);
        ch.subscribe();
        broadcastChannelRef.current = ch;
        return () => { supabase.removeChannel(ch); };
    }, [campaignId, supabase]);

    // ── Rolagem de dados ────────────────────────────────────────────────────
    const rollD20 = (label: string, modifier: number) => {
        setRollPopup({ label, modifier });
    };

    const executeRoll = async (mode: 'normal' | 'advantage' | 'disadvantage') => {
        if (!rollPopup) return;
        const { label, modifier } = rollPopup;
        setRollPopup(null);

        const rawResult = await onRollDice('d20', false, mode);
        if (rawResult === null) return;

        // Tipagem segura para extrair o valor final e o array de dados (se houver)
        const resultObj = typeof rawResult === 'object' && rawResult !== null
            ? (rawResult as { finalValue: number; values?: number[]; rollMode?: string })
            : null;

        const finalValue = resultObj ? Number(resultObj.finalValue) : Number(rawResult);
        const total = finalValue + modifier;
        const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;

        let textPublico = '';

        // Se for rolagem normal, ou se a função não retornar os 2 valores
        if (mode === 'normal' || !resultObj || !resultObj.values || resultObj.values.length < 2) {
            textPublico = `rolou ${label} (d20${modStr}): **${total}**`;
        } else {
            // Lógica detalhada para mostrar os dois dados, as somas e destacar o vencedor
            const v1 = resultObj.values[0];
            const v2 = resultObj.values[1];

            const isV1Chosen = mode === 'advantage' ? v1 >= v2 : v1 <= v2;

            const res1 = v1 + modifier;
            const res2 = v2 + modifier;

            // Aplica negrito apenas na conta inteira do dado que foi o escolhido
            const str1 = isV1Chosen ? `**${v1}${modStr}=${res1}**` : `${v1}${modStr}=${res1}`;
            const str2 = !isV1Chosen ? `**${v2}${modStr}=${res2}**` : `${v2}${modStr}=${res2}`;

            const modoTexto = mode === 'advantage' ? 'Vantagem' : 'Desvantagem';
            textPublico = `rolou ${label} com ${modoTexto} (d20${modStr}), dado 1: ${str1}, dado 2: ${str2}, resultado **${total}**`;
        }

        if (currentUserId) {
            const { data } = await supabase.from('chat_messages').insert([{
                campaign_id: campaignId,
                user_name: currentUserName,
                text: textPublico,
                is_roll: true,
                is_secret: false,
                channel: 'campanha',
                sender_id: currentUserId,
            }]).select().single();
            if (data && broadcastChannelRef.current) {
                broadcastChannelRef.current.send({ type: 'broadcast', event: 'new_message', payload: data });
            }
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
            const { data } = await supabase.from('chat_messages').insert([{
                campaign_id: campaignId,
                user_name: currentUserName,
                text: `${currentUserName} rolou ${label} da arma ${itemName}: ${resolvedFormula} = ${finalValue}`,
                is_roll: true,
                is_secret: false,
                channel: 'campanha',
                sender_id: currentUserId,
            }]).select().single();
            if (data && broadcastChannelRef.current) {
                broadcastChannelRef.current.send({ type: 'broadcast', event: 'new_message', payload: data });
            }
        }
    };

    // ── Enquadramento ────────────────────────────────────────────────────────
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

    // ── Helpers de edição ────────────────────────────────────────────────────
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
    };

    const removeInventoryItem = (id: number) =>
        setDraft(prev => prev ? { ...prev, inventory: prev.inventory.filter(i => i.id !== id) } : prev);

    const removeSpell = (id: number) =>
        setDraft(prev => prev ? { ...prev, spells: prev.spells.filter(s => s.id !== id) } : prev);

    // ── Salvar no Supabase ───────────────────────────────────────────────────
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

    // ── Estilos comuns ────────────────────────────────────────────────────────
    const inputCls = "w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors";
    const selectCls = "w-full bg-[#050a05] border border-[#1a2a1a] px-2 py-1 text-[14px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors cursor-pointer";
    const numInputCls = "w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-[14px] rounded text-[#00ff66] font-bold text-center outline-none focus:border-[#00ff66]/50 transition-colors";

    // ── Barra de vida ─────────────────────────────────────────────────────────
    const HealthBar = ({ current, max }: { current: number; max: number }) => {
        const pct = Math.min(Math.max(max > 0 ? (current / max) * 100 : 0, 0), 100);
        const color = pct > 50 ? 'bg-[#00ff66]' : pct > 20 ? 'bg-yellow-500' : 'bg-red-600';
        return (
            <div className="w-full">
                <div className="flex justify-between text-[14px] font-black uppercase mb-1 text-[#4a5a4a]">
                    <span>Pontos de Vida</span>
                    <span>{current} / {max}</span>
                </div>
                <div className="w-full h-3 bg-black border border-[#1a2a1a] rounded-full overflow-hidden">
                    <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    };

    return (
    <>
    {rollPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-72 shadow-[0_0_50px_rgba(0,0,0,0.95)]">
                <h3 className="text-[#f1e5ac] text-sm font-black uppercase tracking-widest text-center mb-1">
                    {rollPopup.label}
                </h3>
                <p className="text-[#4a5a4a] text-[10px] uppercase tracking-widest text-center mb-5">
                    d20 {rollPopup.modifier >= 0 ? `+${rollPopup.modifier}` : rollPopup.modifier}
                </p>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => executeRoll('disadvantage')}
                        className="bg-red-700 hover:bg-red-600 text-white font-black text-[11px] uppercase tracking-wide py-3 px-2 rounded-xl transition-all">
                        Desvant.
                    </button>
                    <button onClick={() => executeRoll('normal')}
                        className="bg-[#00ff66] text-black font-black text-[11px] uppercase tracking-wide py-3 px-2 rounded-xl hover:brightness-110 transition-all">
                        Normal
                    </button>
                    <button onClick={() => executeRoll('advantage')}
                        className="bg-green-700 hover:bg-green-600 text-white font-black text-[11px] uppercase tracking-wide py-3 px-2 rounded-xl transition-all">
                        Vantagem
                    </button>
                </div>
                <button onClick={() => setRollPopup(null)}
                    className="w-full mt-3 text-[10px] text-[#4a5a4a] hover:text-white uppercase tracking-widest transition-colors">
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

                            {/* Layout: 2 colunas */}
                            <div className={`grid grid-cols-2 gap-5 ${readOnly ? 'pointer-events-none select-none' : ''}`}>

                                {/* ── COLUNA 1 ─────────────────────────── */}
                                <div className="space-y-3">

                                    {/* Foto */}
                                    <div className="bg-[#050a05] border border-[#1a2a1a] p-2 rounded-2xl flex flex-col items-center w-fit mx-auto">
                                        <div
                                            className="w-36 h-36 bg-black rounded-xl bg-cover border border-[#1a2a1a] cursor-pointer hover:brightness-110 transition-all relative group"
                                            style={{
                                                backgroundImage: `url(${draft.img || '/placeholder.png'})`,
                                                backgroundPosition: `${draft.imgOffsetX ?? 50}% ${draft.imgOffsetY ?? 50}%`
                                            }}
                                            onClick={openFraming}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-xl">
                                                <span className="text-[14px] text-white font-black uppercase tracking-widest text-center px-2">Ajustar enquadramento</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Popup de enquadramento */}
                                    {framingOpen && (
                                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={(e) => e.target === e.currentTarget && setFramingOpen(false)}>
                                            <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-80 space-y-5 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                                                <h3 className="text-[#f1e5ac] text-base font-black uppercase text-center tracking-widest">Enquadramento</h3>
                                                <div
                                                    className="w-full h-40 rounded-xl bg-cover border border-[#1a2a1a] mx-auto"
                                                    style={{
                                                        backgroundImage: `url(${draft.img || '/placeholder.png'})`,
                                                        backgroundPosition: `${tempOffsetX}% ${tempOffsetY}%`
                                                    }}
                                                />
                                                <div>
                                                    <label className="block text-[#4a5a4a] text-[14px] font-black uppercase tracking-widest mb-2">Horizontal ({tempOffsetX}%)</label>
                                                    <input type="range" min={0} max={100} value={tempOffsetX} onChange={(e) => setTempOffsetX(Number(e.target.value))} className="w-full accent-[#00ff66] cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="block text-[#4a5a4a] text-[14px] font-black uppercase tracking-widest mb-2">Vertical ({tempOffsetY}%)</label>
                                                    <input type="range" min={0} max={100} value={tempOffsetY} onChange={(e) => setTempOffsetY(Number(e.target.value))} className="w-full accent-[#00ff66] cursor-pointer" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setFramingOpen(false)} className="flex-1 border border-[#1a2a1a] text-[#4a5a4a] text-[14px] font-black uppercase py-2 rounded-lg hover:border-[#00ff66]/40 transition-all">Cancelar</button>
                                                    <button onClick={saveFraming} disabled={savingFrame} className="flex-1 bg-[#00ff66] text-black text-[14px] font-black uppercase py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50">{savingFrame ? 'Salvando...' : 'Salvar'}</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Infos Básicas */}
                                    <div className="bg-black/60 border border-[#1a2a1a] p-2 rounded-xl grid grid-cols-2 gap-1.5">
                                        <div className="col-span-2">
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Nome</label>
                                            <input className={inputCls + " text-center"} value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Raça</label>
                                            <select className={selectCls} value={draft.race} onChange={(e) => updateDraft('race', e.target.value)}>
                                                {Object.keys(RACE_DATA).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Classe</label>
                                            <select className={selectCls} value={draft.class} onChange={(e) => updateDraft('class', e.target.value)}>
                                                {Object.keys(CLASS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            {CLASS_DATA[draft.class] && (
                                                <div className="mt-0.5 flex justify-between text-[14px] text-[#4a5a4a] font-black uppercase px-1">
                                                    <span>{CLASS_DATA[draft.class].hp} +con</span>
                                                    <span>{CLASS_DATA[draft.class].primaryAttr}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Nível</label>
                                            <input type="number" min={1} max={20} className={numInputCls} value={draft.level ?? 1} onChange={(e) => updateDraft('level', Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">XP</label>
                                            <input type="number" min={0} className={inputCls + " text-[#f1e5ac] text-center"} value={draft.experiencePoints ?? 0} onChange={(e) => updateDraft('experiencePoints', Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Alinhamento</label>
                                            <input className={inputCls} value={draft.alignment || ''} onChange={(e) => updateDraft('alignment', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Antecedente</label>
                                            <input className={inputCls} value={draft.background || ''} onChange={(e) => updateDraft('background', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[14px] text-[#4a5a4a] font-black uppercase">Bônus Prof.</label>
                                            <input type="number" min={2} max={6} className={numInputCls} value={draft.proficiencyBonus ?? 2} onChange={(e) => updateDraft('proficiencyBonus', Number(e.target.value))} />
                                        </div>
                                        <div className="flex items-center gap-2 col-span-2 mt-1">
                                            <input type="checkbox" id="inspiration" checked={!!draft.inspiration} onChange={(e) => updateDraft('inspiration', e.target.checked)} className="accent-[#00ff66] w-3 h-3 cursor-pointer" />
                                            <label htmlFor="inspiration" className="text-[13px] text-[#4a5a4a] font-black uppercase cursor-pointer">Inspiração</label>
                                        </div>
                                    </div>

                                    {/* CA e Iniciativa */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                                            <Shield className="mx-auto text-[#00ff66] mb-1" size={16} />
                                            <input type="number" min={0} className="w-full bg-transparent text-2xl font-black text-white text-center outline-none border-b border-[#1a2a1a] focus:border-[#00ff66]/50" value={draft.ac ?? 10} onChange={(e) => updateDraft('ac', Number(e.target.value))} />
                                            <span className="text-[14px] text-[#4a5a4a] font-black uppercase">Armadura</span>
                                        </div>
                                        <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                                            <Zap className="mx-auto text-[#f1e5ac] mb-1" size={16} />
                                            <div className="text-2xl font-black text-white">
                                                {fmtMod(getModifier(draft.stats.dex))}
                                            </div>
                                            <span className="text-[14px] text-[#4a5a4a] font-black uppercase">Iniciativa</span>
                                        </div>
                                    </div>

                                    {/* HP */}
                                    <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl space-y-2">
                                        <HealthBar current={draft.hp_current} max={draft.hp_max} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[14px] text-[#4a5a4a] font-black uppercase">HP Atual</label>
                                                <input type="number" className={numInputCls} value={draft.hp_current ?? 0} onChange={(e) => updateDraft('hp_current', Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="text-[14px] text-[#4a5a4a] font-black uppercase">HP Máx</label>
                                                <input type="number" className={numInputCls + " text-white"} value={draft.hp_max ?? 0} onChange={(e) => updateDraft('hp_max', Number(e.target.value))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── COLUNA 2 ─────────────────────────── */}
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

                                    {/* Salvaguardas */}
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

                                    {/* Magias & Habilidades */}
                                    <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl">
                                        <h3 className="text-[#f1e5ac] text-[13px] font-black uppercase mb-3 flex items-center gap-2">
                                            <Sparkles size={12} /> Magias &amp; Habilidades
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

                                    {/* ── INVENTÁRIO ───────────────────── */}
                                    <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl">
                                        <h3 className="text-[#00ff66] text-[13px] font-black uppercase mb-2 flex items-center gap-2">
                                            <Box size={12} /> Inventário
                                        </h3>

                                        {draft.inventory?.length ? draft.inventory.map((item: InventoryItem) => {
                                            const isExpanded = expandedItemId === item.id;
                                            const cat = item.categoria || 'item';
                                            return (
                                                <div key={item.id} className="bg-black/40 p-2 rounded border border-[#1a2a1a] mb-2 last:mb-0">
                                                    <div className="flex justify-between items-center flex-wrap gap-2">
                                                        <div
                                                            className="flex-1 min-w-0 cursor-pointer hover:bg-white/5 rounded px-1 py-1 transition-colors"
                                                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {categoriaIcons[cat]}
                                                                <span className="block text-[14px] font-black uppercase text-gray-200 truncate">
                                                                    {item.nome || item.name || 'Item sem nome'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[11px] uppercase text-gray-500 ml-5">
                                                                    {item.tipo || item.categoria || 'Item'}
                                                                </span>
                                                                {item.categoria === 'consumivel' && item.quantidade !== undefined && (
                                                                    <span className="bg-purple-900/40 border border-purple-800/40 text-purple-300 px-1.5 rounded text-[10px] font-black">
                                                                        ×{item.quantidade}
                                                                    </span>
                                                                )}
                                                                {item.categoria === 'armadura' && item.caBase !== undefined && (
                                                                    <span className="bg-blue-900/40 border border-blue-800/40 text-blue-300 px-1.5 rounded text-[10px] font-black">
                                                                        CA {item.caBase}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-1 shrink-0">
                                                            {item.ataque && (
                                                                <button
                                                                    onClick={() => rollWeaponFormula(item.nome || item.name || 'arma', item.ataque ?? '', 'ataque', item.atributo)}
                                                                    className="bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider hover:bg-[#f1e5ac]/20 transition-colors"
                                                                >
                                                                    ATK
                                                                </button>
                                                            )}
                                                            {item.dano && (
                                                                <button
                                                                    onClick={() => rollWeaponFormula(item.nome || item.name || 'arma', item.dano ?? '', 'dano', item.atributo)}
                                                                    className="bg-[#1a0a0a] border border-red-900/20 text-red-400 px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider hover:bg-red-600 hover:text-white transition-colors"
                                                                >
                                                                    DANO
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                                            className="text-[#4a5a4a] hover:text-[#00ff66] transition-colors p-1 shrink-0"
                                                        >
                                                            {isExpanded ? '▲' : '▼'}
                                                        </button>
                                                    </div>

                                                    {/* Conteúdo expandido */}
                                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 mt-2' : 'max-h-0'}`}>
                                                        <div className="space-y-2 border-t border-[#1a2a1a] pt-2">
                                                            {item.atributo && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    <span className="bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider">
                                                                        {weaponAttributeLabels[item.atributo]}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {item.categoria === 'armadura' && (item.tipoArmadura || item.caBase !== undefined) && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {item.tipoArmadura && (
                                                                        <span className="bg-blue-900/30 border border-blue-800/40 text-blue-300 px-2 py-1 rounded text-[11px] font-black uppercase">
                                                                            {item.tipoArmadura}
                                                                        </span>
                                                                    )}
                                                                    {item.caBase !== undefined && (
                                                                        <span className="bg-blue-900/30 border border-blue-800/40 text-blue-300 px-2 py-1 rounded text-[11px] font-black uppercase">
                                                                            CA base: {item.caBase}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {item.categoria === 'consumivel' && item.efeito && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    <span className="bg-purple-900/30 border border-purple-800/40 text-purple-300 px-2 py-1 rounded text-[11px] font-black">
                                                                        Efeito: {item.efeito}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {item.desc && (
                                                                <p className="text-[12px] text-gray-400 leading-relaxed">{item.desc}</p>
                                                            )}
                                                            <div className="flex justify-end gap-3 pt-1">
                                                                <button
                                                                    onClick={() => editInventoryItem(item)}
                                                                    className="flex items-center gap-1 text-[#00ff66] text-[12px] font-bold uppercase hover:text-white transition-colors"
                                                                >
                                                                    <Pencil size={12} /> Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => removeInventoryItem(item.id)}
                                                                    className="flex items-center gap-1 text-red-500/70 text-[12px] font-bold uppercase hover:text-red-400 transition-colors"
                                                                >
                                                                    <Trash2 size={12} /> Excluir
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <p className="text-[13px] text-[#4a5a4a] py-1 text-center">Inventário vazio.</p>
                                        )}
                                    </div>

                                    {/* ── Formulário de adição/edição ── */}
                                    <div className="space-y-2 border-t border-[#1a2a1a] pt-3">
                                        <div className="grid grid-cols-4 gap-1">
                                            {(Object.keys(CATEGORIA_LABELS) as ItemCategoria[]).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setNewInventoryItem(prev => ({ ...prev, categoria: cat }))}
                                                    className={`text-[10px] font-black uppercase py-1.5 rounded border transition-all ${newInventoryItem.categoria === cat
                                                        ? 'bg-[#00ff66]/20 border-[#00ff66]/60 text-[#00ff66]'
                                                        : 'bg-black/40 border-[#1a2a1a] text-[#4a5a4a] hover:border-[#00ff66]/30 hover:text-[#8a9a8a]'
                                                        }`}
                                                >
                                                    {CATEGORIA_LABELS[cat]}
                                                </button>
                                            ))}
                                        </div>

                                        <input
                                            className={inputCls}
                                            placeholder={
                                                newInventoryItem.categoria === 'arma' ? 'Nome da arma' :
                                                    newInventoryItem.categoria === 'armadura' ? 'Nome da armadura' :
                                                        newInventoryItem.categoria === 'consumivel' ? 'Nome do consumível' :
                                                            'Nome do item'
                                            }
                                            value={newInventoryItem.nome}
                                            onChange={(e) => setNewInventoryItem(prev => ({ ...prev, nome: e.target.value }))}
                                        />

                                        {newInventoryItem.categoria === 'arma' && (
                                            <>
                                                <select
                                                    className={selectCls}
                                                    value={newInventoryItem.atributo}
                                                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, atributo: e.target.value as WeaponAttribute }))}
                                                >
                                                    <option value="">Sem atributo</option>
                                                    {WEAPON_ATTRIBUTE_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>{weaponAttributeLabels[opt]}</option>
                                                    ))}
                                                </select>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        className={inputCls}
                                                        placeholder="ATK (ex: 1d20+3)"
                                                        value={newInventoryItem.ataque}
                                                        onChange={(e) => setNewInventoryItem(prev => ({ ...prev, ataque: e.target.value }))}
                                                    />
                                                    <input
                                                        className={inputCls}
                                                        placeholder="DANO (ex: 1d8+3)"
                                                        value={newInventoryItem.dano}
                                                        onChange={(e) => setNewInventoryItem(prev => ({ ...prev, dano: e.target.value }))}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {newInventoryItem.categoria === 'armadura' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    className={selectCls}
                                                    value={newInventoryItem.tipoArmadura}
                                                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, tipoArmadura: e.target.value }))}
                                                >
                                                    <option value="">Tipo de armadura</option>
                                                    {TIPO_ARMADURA_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className={numInputCls}
                                                    placeholder="CA base"
                                                    value={newInventoryItem.caBase}
                                                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, caBase: e.target.value }))}
                                                />
                                            </div>
                                        )}

                                        {newInventoryItem.categoria === 'consumivel' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className={numInputCls}
                                                    placeholder="Qtd"
                                                    value={newInventoryItem.quantidade}
                                                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, quantidade: e.target.value }))}
                                                />
                                                <input
                                                    className={inputCls}
                                                    placeholder="Efeito (ex: Cura 2d4+2)"
                                                    value={newInventoryItem.efeito}
                                                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, efeito: e.target.value }))}
                                                />
                                            </div>
                                        )}

                                        {newInventoryItem.categoria === 'item' && (
                                            <input
                                                className={inputCls}
                                                placeholder="Subtipo (ex: Ferramenta, Chave, Joia...)"
                                                value={newInventoryItem.tipo}
                                                onChange={(e) => setNewInventoryItem(prev => ({ ...prev, tipo: e.target.value }))}
                                            />
                                        )}

                                        <textarea
                                            className={inputCls + ' h-14 resize-none'}
                                            placeholder="Descrição (opcional)"
                                            value={newInventoryItem.desc}
                                            onChange={(e) => setNewInventoryItem(prev => ({ ...prev, desc: e.target.value }))}
                                        />

                                        <div className="flex gap-2">
                                            <button
                                                onClick={addInventoryItem}
                                                className="flex-1 bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] px-2 py-1.5 rounded hover:bg-[#00ff66]/20 transition-colors text-[12px] font-black uppercase"
                                            >
                                                {editingInventoryId !== null ? 'Salvar edição' : 'Adicionar'}
                                            </button>
                                            {editingInventoryId !== null && (
                                                <button
                                                    onClick={resetInventoryForm}
                                                    className="bg-black/40 border border-[#1a2a1a] text-[#4a5a4a] px-2 rounded hover:border-[#00ff66]/40 transition-colors text-[12px] font-black uppercase"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Perícias (fora das colunas, ocupando largura total) */}
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
                        </>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}