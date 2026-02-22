'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal';
import { Sword, Plus, ArrowLeft, ShieldAlert, Heart, Sparkles, Trash2, Save, AlertCircle, BookOpen, Shield, Zap, Package, Box } from 'lucide-react';
import Link from 'next/link';

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
  initiative: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number; };
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  inventory: { id: number; name: string }[];
  spells: { id: number; name: string; level: string }[];
  img: string;
  is_linked?: boolean;
  owner_id?: string;
}

export default function PersonagensPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [editingCharacterImg, setEditingCharacterImg] = useState(false);
  const [tempCharacterImg, setTempCharacterImg] = useState('');
  const [newInventoryItem, setNewInventoryItem] = useState('');
  const [newSpellName, setNewSpellName] = useState('');
  const [newItem, setNewItem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<string>('personagens');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DE CÁLCULO (Adicionado) ---
  const getModifier = (value: number) => Math.floor((value - 10) / 2);
  const getTotalStat = (statKey: string, baseValue: number) => {
    const raceBonus = RACE_DATA[activeCharacter?.race || ""]?.stats[statKey] || 0;
    return baseValue + raceBonus;
  };

  const fetchCharacters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('characters').select('*').eq('owner_id', user.id);
    if (!error && data) setCharacters(data);
  };

  const extractMissingColumn = (message?: string) => {
    if (!message) return null;
    const match = message.match(/Could not find the '([^']+)' column/);
    return match?.[1] ?? null;
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        await fetchCharacters();
      }
      setIsLoadingAuth(false);
    };
    checkUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToDatabase = async (char: Character) => {
    setLoadingAction(true);
    const { data: { user } } = await supabase.auth.getUser();

    let payload: Record<string, any> = {
      ...char,
      is_linked: (char as any).is_linked ?? false,
      owner_id: user?.id
    };

    let saveError: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase.from('characters').upsert(payload);
      if (!error) { saveError = null; break; }
      const missingColumn = extractMissingColumn(error.message);
      if (missingColumn && missingColumn in payload) {
        delete payload[missingColumn];
        saveError = error;
        continue;
      }
      saveError = error;
      break;
    }

    if (saveError) alert("Erro ao salvar: " + saveError.message);
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

    let insertPayload: Record<string, any> = { ...newChar };
    let data: any = null;
    let createError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabase.from('characters').insert([insertPayload]).select('*').single();
      if (!result.error) { data = result.data; createError = null; break; }
      const missingColumn = extractMissingColumn(result.error.message);
      if (missingColumn && missingColumn in insertPayload) {
        delete insertPayload[missingColumn];
        createError = result.error;
        continue;
      }
      createError = result.error;
      break;
    }

    if (createError) alert('Erro ao criar: ' + createError.message);
    if (data) { setCharacters((prev) => [...prev, data]); setActiveCharacter(data); }
    else await fetchCharacters();
  };

  const deleteCharacter = async (id: any) => {
    if (!confirm('Excluir este herói para sempre?')) return;
    const { error } = await supabase.from('characters').delete().eq('id', id);
    if (!error) { setCharacters(characters.filter(c => c.id !== id)); setActiveCharacter(null); }
  };

  const updateCharacter = (field: string, value: any) => {
    if (!activeCharacter) return;
    setActiveCharacter({ ...activeCharacter, [field]: value });
  };

  const HealthBar = ({ current, max }: { current: number, max: number }) => {
    const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
    const color = percentage > 50 ? 'bg-[#00ff66]' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-600';
    return (
      <div className="w-full">
        <div className="flex justify-between text-[10px] font-black uppercase mb-1 text-[#4a5a4a]">
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

    const openCharacterImageModal = () => { setTempCharacterImg(activeCharacter.img || '/placeholder-rpg.png'); setEditingCharacterImg(true); };
    const handleCharacterImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => setTempCharacterImg(event.target?.result as string);
      reader.readAsDataURL(file);
    };
    const handleSaveCharacterImage = (e: React.FormEvent) => {
      e.preventDefault();
      updateCharacter('img', tempCharacterImg || '/placeholder-rpg.png');
      setEditingCharacterImg(false);
    };

    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <button onClick={() => setActiveCharacter(null)} className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-bold transition-colors">
            <ArrowLeft size={14} /> VOLTAR
          </button>
          <button onClick={() => saveToDatabase(activeCharacter)} className="flex items-center gap-2 bg-[#00ff66] text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all" disabled={loadingAction}>
            <Save size={14} /> {loadingAction ? 'Salvando...' : 'Salvar Ficha'}
          </button>
        </div>

        {raceInfo?.note && (
          <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl flex items-center gap-3 text-blue-400">
            <AlertCircle size={20} />
            <p className="text-[11px] font-bold uppercase">{raceInfo.note}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUNA 1 */}
          <div className="lg:col-span-4 space-y-4">
            {/* Foto */}
            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-2xl">
              <div
                className="w-full aspect-video bg-black rounded-xl bg-cover bg-center border border-[#1a2a1a] cursor-pointer"
                style={{ backgroundImage: `url(${activeCharacter.img || '/placeholder.png'})` }}
                onClick={() => setEditingCharacterImg(true)}
              />
            </div>

            {/* Infos Básicas */}
            <div className="bg-black/60 border border-[#1a2a1a] p-4 rounded-xl grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Nome</label>
                <input
                  value={activeCharacter.name}
                  onChange={(e) => updateCharacter('name', e.target.value)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white text-center outline-none"
                  placeholder="Nome do Herói"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Raça</label>
                <select
                  value={activeCharacter.race ?? ''}
                  onChange={(e) => updateCharacter('race', e.target.value)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white"
                >
                  <option value="">Selecione...</option>
                  {Object.keys(RACE_DATA).map((race) => (
                    <option key={race} value={race}>
                      {race}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Classe</label>
                <input
                  value={activeCharacter.class ?? ''}
                  onChange={(e) => updateCharacter('class', e.target.value)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white"
                />
              </div>

              <div>
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Nível</label>
                <input
                  type="number"
                  value={activeCharacter.level ?? 1}
                  onChange={(e) => updateCharacter('level', Number(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-[#00ff66] font-bold text-center"
                />
              </div>

              <div>
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">XP</label>
                <input
                  type="number"
                  value={activeCharacter.experiencePoints ?? 0}
                  onChange={(e) => updateCharacter('experiencePoints', Number(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-[#f1e5ac] text-center"
                />
              </div>

              <div>
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Alinhamento</label>
                <input
                  value={activeCharacter.alignment ?? ''}
                  onChange={(e) => updateCharacter('alignment', e.target.value)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[8px] text-[#4a5a4a] font-black uppercase">Antecedente</label>
                <input
                  value={activeCharacter.background ?? ''}
                  onChange={(e) => updateCharacter('background', e.target.value)}
                  className="w-full bg-black/40 border border-[#1a2a1a] p-1.5 text-xs rounded text-white"
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
                <span className="text-[8px] text-[#4a5a4a] font-black uppercase">Classe de Armadura</span>
              </div>

              <div className="bg-[#0a150a] border-2 border-[#1a2a1a] rounded-xl p-3 text-center">
                <Zap className="mx-auto text-[#f1e5ac] mb-1" size={18} />
                <div className="text-2xl font-black">{getModifier(getTotalStat('dex', activeCharacter.stats.dex))}</div>
                <span className="text-[8px] text-[#4a5a4a] font-black uppercase">Iniciativa</span>
              </div>
            </div>
          </div>

          {/* COLUNA 2 */}
          <div className="lg:col-span-5 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => {
                // 1. Pega o valor base + bônus da raça
                const totalVal = getTotalStat(s, activeCharacter.stats[s]);
                // 2. Calcula o modificador em cima do total real
                const mod = getModifier(totalVal);

                return (
                  <div key={s} className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center">
                    <span className="text-[9px] text-[#4a5a4a] font-black uppercase">{statLabels[s]}</span>
                    <input
                      type="number"
                      value={activeCharacter.stats[s]}
                      onChange={(e) => updateCharacter('stats', { ...activeCharacter.stats, [s]: Number(e.target.value) || 0 })}
                      className="w-full bg-transparent text-center text-xl font-black outline-none text-white"
                    />
                    {/* O modificador aqui já mostra o bônus da raça (ex: se era 15 e a raça dá +1, mostra +3) */}
                    <div className="text-[#00ff66] text-xs font-black mt-1">
                      {mod >= 0 ? '+' : ''}{mod}
                    </div>
                    {/* Label de apoio para o jogador saber o total real */}
                    <div className="text-[8px] text-gray-500 uppercase">Total: {totalVal}</div>
                  </div>
                )
              })}

              {/* Salvaguardas */}
              <div className="bg-black/40 border border-[#1a2a1a] p-4 rounded-xl">
                <h3 className="text-[9px] text-[#4a5a4a] font-black uppercase mb-3 flex items-center gap-2">
                  <ShieldAlert size={12} /> Salvaguardas
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((s) => (
                    <div key={s} className="flex items-center justify-between border-b border-[#1a2a1a]/50 py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeCharacter.savingThrows[s]}
                          onChange={(e) =>
                            updateCharacter('savingThrows', {
                              ...activeCharacter.savingThrows,
                              [s]: e.target.checked,
                            })
                          }
                          className="accent-[#00ff66] w-3 h-3"
                        />
                        <span className="text-[10px] uppercase text-gray-300">{s}</span>
                      </div>
                      <span className="text-[10px] font-black text-[#00ff66]">
                        {(getModifier(getTotalStat(s, activeCharacter.stats[s])) +
                          (activeCharacter.savingThrows[s] ? activeCharacter.proficiencyBonus : 0)) >= 0
                          ? '+'
                          : ''}
                        {getModifier(getTotalStat(s, activeCharacter.stats[s])) +
                          (activeCharacter.savingThrows[s] ? activeCharacter.proficiencyBonus : 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Magias e Habilidades */}
              <div className="bg-[#050a05] border border-[#1a2a1a] p-5 rounded-xl">
                <h3 className="text-[#f1e5ac] text-[10px] font-black uppercase mb-4 flex items-center gap-2">
                  <Sparkles size={14} /> Magias & Habilidades
                </h3>
                <div className="max-h-[280px] overflow-y-auto space-y-2 mb-4 pr-2">
                  {activeCharacter.spells?.map((spell: any) => (
                    <div
                      key={spell.id}
                      className="bg-black/60 p-2 rounded border border-[#1a2a1a] flex justify-between items-center group"
                    >
                      <span className="text-[10px] uppercase font-bold text-gray-300">{spell.name}</span>
                      <button
                        onClick={() => updateCharacter('spells', activeCharacter.spells.filter((s: any) => s.id !== spell.id))}
                        className="text-red-900 group-hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSpellName}
                    onChange={(e) => setNewSpellName(e.target.value)}
                    placeholder="Nova habilidade..."
                    className="flex-1 bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      if (!newSpellName) return;
                      updateCharacter('spells', [...activeCharacter.spells, { id: Date.now(), name: newSpellName }]);
                      setNewSpellName('');
                    }}
                    className="bg-[#00ff66] text-black px-3 rounded text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Inventário (menor) */}
              <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl h-[170px] flex flex-col">
                <h3 className="text-[#00ff66] text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                  <Box size={14} /> Inventário
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1 mb-2 pr-1">
                  {activeCharacter.inventory?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-1.5 rounded border border-[#1a2a1a]">
                      <span className="text-[9px] uppercase text-gray-400">{item.name}</span>
                      <button
                        onClick={() =>
                          updateCharacter(
                            'inventory',
                            activeCharacter.inventory.filter((i: any) => i.id !== item.id),
                          )
                        }
                        className="text-red-900 hover:text-red-500"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Novo item..."
                    className="flex-1 bg-black border border-[#1a2a1a] rounded p-1 text-[10px]"
                  />
                  <button
                    onClick={() => {
                      if (!newItem) return;
                      updateCharacter('inventory', [...activeCharacter.inventory, { id: Date.now(), name: newItem }]);
                      setNewItem('');
                    }}
                    className="bg-[#1a2a1a] px-2 rounded text-[#00ff66] text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* COLUNA 3: PERÍCIAS */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-black border border-[#1a2a1a] p-4 rounded-xl">
                <h3 className="text-[#f1e5ac] text-[10px] font-black uppercase mb-4 text-center">Perícias</h3>
                <div className="space-y-1 max-h-[800px] overflow-y-auto pr-2">
                  {Object.entries(skillsData).map(([key, info]) => {
                    const mod = getModifier(getTotalStat(info.attr, activeCharacter.stats[info.attr]));
                    const total = mod + (activeCharacter.skills[key] ? activeCharacter.proficiencyBonus : 0);

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-black/40 p-2 rounded border border-[#1a2a1a] hover:border-[#00ff66]/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={activeCharacter.skills[key]}
                            onChange={(e) =>
                              updateCharacter('skills', {
                                ...activeCharacter.skills,
                                [key]: e.target.checked,
                              })
                            }
                            className="accent-[#00ff66] w-3 h-3"
                          />
                          <span className="text-[9px] uppercase text-gray-300">{info.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-[#00ff66]">{total >= 0 ? '+' : ''}{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <FormModal isOpen={editingCharacterImg} onClose={() => setEditingCharacterImg(false)} title="Imagem do Personagem" onSubmit={handleSaveCharacterImage}>
              <TextInput label="URL da imagem" value={tempCharacterImg} onChange={(e) => setTempCharacterImg(e.target.value)} placeholder="https://..." />
              <ImageUpload label="Ou faça upload" onChange={handleCharacterImageFileChange} currentImage={tempCharacterImg} />
              <ModalButtons primaryText="Aplicar" primaryType="submit" onSecondary={() => setEditingCharacterImg(false)} />
            </FormModal>
          </div>
        </div>
      </div>
    );
};

          if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-black text-[#00ff66] font-black uppercase">Sincronizando com a Névoa...</div>;
          if (!isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-black text-red-500 font-black">Acesso negado. Faça login.</div>;

          return (
          <div className="min-h-screen bg-[#020502]">
            <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
            <div className={`${activeCharacter ? 'max-w-[1400px]' : 'max-w-[1000px]'} mx-auto py-12 px-6`}>
              {!activeCharacter ? (
                <div>
                  <h2 className="text-[#f1e5ac] text-2xl font-serif mb-10 tracking-[0.2em] uppercase italic">Grimório de Heróis</h2>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-[0.2em]">Personagens: {characters.length}</h3>
                      <button onClick={createCharacter} className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:brightness-110 transition-all">
                        <Plus size={14} /> Criar Novo
                      </button>
                    </div>

                    {characters.length === 0 ? (
                      <div className="text-center text-[#8a9a8a] text-sm py-20 border border-dashed border-[#1a2a1a] rounded-2xl">Nenhum personagem encontrado na taverna.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {characters.map((char) => (
                          <Card
                            key={char.id} id={char.id} title={char.name} subtitle={`${char.class} • Nível ${char.level}`}
                            metaLeft={{ icon: 'hp', label: `${char.hp_current ?? 0}/${char.hp_max ?? 0}` }}
                            metaRight={{ icon: 'ca', label: `${char.ac ?? 10}` }}
                            showMetaDivider={false} metaLarge image={char.img}
                            dropdownOpen={dropdownOpen === String(char.id)}
                            onDropdownToggle={() => setDropdownOpen((prev) => prev === String(char.id) ? null : String(char.id))}
                            dropdownRef={dropdownRef} onDelete={() => deleteCharacter(char.id)}
                            onAccess={() => { setActiveCharacter(char); setDropdownOpen(null); }}
                            accessLabel="Acessar" deleteLabel="Excluir"
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
          );
}