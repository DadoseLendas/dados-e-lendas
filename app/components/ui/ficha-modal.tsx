'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, Shield, Zap, ShieldAlert, Sparkles, Box, Save, Plus, Trash2,
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

// ─── Utilitários ──────────────────────────────────────────────────────────────
const getModifier = (value: number) => Math.floor((value - 10) / 2);
const getTotalStat = (statKey: string, baseValue: number, race: string) => {
    const raceBonus = RACE_DATA[race]?.stats[statKey] ?? 0;
    return baseValue + raceBonus;
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
    inventory: { id: number; name: string }[];
    spells: { id: number; name: string; level?: string }[];
    img: string;
    imgOffsetX?: number;
    imgOffsetY?: number;
};

interface FichaModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: number | string | null;
    onUpdate?: (character: Character) => void;
    campaignId: string;
    onRollDice: (diceType: string, isSecret: boolean) => Promise<number | null>;
    readOnly?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function FichaModal({ isOpen, onClose, characterId, onUpdate, campaignId, onRollDice, readOnly = false }: FichaModalProps) {
    const supabase = createClient();
    //const [character, setCharacter] = useState<Character | null>(null);
    const [draft, setDraft] = useState<Character | null>(null);
    const [initialChar, setInitialChar] = useState<Character | null>(null); // NOVO
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [newInventoryItem, setNewInventoryItem] = useState('');
    const [newSpellName, setNewSpellName] = useState('');
    const [currentUserName, setCurrentUserName] = useState('Aventureiro');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);
            setCurrentUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Aventureiro');
        };
        fetchUser();
    }, [supabase]);

    // ── Rolagem de dados ────────────────────────────────────────────────────
    const rollD20 = async (label: string, modifier: number) => {
        const result = await onRollDice('d20', false);
        if (!result) return;
        const total = result + modifier;
        if (currentUserId) {
            const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
            await supabase.from('chat_messages').insert([{
                campaign_id: campaignId,
                user_name: currentUserName,
                text: `rolou ${label} (d20${modStr}): ${total}`,
                is_roll: true,
                is_secret: false,
                channel: 'campanha',
                sender_id: currentUserId,
            }]);
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
        //setCharacter(updated);
        setDraft(updated);
        onUpdate?.(updated);
        setSavingFrame(false);
        setFramingOpen(false);
    };

    // ── Helpers de edição ────────────────────────────────────────────────────
    const updateDraft = (field: string, value: unknown) =>
        setDraft(prev => prev ? { ...prev, [field]: value } : prev);

    const updateStat = (key: string, value: number) =>
        setDraft(prev => prev ? { ...prev, stats: { ...prev.stats, [key]: value } } : prev);

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

    const addInventoryItem = () => {
        if (!newInventoryItem.trim() || !draft) return;
        updateDraft('inventory', [...(draft.inventory ?? []), { id: Date.now(), name: newInventoryItem.trim() }]);
        setNewInventoryItem('');
    };

    const removeInventoryItem = (id: number) =>
        setDraft(prev => prev ? { ...prev, inventory: prev.inventory.filter(i => i.id !== id) } : prev);

    const addSpell = () => {
        if (!newSpellName.trim() || !draft) return;
        updateDraft('spells', [...(draft.spells ?? []), { id: Date.now(), name: newSpellName.trim() }]);
        setNewSpellName('');
    };

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
            
            //Verificar as alterações
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
                    is_secret: true, // Garante que o jogador e o mestre saibam que foi logado
                    channel: 'fichas',
                    sender_id: currentUserId,
                }]);
            }
            
            setInitialChar(saved); // Reseta a foto inicial para os novos valores
            // ---------------------------------------------

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
        setSaving(false);
    };
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen || !characterId) return;
        const fetchCharacter = async () => {
            setLoading(true);
            //setCharacter(null);
            setDraft(null);
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('id', characterId)
                .single();
            if (!error && data) {
                setDraft(data as Character);
                setInitialChar(data as Character);//Salva a foto do estado original
            }
            setLoading(false);
        };
        fetchCharacter();
    }, [isOpen, characterId, supabase]);

    // Bloqueia scroll do body enquanto modal está aberto
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    // ── estilos comuns ────────────────────────────────────────────────────────
    const inputCls = "w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-[10px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors";
    const selectCls = "w-full bg-[#050a05] border border-[#1a2a1a] px-2 py-1 text-[10px] rounded text-white outline-none focus:border-[#00ff66]/50 transition-colors cursor-pointer";
    const numInputCls = "w-full bg-black/40 border border-[#1a2a1a] px-2 py-1 text-[10px] rounded text-[#00ff66] font-bold text-center outline-none focus:border-[#00ff66]/50 transition-colors";

    // ── Barra de vida ─────────────────────────────────────────────────────────
    const HealthBar = ({ current, max }: { current: number; max: number }) => {
        const pct = Math.min(Math.max(max > 0 ? (current / max) * 100 : 0, 0), 100);
        const color = pct > 50 ? 'bg-[#00ff66]' : pct > 20 ? 'bg-yellow-500' : 'bg-red-600';
        return (
            <div className="w-full">
                <div className="flex justify-between text-[10px] font-black uppercase mb-1 text-[#4a5a4a]">
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
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[#020502]/95 border border-[#1a2a1a] rounded-2xl shadow-[0_0_80px_rgba(0,255,102,0.06),0_0_60px_rgba(0,0,0,0.9)] w-2/3 min-w-[480px] h-[88vh] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-8">

                    {loading && (
                        <div className="text-center text-[#8a9a8a] text-sm py-20">Carregando ficha...</div>
                    )}
                    {!loading && !draft && (
                        <div className="text-center text-red-400 text-sm py-20">Não foi possível carregar a ficha.</div>
                    )}

                    {!loading && draft && (() => {
                        const raceInfo = RACE_DATA[draft.race];
                        return (
                            <>
                                {/* Barra de navegação */}
                                <div className="flex justify-between items-center mb-6">
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-black transition-colors"
                                    >
                                        <ArrowLeft size={14} /> FECHAR
                                    </button>
                                    <span className="text-[#f1e5ac] text-xs font-serif tracking-widest uppercase italic opacity-60">
                                        Ficha — {draft.name}
                                    </span>
                                    {readOnly ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a4a] border border-[#1a2a1a] px-3 py-1.5 rounded-lg">
                                            Apenas visualização
                                        </span>
                                    ) : (
                                        <button
                                            onClick={saveCharacter}
                                            disabled={saving}
                                            className={`flex items-center gap-2 text-xs font-black uppercase px-4 py-1.5 rounded-lg transition-all ${
                                                saveSuccess
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
                                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${readOnly ? 'pointer-events-none select-none' : ''}`}>

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
                                                    <span className="text-[8px] text-white font-black uppercase tracking-widest text-center px-2">Ajustar enquadramento</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Popup de enquadramento */}
                                        {framingOpen && (
                                            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={(e) => e.target === e.currentTarget && setFramingOpen(false)}>
                                                <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-2xl p-6 w-80 space-y-5 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                                                    <h3 className="text-[#f1e5ac] text-xs font-black uppercase text-center tracking-widest">Enquadramento</h3>
                                                    <div
                                                        className="w-full h-40 rounded-xl bg-cover border border-[#1a2a1a] mx-auto"
                                                        style={{
                                                            backgroundImage: `url(${draft.img || '/placeholder.png'})`,
                                                            backgroundPosition: `${tempOffsetX}% ${tempOffsetY}%`
                                                        }}
                                                    />
                                                    <div>
                                                        <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-widest mb-2">Horizontal ({tempOffsetX}%)</label>
                                                        <input type="range" min={0} max={100} value={tempOffsetX} onChange={(e) => setTempOffsetX(Number(e.target.value))} className="w-full accent-[#00ff66] cursor-pointer" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-widest mb-2">Vertical ({tempOffsetY}%)</label>
                                                        <input type="range" min={0} max={100} value={tempOffsetY} onChange={(e) => setTempOffsetY(Number(e.target.value))} className="w-full accent-[#00ff66] cursor-pointer" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setFramingOpen(false)} className="flex-1 border border-[#1a2a1a] text-[#4a5a4a] text-[10px] font-black uppercase py-2 rounded-lg hover:border-[#00ff66]/40 transition-all">Cancelar</button>
                                                        <button onClick={saveFraming} disabled={savingFrame} className="flex-1 bg-[#00ff66] text-black text-[10px] font-black uppercase py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50">{savingFrame ? 'Salvando...' : 'Salvar'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Infos Básicas */}
                                        <div className="bg-black/60 border border-[#1a2a1a] p-2 rounded-xl grid grid-cols-2 gap-1.5">
                                            <div className="col-span-2">
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Nome</label>
                                                <input className={inputCls + " text-center"} value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Raça</label>
                                                <select className={selectCls} value={draft.race} onChange={(e) => updateDraft('race', e.target.value)}>
                                                    {Object.keys(RACE_DATA).map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Classe</label>
                                                <select className={selectCls} value={draft.class} onChange={(e) => updateDraft('class', e.target.value)}>
                                                    {Object.keys(CLASS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                {CLASS_DATA[draft.class] && (
                                                    <div className="mt-0.5 flex justify-between text-[7px] text-[#4a5a4a] font-black uppercase px-1">
                                                        <span>{CLASS_DATA[draft.class].hp} +con</span>
                                                        <span>{CLASS_DATA[draft.class].primaryAttr}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Nível</label>
                                                <input type="number" min={1} max={20} className={numInputCls} value={draft.level ?? 1} onChange={(e) => updateDraft('level', Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">XP</label>
                                                <input type="number" min={0} className={inputCls + " text-[#f1e5ac] text-center"} value={draft.experiencePoints ?? 0} onChange={(e) => updateDraft('experiencePoints', Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Alinhamento</label>
                                                <input className={inputCls} value={draft.alignment || ''} onChange={(e) => updateDraft('alignment', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Antecedente</label>
                                                <input className={inputCls} value={draft.background || ''} onChange={(e) => updateDraft('background', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[7px] text-[#4a5a4a] font-black uppercase">Bônus Prof.</label>
                                                <input type="number" min={2} max={6} className={numInputCls} value={draft.proficiencyBonus ?? 2} onChange={(e) => updateDraft('proficiencyBonus', Number(e.target.value))} />
                                            </div>
                                            <div className="flex items-center gap-2 col-span-2 mt-1">
                                                <input type="checkbox" id="inspiration" checked={!!draft.inspiration} onChange={(e) => updateDraft('inspiration', e.target.checked)} className="accent-[#00ff66] w-3 h-3 cursor-pointer" />
                                                <label htmlFor="inspiration" className="text-[9px] text-[#4a5a4a] font-black uppercase cursor-pointer">Inspiração</label>
                                            </div>
                                        </div>

                                        {/* CA e Iniciativa */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                                                <Shield className="mx-auto text-[#00ff66] mb-1" size={16} />
                                                <input type="number" min={0} className="w-full bg-transparent text-xl font-black text-white text-center outline-none border-b border-[#1a2a1a] focus:border-[#00ff66]/50" value={draft.ac ?? 10} onChange={(e) => updateDraft('ac', Number(e.target.value))} />
                                                <span className="text-[7px] text-[#4a5a4a] font-black uppercase">Armadura</span>
                                            </div>
                                            <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                                                <Zap className="mx-auto text-[#f1e5ac] mb-1" size={16} />
                                                <div className="text-xl font-black text-white">
                                                    {fmtMod(getModifier(getTotalStat('dex', draft.stats.dex, draft.race)))}
                                                </div>
                                                <span className="text-[7px] text-[#4a5a4a] font-black uppercase">Iniciativa</span>
                                            </div>
                                        </div>

                                        {/* HP */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl space-y-2">
                                            <HealthBar current={draft.hp_current} max={draft.hp_max} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[7px] text-[#4a5a4a] font-black uppercase">HP Atual</label>
                                                    <input type="number" className={numInputCls} value={draft.hp_current ?? 0} onChange={(e) => updateDraft('hp_current', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="text-[7px] text-[#4a5a4a] font-black uppercase">HP Máx</label>
                                                    <input type="number" className={numInputCls + " text-white"} value={draft.hp_max ?? 0} onChange={(e) => updateDraft('hp_max', Number(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── COLUNA 2 ─────────────────────────── */}
                                    <div className="space-y-3">

                                        {/* Atributos */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                const totalVal = getTotalStat(s, draft.stats[s], draft.race);
                                                const mod = getModifier(totalVal);
                                                return (
                                                    <div
                                                        key={s}
                                                        onClick={() => rollD20(statLabels[s], mod)}
                                                        title={`Rolar ${statLabels[s]}`}
                                                        className="bg-black border border-[#1a2a1a] rounded-xl p-2 text-center group relative cursor-pointer hover:border-[#00ff66]/40 transition-colors"
                                                    >
                                                        <span className="text-[8px] text-[#4a5a4a] font-black uppercase">{statLabels[s]}</span>
                                                        <input
                                                            type="number" min={1} max={30}
                                                            className="w-full bg-transparent text-lg font-black text-white text-center outline-none my-0.5 border-b border-[#1a2a1a] focus:border-[#00ff66]/50"
                                                            value={draft.stats[s]}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => updateStat(s, Number(e.target.value))}
                                                        />
                                                        <div className="text-[#00ff66] text-[10px] font-black">{fmtMod(mod)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Salvaguardas */}
                                        <div className="bg-black/40 border border-[#1a2a1a] p-3 rounded-xl">
                                            <h3 className="text-[9px] text-[#4a5a4a] font-black uppercase mb-2 flex items-center gap-2">
                                                <ShieldAlert size={11} /> Salvaguardas
                                            </h3>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                    const proficient = draft.savingThrows?.[s];
                                                    const mod = getModifier(getTotalStat(s, draft.stats[s], draft.race));
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
                                                                <span className="text-[9px] uppercase text-gray-300">{statLabels[s]}</span>
                                                            </div>
                                                            <span className="text-[9px] font-black text-[#00ff66]">{fmtMod(total)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Magias & Habilidades */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl">
                                            <h3 className="text-[#f1e5ac] text-[9px] font-black uppercase mb-3 flex items-center gap-2">
                                                <Sparkles size={12} /> Magias &amp; Habilidades
                                            </h3>
                                            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 mb-2">
                                                {raceInfo?.traits && raceInfo.traits.split(', ').map((trait) => (
                                                    <div key={trait} className="bg-[#0a1a0a] p-1.5 rounded border border-[#1a2a1a]/60 flex justify-between items-center">
                                                        <span className="text-[9px] uppercase font-bold text-[#4a7a4a]">{trait}</span>
                                                        <span className="text-[7px] text-[#2a4a2a] font-black uppercase">Raça</span>
                                                    </div>
                                                ))}
                                                {raceInfo?.traits && draft.spells?.length > 0 && <div className="border-t border-[#1a2a1a] my-1" />}
                                                {draft.spells?.map((spell: { id: number; name: string }) => (
                                                    <div key={spell.id} className="bg-black/60 p-1.5 rounded border border-[#1a2a1a] flex justify-between items-center">
                                                        <span className="text-[9px] uppercase font-bold text-gray-300">{spell.name}</span>
                                                        <button onClick={() => removeSpell(spell.id)} className="text-red-500/60 hover:text-red-400 transition-colors ml-2 shrink-0"><Trash2 size={10} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-1">
                                                <input className={inputCls + " flex-1"} placeholder="Nova magia..." value={newSpellName} onChange={(e) => setNewSpellName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSpell()} />
                                                <button onClick={addSpell} className="bg-[#f1e5ac]/10 border border-[#f1e5ac]/20 text-[#f1e5ac] px-2 rounded hover:bg-[#f1e5ac]/20 transition-colors"><Plus size={10} /></button>
                                            </div>
                                        </div>

                                        {/* Inventário */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-3 rounded-xl">
                                            <h3 className="text-[#00ff66] text-[9px] font-black uppercase mb-2 flex items-center gap-2">
                                                <Box size={12} /> Inventário
                                            </h3>
                                            <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1 mb-2">
                                                {draft.inventory?.length ? draft.inventory.map((item: { id: number; name: string }) => (
                                                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-[#1a2a1a]">
                                                        <span className="text-[9px] uppercase text-gray-400">{item.name}</span>
                                                        <button onClick={() => removeInventoryItem(item.id)} className="text-red-500/60 hover:text-red-400 transition-colors ml-2 shrink-0"><Trash2 size={10} /></button>
                                                    </div>
                                                )) : (
                                                    <p className="text-[9px] text-[#4a5a4a] py-1 text-center">Inventário vazio.</p>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <input className={inputCls + " flex-1"} placeholder="Novo item..." value={newInventoryItem} onChange={(e) => setNewInventoryItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addInventoryItem()} />
                                                <button onClick={addInventoryItem} className="bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] px-2 rounded hover:bg-[#00ff66]/20 transition-colors"><Plus size={10} /></button>
                                            </div>
                                        </div>
                                    </div>

                                </div>{/* fim grid 2 colunas */}

                                {/* ── Perícias — linha completa ─────────────────────────── */}
                                <div className={`bg-black border border-[#1a2a1a] p-3 rounded-xl mt-5 ${readOnly ? 'pointer-events-none select-none' : ''}`}>
                                    <h3 className="text-[#f1e5ac] text-[9px] font-black uppercase mb-3 text-center">Perícias</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
                                        {Object.entries(skillsData).map(([key, info]) => {
                                            const mod = getModifier(getTotalStat(info.attr, draft.stats[info.attr], draft.race));
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
                                                        <span className="text-[9px] uppercase text-gray-300 leading-tight truncate">{info.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-[#00ff66] ml-1 shrink-0">{fmtMod(total)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                </div>


            </div>
        </div>
    );
}
