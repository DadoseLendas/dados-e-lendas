'use client'; 
import { useState, useEffect, useRef } from 'react'; 
import type { ChangeEvent } from 'react'; 
import { useRouter } from 'next/navigation'; 
import { createClient } from '@/utils/supabase/client';  
import Navbar from '@/app/components/ui/navbar'; 
import Footer from '@/app/components/ui/footer'; 
import Card from '@/app/components/ui/card'; 
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal'; 
import { Sword, Plus, ArrowLeft, ShieldAlert, Heart, Sparkles, Trash2, Save, AlertCircle, BookOpen, Shield, Zap } from 'lucide-react';  
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

  const skillsData: Record<string, { name: string; attr: string }> = { 
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
          
          {/* COLUNA 1: FOTO E STATUS */} 
          <div className="lg:col-span-3 space-y-4"> 
            <div className="w-full aspect-square bg-black border-2 border-[#1a2a1a] rounded-xl bg-cover bg-center relative group overflow-hidden" style={{ backgroundImage: `url(${activeCharacter.img || '/placeholder-rpg.png'})` }} onClick={openCharacterImageModal}> 
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"> 
                <Plus className="text-[#00ff66]" /> 
              </div> 
            </div> 

            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl space-y-4"> 
              <HealthBar current={activeCharacter.hp_current} max={activeCharacter.hp_max} /> 
              <div className="grid grid-cols-2 gap-3"> 
                <div className="text-center p-2 bg-black rounded-lg border border-[#1a2a1a]"> 
                  <span className="text-[8px] text-[#4a5a4a] uppercase font-black">HP Atual</span> 
                  <input type="number" value={activeCharacter.hp_current} onChange={(e) => updateCharacter('hp_current', parseInt(e.target.value))} className="w-full bg-transparent text-[#00ff66] text-center font-black outline-none" /> 
                </div> 
                <div className="text-center p-2 bg-black rounded-lg border border-[#1a2a1a]"> 
                  <span className="text-[8px] text-[#4a5a4a] uppercase font-black">HP Máx</span> 
                  <input type="number" value={activeCharacter.hp_max} onChange={(e) => updateCharacter('hp_max', parseInt(e.target.value))} className="w-full bg-transparent text-white text-center font-black outline-none" /> 
                </div> 
              </div> 
            </div> 

            <div className="grid grid-cols-2 gap-4"> 
              <div className="bg-black border border-[#1a2a1a] p-3 rounded-xl text-center"> 
                <Shield size={14} className="mx-auto mb-1 text-blue-400"/>
                <span className="text-[9px] text-[#4a5a4a] uppercase font-black block">CA</span> 
                <input type="number" value={activeCharacter.ac} onChange={(e) => updateCharacter('ac', parseInt(e.target.value))} className="w-full bg-transparent text-xl text-[#00ff66] font-black text-center outline-none" /> 
              </div> 
              <div className="bg-black border border-[#1a2a1a] p-3 rounded-xl text-center"> 
                <Zap size={14} className="mx-auto mb-1 text-yellow-500"/>
                <span className="text-[9px] text-[#4a5a4a] uppercase font-black block">Iniciativa</span> 
                <input type="number" value={activeCharacter.initiative} onChange={(e) => updateCharacter('initiative', parseInt(e.target.value))} className="w-full bg-transparent text-xl text-yellow-500 font-black text-center outline-none" /> 
              </div> 
            </div> 

            {/* Inventário */} 
            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl"> 
              <h4 className="text-[#4a5a4a] text-[10px] font-black uppercase mb-3 flex items-center gap-2"><Sword size={12}/> Inventário</h4> 
              <div className="space-y-1 mb-3 max-h-40 overflow-y-auto"> 
                {activeCharacter.inventory?.map((item) => ( 
                  <div key={item.id} className="flex items-center justify-between bg-black/40 p-2 rounded border border-[#1a2a1a] group"> 
                    <span className="text-white text-[10px] uppercase tracking-tighter">{item.name}</span> 
                    <button onClick={() => updateCharacter('inventory', activeCharacter.inventory.filter(i => i.id !== item.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button> 
                  </div> 
                ))} 
              </div> 
              <div className="flex gap-2"> 
                <input placeholder="Item..." value={newInventoryItem} onChange={(e) => setNewInventoryItem(e.target.value)} className="flex-1 bg-black border border-[#1a2a1a] rounded p-1.5 text-[10px] text-white" /> 
                <button onClick={() => { if(!newInventoryItem) return; updateCharacter('inventory', [...(activeCharacter.inventory || []), {id: Date.now(), name: newInventoryItem}]); setNewInventoryItem(''); }} className="bg-[#4a5a4a] text-white p-1.5 rounded"><Plus size={12}/></button> 
              </div> 
            </div> 
          </div> 

          {/* COLUNA 2: ATRIBUTOS E MAGIAS/HABILIDADES */} 
          <div className="lg:col-span-5 space-y-6"> 
            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl grid grid-cols-2 gap-3"> 
              <div>
                <label className="text-[9px] text-[#4a5a4a] uppercase font-black">Raça</label>
                <select value={activeCharacter.race} onChange={(e) => updateCharacter('race', e.target.value)} className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white">
                  {Object.keys(RACE_DATA).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-[#4a5a4a] uppercase font-black">Nome</label>
                <input value={activeCharacter.name} onChange={(e) => updateCharacter('name', e.target.value)} className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white" />
              </div>
            </div> 

            <div className="grid grid-cols-3 gap-3"> 
              {Object.entries(activeCharacter.stats).map(([stat, val]) => {
                const total = getTotalStat(stat, val);
                const mod = getModifier(total);
                const bonus = RACE_DATA[activeCharacter.race]?.stats[stat] || 0;
                return (
                  <div key={stat} className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center relative hover:border-[#00ff66]/40 transition-colors"> 
                    <span className="text-[9px] text-[#4a5a4a] uppercase font-black">{statLabels[stat]}</span> 
                    <input type="number" value={val} onChange={(e) => updateCharacter('stats', {...activeCharacter.stats, [stat]: parseInt(e.target.value)})} className="w-full bg-transparent text-white text-center font-black text-2xl outline-none" /> 
                    <div className="text-[9px] text-[#00ff66] font-bold">TOTAL: {total}</div>
                    <div className={`text-lg font-black ${mod >= 0 ? 'text-[#00ff66]' : 'text-red-500'}`}>{mod >= 0 ? '+' : ''}{mod}</div> 
                    {bonus > 0 && <span className="absolute top-1 right-1 text-[7px] text-yellow-500 font-bold">+{bonus}</span>}
                  </div> 
                );
              })} 
            </div> 

            {/* Magias e Habilidades Unificadas */} 
            <div className="bg-[#050a05] border border-[#1a2a1a] p-6 rounded-xl shadow-xl"> 
              <h4 className="text-[#00ff66] text-xs font-black uppercase flex items-center gap-2 mb-4"><Sparkles size={16}/> Magias e Habilidades</h4> 
              
              <div className="mb-4 p-3 bg-[#00ff66]/5 border border-[#00ff66]/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1 text-[#00ff66] opacity-70"><BookOpen size={12} /><span className="text-[9px] font-black uppercase">Habilidades de {activeCharacter.race}</span></div>
                <p className="text-[10px] text-white/70 italic leading-relaxed">{raceInfo?.traits || "Sem traços específicos."}</p>
              </div>

              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1"> 
                {activeCharacter.spells?.map((spell) => ( 
                  <div key={spell.id} className="flex items-center justify-between bg-black/60 p-3 rounded border border-[#1a2a1a] group hover:border-[#00ff66]/30 transition-all"> 
                    <span className="text-white text-xs uppercase tracking-tight font-medium">{spell.name}</span> 
                    <button onClick={() => updateCharacter('spells', activeCharacter.spells.filter(s => s.id !== spell.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button> 
                  </div> 
                ))} 
              </div> 
              <div className="flex gap-2"> 
                <input placeholder="Nova magia ou habilidade..." value={newSpellName} onChange={(e) => setNewSpellName(e.target.value)} className="flex-1 bg-black border border-[#1a2a1a] rounded p-2.5 text-xs text-white outline-none focus:border-[#00ff66]/50" /> 
                <button onClick={() => { if(!newSpellName) return; updateCharacter('spells', [...(activeCharacter.spells || []), {id: Date.now(), name: newSpellName, level: '1'}]); setNewSpellName(''); }} className="bg-[#00ff66] text-black px-4 rounded hover:scale-105 transition-all"><Plus size={18}/></button> 
              </div> 
            </div> 
          </div> 

          {/* COLUNA 3: PERÍCIAS */} 
          <div className="lg:col-span-4 space-y-6"> 
            <div className="bg-black/40 border border-[#1a2a1a] p-4 rounded-xl"> 
              <h4 className="text-[#f1e5ac] text-[10px] font-black uppercase tracking-widest mb-6 text-center border-b border-[#f1e5ac]/10 pb-2">Perícias</h4> 
              <div className="grid grid-cols-1 gap-1.5 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar"> 
                {Object.entries(skillsData).map(([key, info]) => {
                  const totalStatValue = getTotalStat(info.attr, activeCharacter.stats[info.attr as keyof typeof activeCharacter.stats]);
                  const mod = getModifier(totalStatValue);
                  const isProf = activeCharacter.skills?.[key] || false;
                  const totalSkill = mod + (isProf ? (activeCharacter.proficiencyBonus || 2) : 0);

                  return (
                    <div key={key} className="flex items-center justify-between bg-black/60 p-2 rounded border border-[#1a2a1a] hover:border-[#00ff66]/30 transition-colors group"> 
                      <div className="flex items-center gap-3"> 
                        <input type="checkbox" checked={isProf} onChange={(e) => updateCharacter('skills', {...activeCharacter.skills, [key]: e.target.checked})} className="accent-[#00ff66] w-3 h-3 cursor-pointer" /> 
                        <span className="text-white text-[10px] uppercase font-bold group-hover:text-[#00ff66] transition-colors">{info.name}</span> 
                      </div> 
                      <span className={`text-[10px] font-black ${totalSkill >= 0 ? 'text-[#00ff66]' : 'text-red-500'}`}> 
                        {totalSkill >= 0 ? '+' : ''}{totalSkill} 
                      </span> 
                    </div> 
                  );
                })} 
              </div> 
            </div> 
          </div> 
        </div> 

        <FormModal isOpen={editingCharacterImg} onClose={() => setEditingCharacterImg(false)} title="Imagem do Personagem" onSubmit={handleSaveCharacterImage}> 
          <TextInput label="URL da imagem" value={tempCharacterImg} onChange={(e) => setTempCharacterImg(e.target.value)} placeholder="https://..." /> 
          <ImageUpload label="Ou faça upload" onChange={handleCharacterImageFileChange} currentImage={tempCharacterImg} /> 
          <ModalButtons primaryText="Aplicar" primaryType="submit" onSecondary={() => setEditingCharacterImg(false)} /> 
        </FormModal> 
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