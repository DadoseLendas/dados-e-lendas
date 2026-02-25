'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, Shield, Zap, ShieldAlert, Sparkles, Box,
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
    id: any;
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
};

interface FichaModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: number | string | null;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function FichaModal({ isOpen, onClose, characterId }: FichaModalProps) {
    const supabase = createClient();
    const [character, setCharacter] = useState<Character | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !characterId) return;
        const fetchCharacter = async () => {
            setLoading(true);
            setCharacter(null);
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('id', characterId)
                .single();
            if (!error && data) setCharacter(data as Character);
            setLoading(false);
        };
        fetchCharacter();
    }, [isOpen, characterId]);

    // Bloqueia scroll do body enquanto modal está aberto
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    // ── Barra de vida (idêntica à página) ─────────────────────────────────────
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
        /* Backdrop — clique fora fecha, mesa visível atrás */
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Painel da ficha — ocupa a maior parte da tela */}
            <div className="bg-[#020502] border border-[#1a2a1a] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] w-full max-w-[1300px] h-[92vh] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-8">

                    {loading && (
                        <div className="text-center text-[#8a9a8a] text-sm py-20">Carregando ficha...</div>
                    )}
                    {!loading && !character && (
                        <div className="text-center text-red-400 text-sm py-20">Não foi possível carregar a ficha.</div>
                    )}

                    {!loading && character && (() => {
                        const raceInfo = RACE_DATA[character.race];

                        return (
                            <>
                                {/* Barra de navegação — mesmo estilo do "VOLTAR" */}
                                <div className="flex justify-between items-center mb-6">
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-black transition-colors"
                                    >
                                        <ArrowLeft size={14} /> FECHAR
                                    </button>
                                    <span className="text-[#f1e5ac] text-xs font-serif tracking-widest uppercase italic opacity-60">
                                        Ficha — {character.name}
                                    </span>
                                </div>

                                {/* Grid idêntico ao da página (12 colunas) */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                    {/* ── COLUNA 1 — col-span-4 ─────────────────────────────── */}
                                    <div className="lg:col-span-4 space-y-4">

                                        {/* Foto */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-2xl">
                                            <div
                                                className="w-full aspect-video bg-black rounded-xl bg-cover bg-center border border-[#1a2a1a]"
                                                style={{ backgroundImage: `url(${character.img || '/placeholder.png'})` }}
                                            />
                                        </div>

                                        {/* Infos Básicas */}
                                        <div className="bg-black/60 border border-[#1a2a1a] p-4 rounded-xl grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Nome</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white text-center">
                                                    {character.name || '—'}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Raça</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white">
                                                    {character.race || '—'}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Classe</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white">
                                                    {character.class || '—'}
                                                </div>
                                                {CLASS_DATA[character.class] && (
                                                    <div className="mt-1 flex justify-between text-[8px] text-[#4a5a4a] font-black uppercase px-1">
                                                        <span>{CLASS_DATA[character.class].hp} +con</span>
                                                        <span>{CLASS_DATA[character.class].primaryAttr}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Nível</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-[#00ff66] font-bold text-center">
                                                    {character.level ?? 1}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">XP</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-[#f1e5ac] text-center">
                                                    {character.experiencePoints ?? 0}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Alinhamento</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white">
                                                    {character.alignment || '—'}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Antecedente</label>
                                                <div className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white">
                                                    {character.background || '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* CA e Iniciativa */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                                                <Shield className="mx-auto text-[#00ff66] mb-1" size={18} />
                                                <div className="text-2xl font-black text-white">{character.ac ?? 10}</div>
                                                <span className="text-[8px] text-[#4a5a4a] font-black uppercase">Classe de Armadura</span>
                                            </div>
                                            <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                                                <Zap className="mx-auto text-[#f1e5ac] mb-1" size={18} />
                                                <div className="text-2xl font-black text-white">
                                                    {fmtMod(getModifier(getTotalStat('dex', character.stats.dex, character.race)))}
                                                </div>
                                                <span className="text-[8px] text-[#4a5a4a] font-black uppercase">Iniciativa</span>
                                            </div>
                                        </div>

                                        {/* HP */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl">
                                            <HealthBar current={character.hp_current} max={character.hp_max} />
                                        </div>
                                    </div>

                                    {/* ── COLUNA 2 — col-span-5 ─────────────────────────────── */}
                                    <div className="lg:col-span-5 space-y-4">

                                        {/* Atributos */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                const totalVal = getTotalStat(s, character.stats[s], character.race);
                                                const mod = getModifier(totalVal);
                                                return (
                                                    <div key={s} className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center">
                                                        <span className="text-[9px] text-[#4a5a4a] font-black uppercase">{statLabels[s]}</span>
                                                        <div className="w-full bg-transparent text-center text-xl font-black text-white my-0.5">
                                                            {character.stats[s]}
                                                        </div>
                                                        <div className="text-[#00ff66] text-xs font-black mt-1">{fmtMod(mod)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Salvaguardas */}
                                        <div className="bg-black/40 border border-[#1a2a1a] p-4 rounded-xl">
                                            <h3 className="text-[9px] text-[#4a5a4a] font-black uppercase mb-3 flex items-center gap-2">
                                                <ShieldAlert size={12} /> Salvaguardas
                                            </h3>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                                                    const proficient = character.savingThrows?.[s];
                                                    const mod = getModifier(getTotalStat(s, character.stats[s], character.race));
                                                    const total = mod + (proficient ? (character.proficiencyBonus ?? 2) : 0);
                                                    return (
                                                        <div key={s} className="flex items-center justify-between border-b border-[#1a2a1a]/50 py-1">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!proficient}
                                                                    readOnly
                                                                    className="accent-[#00ff66] w-3 h-3 pointer-events-none"
                                                                />
                                                                <span className="text-[10px] uppercase text-gray-300">{s}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-[#00ff66]">{fmtMod(total)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Magias e Habilidades */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-5 rounded-xl">
                                            <h3 className="text-[#f1e5ac] text-[10px] font-black uppercase mb-4 flex items-center gap-2">
                                                <Sparkles size={14} /> Magias &amp; Habilidades
                                            </h3>
                                            <div className="max-h-[200px] overflow-y-auto space-y-2 mb-4 pr-2">
                                                {/* Habilidades da Raça */}
                                                {raceInfo?.traits && raceInfo.traits.split(', ').map((trait) => (
                                                    <div
                                                        key={trait}
                                                        className="bg-[#0a1a0a] p-2 rounded border border-[#1a2a1a]/60 flex justify-between items-center"
                                                    >
                                                        <span className="text-[10px] uppercase font-bold text-[#4a7a4a]">{trait}</span>
                                                        <span className="text-[8px] text-[#2a4a2a] font-black uppercase">Raça</span>
                                                    </div>
                                                ))}
                                                {/* Separador */}
                                                {raceInfo?.traits && character.spells?.length > 0 && (
                                                    <div className="border-t border-[#1a2a1a] my-2" />
                                                )}
                                                {/* Spells */}
                                                {character.spells?.map((spell: any) => (
                                                    <div
                                                        key={spell.id}
                                                        className="bg-black/60 p-2 rounded border border-[#1a2a1a] flex justify-between items-center"
                                                    >
                                                        <span className="text-[10px] uppercase font-bold text-gray-300">{spell.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Inventário */}
                                        <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl">
                                            <h3 className="text-[#00ff66] text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                                                <Box size={14} /> Inventário
                                            </h3>
                                            <div className="max-h-[150px] overflow-y-auto space-y-1 mb-2 pr-1">
                                                {character.inventory?.length ? character.inventory.map((item: any) => (
                                                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-[#1a2a1a]">
                                                        <span className="text-[9px] uppercase text-gray-400">{item.name}</span>
                                                    </div>
                                                )) : (
                                                    <p className="text-[10px] text-[#4a5a4a] py-2 text-center">Inventário vazio.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── COLUNA 3 — col-span-3 — Perícias ─────────────────── */}
                                    <div className="lg:col-span-3">
                                        <div className="bg-black border border-[#1a2a1a] p-4 rounded-xl h-full">
                                            <h3 className="text-[#f1e5ac] text-[10px] font-black uppercase mb-4 text-center">Perícias</h3>
                                            <div className="space-y-1 overflow-y-auto pr-2">
                                                {Object.entries(skillsData).map(([key, info]) => {
                                                    const mod = getModifier(getTotalStat(info.attr, character.stats[info.attr], character.race));
                                                    const proficient = character.skills?.[key];
                                                    const total = mod + (proficient ? (character.proficiencyBonus ?? 2) : 0);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between bg-black/40 p-2 rounded border border-[#1a2a1a] hover:border-[#00ff66]/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!proficient}
                                                                    readOnly
                                                                    className="accent-[#00ff66] w-3 h-3 pointer-events-none"
                                                                />
                                                                <span className="text-[9px] uppercase text-gray-300">
                                                                    {info.name} <span className="text-gray-500">({info.attr})</span>
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-[#00ff66]">{fmtMod(total)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
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