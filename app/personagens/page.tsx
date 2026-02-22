'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ModalButtons } from '@/app/components/ui/modal';
import { Sword, Plus, ArrowLeft, Sparkles, Trash2, Save, AlertCircle, BookOpen } from 'lucide-react'; 

// --- Configuração das Raças (Dados da sua Imagem) ---
const RACE_DATA: Record<string, { stats: Record<string, number>, traits: string, note?: string }> = {
  "Anão": { 
    stats: { con: 2 }, 
    traits: "Visão no Escuro, Resiliência Anã, Treino de Combate Anão, Proficiência com ferramentas, Talento Com Pedra" 
  },
  "Elfo": { 
    stats: { dex: 2 }, 
    traits: "Visão no Escuro, Sentidos Apurados, Ascendência Fey, Transe" 
  },
  "Draconato": { 
    stats: { str: 2, cha: 1 }, 
    traits: "Ancestralidade Draconiana, Arma de Bafo, Resistência a Danos" 
  },
  "Gnomo": { 
    stats: { int: 2 }, 
    traits: "Visão no escuro, Astúcia dos Gnomos" 
  },
  "Tiefling": { 
    stats: { int: 1, cha: 2 }, 
    traits: "Visão no escuro, Resistência infernal, Legado infernal" 
  },
  "Halfling": { 
    stats: { dex: 2 }, 
    traits: "Sortudo, Corajoso, Agilidade de Halfling" 
  },
  "Humano": { 
    stats: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, 
    traits: "Proficiência em 1 skill à escolha" 
  },
  "Humano (Variante)": { 
    stats: {}, 
    traits: "1 Talento à escolha, Proficiência em 1 skill",
    note: "Bônus de +1 em dois atributos à escolha. Adicione os pontos manualmente nos stats base." 
  },
  "Meio-Elfo": { 
    stats: { cha: 2 }, 
    traits: "Visão no Escuro, Ascendência Fey, Versatilidade em Skills",
    note: "Já somamos +2 em Carisma. Adicione manualmente +1 em outros dois atributos à sua escolha!"
  },
  "Meio-Orc": { 
    stats: { str: 2, con: 1 }, 
    traits: "Visão no Escuro, Ameaçador, Resistência Implacável, Ataques Selvagens" 
  },
};

const statLabels: Record<string, string> = {
  str: 'Força',
  dex: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
};

const skillsData: Record<string, { name: string; attr: string }> = {
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

type Character = {
  id: any;
  name: string;
  class: string;
  level: number;
  race: string;
  proficiencyBonus: number;
  ac: number;
  hp_current: number;
  hp_max: number;
  initiative: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number; };
  skills: Record<string, boolean>;
  inventory: { id: number; name: string }[];
  spells: { id: number; name: string; level: string }[];
  img: string;
  owner_id?: string;
}

export default function PersonagensPage() {
  const supabase = createClient();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editingCharacterImg, setEditingCharacterImg] = useState(false);
  const [tempCharacterImg, setTempCharacterImg] = useState('');
  const [newSpellName, setNewSpellName] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('personagens');

  const getModifier = (value: number) => Math.floor((value - 10) / 2);
  const getTotalStat = (statKey: string, baseValue: number) => {
    const raceBonus = RACE_DATA[activeCharacter?.race || ""]?.stats[statKey] || 0;
    return baseValue + raceBonus;
  };

  const fetchCharacters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('characters').select('*').eq('owner_id', user.id);
    if (data) setCharacters(data);
  };

  useEffect(() => { fetchCharacters(); }, []);

  const saveToDatabase = async (char: Character) => {
    setLoadingAction(true);
    const { error } = await supabase.from('characters').upsert(char);
    if (error) alert("Erro ao salvar: " + error.message);
    else await fetchCharacters();
    setLoadingAction(false);
  };

  const updateCharacter = (field: string, value: any) => {
    if (!activeCharacter) return;
    setActiveCharacter({ ...activeCharacter, [field]: value });
  };

  const renderCharacterSheet = () => {
    if (!activeCharacter) return null;
    const raceInfo = RACE_DATA[activeCharacter.race];

    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-[#1a2a1a]">
          <button onClick={() => setActiveCharacter(null)} className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-black transition-colors">
            <ArrowLeft size={16} /> VOLTAR
          </button>
          <button onClick={() => saveToDatabase(activeCharacter)} className="bg-[#00ff66] text-black px-8 py-2.5 rounded-full text-xs font-black uppercase shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:scale-105 transition-all">
            <Save size={16} className="inline mr-2" /> {loadingAction ? 'A SALVAR...' : 'GUARDAR FICHA'}
          </button>
        </div>

        {raceInfo?.note && (
          <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl flex items-center gap-3 text-blue-400">
            <AlertCircle size={20} />
            <p className="text-[11px] font-bold uppercase">{raceInfo.note}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LADO ESQUERDO: PERFIL E STATS */}
          <div className="lg:col-span-3 space-y-4">
            <div 
              className="w-full aspect-square bg-black border-2 border-[#1a2a1a] rounded-2xl bg-cover bg-center cursor-pointer hover:border-[#00ff66]/50 transition-all shadow-2xl"
              style={{ backgroundImage: `url(${activeCharacter.img})` }}
              onClick={() => { setTempCharacterImg(activeCharacter.img); setEditingCharacterImg(true); }}
            />
            <div className="bg-[#050a05] border border-[#1a2a1a] p-5 rounded-2xl space-y-4">
               <div>
                  <label className="text-[9px] text-[#4a5a4a] uppercase font-black tracking-widest">Raça</label>
                  <select value={activeCharacter.race} onChange={(e) => updateCharacter('race', e.target.value)} className="w-full bg-black border border-[#1a2a1a] rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#00ff66]/50 cursor-pointer">
                    {Object.keys(RACE_DATA).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[9px] text-[#4a5a4a] uppercase font-black tracking-widest">Nome</label>
                  <input value={activeCharacter.name} onChange={(e) => updateCharacter('name', e.target.value)} className="w-full bg-black border border-[#1a2a1a] rounded-lg p-2.5 text-xs text-white" />
               </div>
            </div>
          </div>

          {/* MEIO: ATRIBUTOS E HABILIDADES/MAGIAS */}
          <div className="lg:col-span-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(activeCharacter.stats).map(([stat, val]) => {
                const bonus = raceInfo?.stats[stat] || 0;
                const total = val + bonus;
                const mod = getModifier(total);
                return (
                  <div key={stat} className="bg-gradient-to-b from-[#0b140b] to-black border border-[#1a2a1a] rounded-2xl p-4 text-center relative group shadow-lg">
                    <span className="text-[9px] text-[#4a5a4a] uppercase font-black">{statLabels[stat]}</span>
                    <input type="number" value={val} onChange={(e) => updateCharacter('stats', {...activeCharacter.stats, [stat]: parseInt(e.target.value) || 0})} className="w-full bg-transparent text-white text-center font-black text-3xl outline-none" />
                    <div className="text-[10px] mt-1 font-bold text-[#00ff66]">TOTAL: {total}</div>
                    <div className={`text-xl font-black ${mod >= 0 ? 'text-[#00ff66]' : 'text-red-500'}`}>{mod >= 0 ? '+' : ''}{mod}</div>
                    {bonus > 0 && <span className="absolute top-2 right-2 text-[7px] text-yellow-500 font-bold">+{bonus} RAÇA</span>}
                  </div>
                );
              })}
            </div>

            {/* SEÇÃO: MAGIAS E HABILIDADES */}
            <div className="bg-[#050a05] border border-[#1a2a1a] p-6 rounded-2xl shadow-xl">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[#00ff66] text-xs font-black uppercase flex items-center gap-2"><Sparkles size={16}/> Magias e Habilidades</h4>
                  <span className="text-[9px] text-[#4a5a4a] font-bold uppercase tracking-widest">Grimório Pessoal</span>
               </div>
               
               {/* Habilidades Raciais (Automáticas) */}
               <div className="mb-6 p-4 bg-[#00ff66]/5 border border-[#00ff66]/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-[#00ff66] opacity-80">
                    <BookOpen size={12} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Habilidades de {activeCharacter.race}</span>
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed italic">
                    {raceInfo?.traits || "Esta raça não possui habilidades especiais listadas."}
                  </p>
               </div>

               {/* Lista de Magias Adicionadas */}
               <div className="space-y-2 mb-4">
                 {activeCharacter.spells?.map((spell) => (
                   <div key={spell.id} className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-[#1a2a1a] group hover:border-[#00ff66]/30 transition-all">
                     <span className="text-white text-xs font-medium uppercase tracking-tight">{spell.name}</span>
                     <button onClick={() => updateCharacter('spells', activeCharacter.spells.filter(s => s.id !== spell.id))} className="text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                   </div>
                 ))}
               </div>

               <div className="flex gap-2">
                 <input placeholder="Nova magia ou habilidade de classe..." value={newSpellName} onChange={(e) => setNewSpellName(e.target.value)} className="flex-1 bg-black border border-[#1a2a1a] rounded-xl p-3 text-xs text-white outline-none focus:border-[#00ff66]/50" />
                 <button onClick={() => { if(!newSpellName) return; updateCharacter('spells', [...activeCharacter.spells, {id: Date.now(), name: newSpellName, level: '1'}]); setNewSpellName(''); }} className="bg-[#00ff66] text-black px-4 rounded-xl hover:scale-105 transition-transform"><Plus size={20}/></button>
               </div>
            </div>
          </div>

          {/* LADO DIREITO: PERÍCIAS */}
          <div className="lg:col-span-3">
            <div className="bg-black/40 border border-[#1a2a1a] p-5 rounded-2xl h-full shadow-2xl">
              <h4 className="text-[#f1e5ac] text-[10px] font-black uppercase text-center mb-6 tracking-widest border-b border-[#f1e5ac]/10 pb-2 italic">Perícias</h4>
              <div className="space-y-1.5 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(skillsData).map(([key, info]) => {
                  const totalStatValue = getTotalStat(info.attr, activeCharacter.stats[info.attr as keyof typeof activeCharacter.stats]);
                  const mod = getModifier(totalStatValue);
                  const isProf = activeCharacter.skills?.[key] || false;
                  const totalSkill = mod + (isProf ? (activeCharacter.proficiencyBonus || 2) : 0);

                  return (
                    <div key={key} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-[#1a2a1a] hover:border-[#00ff66]/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isProf} onChange={(e) => updateCharacter('skills', {...activeCharacter.skills, [key]: e.target.checked})} className="accent-[#00ff66] w-3.5 h-3.5" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-tighter group-hover:text-[#00ff66] transition-colors">{info.name}</span>
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020502]">
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      <div className="max-w-[1400px] mx-auto py-12 px-6">
        {!activeCharacter ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {characters.map(char => (
              <Card key={char.id} id={char.id} title={char.name} subtitle={char.race} image={char.img} onAccess={() => setActiveCharacter(char)} />
            ))}
          </div>
        ) : renderCharacterSheet()}
      </div>
      <Footer />

      <FormModal isOpen={editingCharacterImg} onClose={() => setEditingCharacterImg(false)} title="Avatar do Herói" onSubmit={(e) => { e.preventDefault(); updateCharacter('img', tempCharacterImg); setEditingCharacterImg(false); }}>
        <TextInput label="Link da Imagem" value={tempCharacterImg} onChange={(e) => setTempCharacterImg(e.target.value)} />
        <ModalButtons primaryText="Confirmar" primaryType="submit" onSecondary={() => setEditingCharacterImg(false)} />
      </FormModal>
    </div>
  );
}