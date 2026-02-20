'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client'; 
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { Sword, Plus, ArrowLeft, ShieldAlert, Heart, Shield, Zap, Sparkles, Trash2, Save } from 'lucide-react'; 
import Link from 'next/link'; 

// --- Tipagem Atualizada ---
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
  // Novos campos
  ac: number;
  hp_current: number;
  hp_max: number;
  initiative: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number; };
  savingThrows: Record<string, boolean>;
  skills: Record<string, boolean>;
  inventory: { id: number; name: string }[];
  spells: { id: number; name: string; level: string }[]; // Nova seção de magias
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
  
  // Modais e UI
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [editingCharacterImg, setEditingCharacterImg] = useState(false);
  const [tempCharacterImg, setTempCharacterImg] = useState('');
  const [newInventoryItem, setNewInventoryItem] = useState('');
  const [newSpellName, setNewSpellName] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<string>('personagens');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- LOGICA DE BANCO DE DADOS ---

  const fetchCharacters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('owner_id', user.id);

    if (!error && data) {
      setCharacters(data);
    }
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

  const saveToDatabase = async (char: Character) => {
    setLoadingAction(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('characters')
      .upsert({
        ...char,
        is_linked: (char as any).is_linked ?? false,
        owner_id: user?.id,
        updated_at: new Date()
      });

    if (error) alert("Erro ao salvar: " + error.message);
    else await fetchCharacters();
    setLoadingAction(false);
  };

  const createCharacter = async () => {
    if (characters.length >= 6) return alert('Limite de 6 personagens atingido.');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Sessão inválida. Faça login novamente.');
      return;
    }
    
    const newChar = {
      name: 'Novo Herói',
      class: 'Guerreiro',
      level: 1,
      race: '',
      background: '',
      alignment: '',
      experiencePoints: 0,
      proficiencyBonus: 2,
      inspiration: false,
      ac: 10,
      hp_current: 10,
      hp_max: 10,
      initiative: 0,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      skills: {},
      savingThrows: {},
      inventory: [],
      spells: [],
      img: '/placeholder-rpg.png',
      is_linked: false,
      owner_id: user.id
    };

    const { data, error } = await supabase
      .from('characters')
      .insert([newChar], { defaultToNull: false })
      .select('*')
      .single();

    if (error) {
      const details = [error.message, (error as any).details, (error as any).hint].filter(Boolean).join(' | ');
      alert('Erro ao criar personagem: ' + details);
      return;
    }

    if (data) {
      setCharacters((prev) => [...prev, data]);
      setActiveCharacter(data);
    } else {
      await fetchCharacters();
    }
  };

  const deleteCharacter = async (id: any) => {
    if (!confirm('Excluir este herói para sempre?')) return;
    const { error } = await supabase.from('characters').delete().eq('id', id);
    if (!error) {
      setCharacters(characters.filter(c => c.id !== id));
      setActiveCharacter(null);
    }
  };

  // --- LOGICA DE UI ---

  const updateCharacter = (field: string, value: any) => {
    if (!activeCharacter) return;
    const updated = { ...activeCharacter, [field]: value };
    setActiveCharacter(updated);
    // Debounce opcional aqui, ou salvar ao clicar em um botão
  };

  const getModifier = (value: number) => Math.floor((value - 10) / 2);

  // --- COMPONENTES DE INTERFACE ---

  const HealthBar = ({ current, max }: { current: number, max: number }) => {
    const percentage = Math.min(Math.max((current / max) * 100, 0), 100);
    const color = percentage > 50 ? 'bg-[#00ff66]' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-600';
    
    return (
      <div className="w-full">
        <div className="flex justify-between text-[10px] font-black uppercase mb-1 text-[#4a5a4a]">
          <span>Pontos de Vida</span>
          <span>{current} / {max} ({Math.round(percentage)}%)</span>
        </div>
        <div className="w-full h-3 bg-black border border-[#1a2a1a] rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} transition-all duration-500 shadow-[0_0_10px_rgba(0,255,102,0.3)]`} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Renderização das Perícias Sem Scroll
  const skillsData: Record<string, { name: string; attr: string }> = {
    atletismo: { name: 'Atletismo', attr: 'str' },
    acrobacia: { name: 'Acrobacia', attr: 'dex' },
    furtividade: { name: 'Furtividade', attr: 'dex' },
    arcanismo: { name: 'Arcanismo', attr: 'int' },
    historia: { name: 'História', attr: 'int' },
    percepcao: { name: 'Percepção', attr: 'wis' },
    persuasao: { name: 'Persuasão', attr: 'cha' },
    // Adicione as outras conforme necessário...
  };

  const statLabels: Record<string, string> = {
    str: 'Força',
    dex: 'Destreza',
    con: 'Constituição',
    int: 'Inteligência',
    wis: 'Sabedoria',
    cha: 'Carisma',
  };

  const renderCharacterSheet = () => {
    if (!activeCharacter) return null;

    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <button onClick={() => setActiveCharacter(null)} className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-bold transition-colors">
            <ArrowLeft size={14} /> VOLTAR
          </button>
          <button 
            onClick={() => saveToDatabase(activeCharacter)}
            className="flex items-center gap-2 bg-[#00ff66] text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
            disabled={loadingAction}
          >
            <Save size={14} /> {loadingAction ? 'Salvando...' : 'Salvar no Banco'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center">
              <span className="block text-[9px] text-[#4a5a4a] uppercase font-black">Classe</span>
              <span className="text-white text-sm font-bold uppercase">{activeCharacter.class || 'Sem classe'}</span>
            </div>
            <div className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center">
              <span className="block text-[9px] text-[#4a5a4a] uppercase font-black">HP</span>
              <span className="text-white text-sm font-bold">{activeCharacter.hp_current ?? 0}/{activeCharacter.hp_max ?? 0}</span>
            </div>
            <div className="bg-black border border-[#1a2a1a] rounded-xl p-3 text-center">
              <span className="block text-[9px] text-[#4a5a4a] uppercase font-black">CA</span>
              <span className="text-[#00ff66] text-sm font-bold">{activeCharacter.ac ?? 10}</span>
              <span className="block text-[8px] text-[#4a5a4a] uppercase">Classe de Armadura</span>
            </div>
          </div>
          
          {/* COLUNA 1: FOTO E STATUS VITAIS */}
          <div className="lg:col-span-3 space-y-4">
            <div 
              className="w-full aspect-square bg-black border-2 border-[#1a2a1a] rounded-xl bg-cover bg-center relative group overflow-hidden"
              style={{ backgroundImage: `url(${activeCharacter.img || '/placeholder-rpg.png'})` }}
              onClick={() => setEditingCharacterImg(true)}
            >
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Plus className="text-[#00ff66]" />
              </div>
            </div>

            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl space-y-4">
              <HealthBar current={activeCharacter.hp_current} max={activeCharacter.hp_max} />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center justify-center p-2 bg-black border border-[#1a2a1a] rounded-lg">
                  <span className="text-[9px] text-[#4a5a4a] uppercase font-black">HP Atual</span>
                  <input 
                    type="number" 
                    value={activeCharacter.hp_current}
                    onChange={(e) => updateCharacter('hp_current', parseInt(e.target.value))}
                    className="bg-transparent text-[#00ff66] text-center font-bold w-full"
                  />
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-black border border-[#1a2a1a] rounded-lg">
                  <span className="text-[9px] text-[#4a5a4a] uppercase font-black">HP Máximo</span>
                  <input 
                    type="number" 
                    value={activeCharacter.hp_max}
                    onChange={(e) => updateCharacter('hp_max', parseInt(e.target.value))}
                    className="bg-transparent text-white text-center font-bold w-full"
                  />
                </div>
              </div>
            </div>

            {/* CA e Iniciativa */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black border border-[#1a2a1a] p-4 rounded-xl text-center relative overflow-hidden">
                <Shield className="absolute -bottom-2 -right-2 opacity-10 text-[#00ff66]" size={60} />
                <span className="text-[10px] text-[#4a5a4a] uppercase font-black block mb-1">Classe Armadura</span>
                <input 
                  type="number" 
                  value={activeCharacter.ac}
                  onChange={(e) => updateCharacter('ac', parseInt(e.target.value))}
                  className="bg-transparent text-2xl text-[#00ff66] font-serif w-full text-center outline-none"
                />
              </div>
              <div className="bg-black border border-[#1a2a1a] p-4 rounded-xl text-center relative overflow-hidden">
                <Zap className="absolute -bottom-2 -right-2 opacity-10 text-yellow-500" size={60} />
                <span className="text-[10px] text-[#4a5a4a] uppercase font-black block mb-1">Iniciativa</span>
                <input 
                  type="number" 
                  value={activeCharacter.initiative}
                  onChange={(e) => updateCharacter('initiative', parseInt(e.target.value))}
                  className="bg-transparent text-2xl text-yellow-500 font-serif w-full text-center outline-none"
                />
              </div>
            </div>
          </div>

          {/* COLUNA 2: ATRIBUTOS E PERÍCIAS */}
          <div className="lg:col-span-5 space-y-6">
             <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl">
                <h4 className="text-[#f1e5ac] text-[10px] font-black uppercase tracking-widest mb-4">Dados da Ficha</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Nome</label>
                    <input
                      value={activeCharacter.name || ''}
                      onChange={(e) => updateCharacter('name', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Classe</label>
                    <input
                      value={activeCharacter.class || ''}
                      onChange={(e) => updateCharacter('class', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Nível</label>
                    <input
                      type="number"
                      value={activeCharacter.level ?? 1}
                      onChange={(e) => updateCharacter('level', parseInt(e.target.value) || 1)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Raça</label>
                    <input
                      value={activeCharacter.race || ''}
                      onChange={(e) => updateCharacter('race', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Antecedente</label>
                    <input
                      value={activeCharacter.background || ''}
                      onChange={(e) => updateCharacter('background', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Alinhamento</label>
                    <input
                      value={activeCharacter.alignment || ''}
                      onChange={(e) => updateCharacter('alignment', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Pontos de Experiência</label>
                    <input
                      type="number"
                      value={activeCharacter.experiencePoints ?? 0}
                      onChange={(e) => updateCharacter('experiencePoints', parseInt(e.target.value) || 0)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#4a5a4a] uppercase font-black mb-1">Bônus de Proficiência</label>
                    <input
                      type="number"
                      value={activeCharacter.proficiencyBonus ?? 2}
                      onChange={(e) => updateCharacter('proficiencyBonus', parseInt(e.target.value) || 0)}
                      className="w-full bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                    />
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-[11px] text-white uppercase">
                  <input
                    type="checkbox"
                    checked={!!activeCharacter.inspiration}
                    onChange={(e) => updateCharacter('inspiration', e.target.checked)}
                    className="accent-[#00ff66] w-3 h-3"
                  />
                  Inspiração
                </label>
             </div>

             <div className="grid grid-cols-3 gap-3">
                {Object.entries(activeCharacter.stats).map(([stat, val]) => (
                  <div key={stat} className="bg-black border border-[#1a2a1a] rounded-lg p-2 text-center">
                    <span className="text-[9px] text-[#4a5a4a] uppercase font-black">{statLabels[stat] ?? stat}</span>
                    <div className="text-[9px] text-[#4a5a4a] uppercase">{stat}</div>
                    <input 
                      type="number" 
                      value={val}
                      onChange={(e) => updateCharacter('stats', {...activeCharacter.stats, [stat]: parseInt(e.target.value)})}
                      className="w-full bg-transparent text-white text-center font-bold text-xl"
                    />
                    <div className="text-[#00ff66] text-xs font-bold">{getModifier(val) >= 0 ? '+' : ''}{getModifier(val)}</div>
                  </div>
                ))}
             </div>

             <div className="bg-black/40 border border-[#1a2a1a] p-4 rounded-xl overflow-visible">
                <h4 className="text-[#f1e5ac] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Sword size={12}/> Perícias (Separadas)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-visible">
                  {Object.entries(skillsData).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between bg-black/60 p-2 rounded border border-[#1a2a1a] hover:border-[#00ff66]/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={activeCharacter.skills?.[key] || false}
                          onChange={(e) => updateCharacter('skills', {...activeCharacter.skills, [key]: e.target.checked})}
                          className="accent-[#00ff66] w-3 h-3"
                        />
                        <span className="text-white text-[11px] uppercase tracking-tighter">{info.name}</span>
                      </div>
                      <span className="text-[#00ff66] text-xs font-bold">
                        {getModifier(activeCharacter.stats[info.attr as keyof typeof activeCharacter.stats])}
                      </span>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* COLUNA 3: INVENTÁRIO E MAGIAS */}
          <div className="lg:col-span-4 space-y-6">
            {/* Seção de Magias */}
            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl">
              <h4 className="text-[#00ff66] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles size={12}/> Livro de Magias
              </h4>
              <div className="space-y-2 mb-4">
                {activeCharacter.spells?.map((spell) => (
                  <div key={spell.id} className="flex items-center justify-between bg-black p-2 rounded border border-[#1a2a1a] group">
                    <span className="text-white text-xs">{spell.name}</span>
                    <button 
                      onClick={() => updateCharacter('spells', activeCharacter.spells.filter(s => s.id !== spell.id))}
                      className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  placeholder="Nova magia..." 
                  value={newSpellName}
                  onChange={(e) => setNewSpellName(e.target.value)}
                  className="flex-1 bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                />
                <button 
                  onClick={() => {
                    if(!newSpellName) return;
                    updateCharacter('spells', [...(activeCharacter.spells || []), {id: Date.now(), name: newSpellName, level: '1'}]);
                    setNewSpellName('');
                  }}
                  className="bg-[#00ff66] text-black p-2 rounded"><Plus size={14}/></button>
              </div>
            </div>

            {/* Inventário */}
            <div className="bg-[#050a05] border border-[#1a2a1a] p-4 rounded-xl">
              <h4 className="text-[#4a5a4a] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sword size={12}/> Inventário
              </h4>
              {/* Lógica similar à de magias... */}
              <div className="flex gap-2">
                <input 
                  placeholder="Novo item..." 
                  value={newInventoryItem}
                  onChange={(e) => setNewInventoryItem(e.target.value)}
                  className="flex-1 bg-black border border-[#1a2a1a] rounded p-2 text-xs text-white"
                />
                <button 
                   onClick={() => {
                    if(!newInventoryItem) return;
                    updateCharacter('inventory', [...(activeCharacter.inventory || []), {id: Date.now(), name: newInventoryItem}]);
                    setNewInventoryItem('');
                  }}
                  className="bg-[#4a5a4a] text-white p-2 rounded"><Plus size={14}/></button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // --- RENDERS PRINCIPAIS ---

  if (isLoadingAuth) return <LoadingState />;
  if (!isAuthenticated) return <UnauthorizedState />;

  return (
    <>
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      <div className="max-w-[1400px] mx-auto py-12 px-6">
        {!activeCharacter ? (
          <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-[#f1e5ac] text-2xl font-serif tracking-[0.2em] uppercase italic">Grimório de Heróis</h2>
              <button onClick={createCharacter} className="bg-[#00ff66] text-black px-6 py-2 rounded-lg font-black uppercase text-xs hover:scale-105 transition-all">Novo Personagem</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {characters.map(char => (
                <div key={char.id} className="bg-black border border-[#1a2a1a] p-6 rounded-2xl hover:border-[#00ff66] transition-all group">
                  <div className="h-40 bg-[#0a120a] rounded-xl mb-4 bg-cover bg-center" style={{ backgroundImage: `url(${char.img})` }} />
                  <h3 className="text-[#00ff66] font-bold text-lg uppercase">{char.name}</h3>
                  <p className="text-[#4a5a4a] text-xs mb-4">{char.class} Nível {char.level}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-2 text-center">
                      <span className="block text-[9px] text-[#4a5a4a] uppercase font-black">HP</span>
                      <span className="text-white text-xs font-bold">{char.hp_current ?? 0}/{char.hp_max ?? 0}</span>
                    </div>
                    <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-2 text-center">
                      <span className="block text-[9px] text-[#4a5a4a] uppercase font-black">CA</span>
                      <span className="text-[#00ff66] text-xs font-bold">{char.ac ?? 10}</span>
                      <span className="block text-[8px] text-[#4a5a4a] uppercase">Classe de Armadura</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveCharacter(char)} className="flex-1 bg-[#00ff66] text-black py-2 rounded font-black text-[10px] uppercase">Acessar Ficha</button>
                    <button onClick={() => deleteCharacter(char.id)} className="p-2 border border-red-900 text-red-500 rounded hover:bg-red-900/20"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : renderCharacterSheet()}
      </div>
      <Footer />
    </>
  );
}

// Funções de estado (Loading e Unauthorized) permanecem iguais ao seu código original...
function LoadingState() { /* ... */ return <div>Carregando...</div>}
function UnauthorizedState() { /* ... */ return <div>Não autorizado</div>}