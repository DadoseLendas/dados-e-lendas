'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';
import { Modal, ImageUpload } from '@/components/ui/modal';
import { ArrowLeft, Sword, Plus, User } from 'lucide-react';

export default function PersonagensPage() {
  // Estados da aplicação
  const [characters, setCharacters] = useState([]);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [editingCharacterImg, setEditingCharacterImg] = useState(false);
  const [tempCharacterImg, setTempCharacterImg] = useState('');
  const [tempCharacterImgFile, setTempCharacterImgFile] = useState(null);
  
  const dropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para criar novo personagem
  const createCharacter = () => {
    if (characters.length >= 6) {
      alert('Você atingiu o limite máximo de 6 personagens.');
      return;
    }

    const newCharacter = {
      id: Date.now(),
      name: `Personagem ${characters.length + 1}`,
      class: 'Lutador',
      level: 1,
      race: '',
      background: '',
      alignment: '',
      experiencePoints: 0,
      armorClass: 10,
      initiative: 0,
      speed: 30,
      hitPointMaximum: 8,
      currentHitPoints: 8,
      temporaryHitPoints: 0,
      hitDice: '1d10',
      proficiencyBonus: 2,
      stats: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      },
      savingThrows: {
        strength: false,
        dexterity: false,
        constitution: false,
        intelligence: false,
        wisdom: false,
        charisma: false
      },
      skills: {},
      img: ''
    };
    
    setCharacters([...characters, newCharacter]);
  };

  const openCharacterSheet = (characterId) => {
    setActiveCharacter(characters.find(c => c.id === characterId));
  };

  const toggleDropdown = (itemId) => {
    setDropdownOpen(dropdownOpen === itemId ? null : itemId);
  };

  const deleteCharacter = (characterId) => {
    if (confirm('Tem certeza que deseja excluir este personagem?')) {
      setCharacters(characters.filter(c => c.id !== characterId));
    }
  };

  const updateCharacter = (field, value) => {
    const updatedCharacter = { ...activeCharacter, [field]: value };
    setActiveCharacter(updatedCharacter);
    setCharacters(characters.map(c => c.id === activeCharacter.id ? updatedCharacter : c));
  };

  const updateCharacterStat = (stat, value) => {
    const numValue = Math.max(1, Math.min(20, parseInt(value) || 1));
    updateCharacter('stats', { ...activeCharacter.stats, [stat]: numValue });
  };

  const updateSavingThrow = (stat, value) => {
    updateCharacter('savingThrows', { ...activeCharacter.savingThrows, [stat]: value });
  };

  const updateSkill = (skill, value) => {
    updateCharacter('skills', { ...activeCharacter.skills, [skill]: value });
  };

  const getModifier = (value) => Math.floor((value - 10) / 2);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isCharacter = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (isCharacter) {
          setTempCharacterImg(result);
          setTempCharacterImgFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditCharacterImage = () => {
    setTempCharacterImg('');
    setTempCharacterImgFile(null);
    setEditingCharacterImg(true);
  };

  const cancelImageEdit = () => {
    setEditingCharacterImg(false);
    setTempCharacterImg('');
    setTempCharacterImgFile(null);
  };

  const saveCharacterImage = () => {
    if (tempCharacterImg) {
      updateCharacter('img', tempCharacterImg);
    }
    cancelImageEdit();
  };

  // Renderizar personagens
  const renderCharacters = () => (
    <div className="space-y-6">
      {/* Header com contador e botão criar */}
      <div className="flex justify-between items-center">
        <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-[0.2em]">
          Personagens: {characters.length}/6
        </h3>
        <button 
          onClick={createCharacter}
          className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)]"
        >
          <Plus size={14} />
          Criar Personagem
        </button>
      </div>
      
      {/* Grid de personagens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {characters.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#4a5a4a]">
            <Sword size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhum personagem criado ainda</p>
          </div>
        ) : (
          characters.map(character => (
            <Card
              key={character.id}
              id={character.id}
              title={character.name}
              subtitle={`${character.class} Nv. ${character.level}`}
              image={character.img}
              placeholder="https://via.placeholder.com/400x200/333/fff?text=Personagem"
              dropdownOpen={dropdownOpen === `character-${character.id}`}
              onDropdownToggle={() => toggleDropdown(`character-${character.id}`)}
              onDelete={() => deleteCharacter(character.id)}
              onAccess={() => openCharacterSheet(character.id)}
              deleteLabel="Excluir"
              accessLabel="Acessar"
              dropdownRef={dropdownOpen === `character-${character.id}` ? dropdownRef : undefined}
            />
          ))
        )}
      </div>
    </div>
  );

  // Renderizar ficha do personagem
  const renderCharacterSheet = () => {
    if (!activeCharacter) return null;

    const getSkillModifier = (skill) => {
      const statMap = {
        'Atletismo': 'strength', 'Acrobacia': 'dexterity', 'Furtividade': 'dexterity', 'Prestidigitação': 'dexterity',
        'Arcanismo': 'intelligence', 'História': 'intelligence', 'Investigação': 'intelligence', 'Natureza': 'intelligence', 'Religião': 'intelligence',
        'Intuição': 'wisdom', 'Lidar com Animais': 'wisdom', 'Medicina': 'wisdom', 'Percepção': 'wisdom', 'Sobrevivência': 'wisdom',
        'Atuação': 'charisma', 'Enganação': 'charisma', 'Intimidação': 'charisma', 'Persuasão': 'charisma'
      };
      const baseStat = statMap[skill] || 'strength';
      const baseModifier = getModifier(activeCharacter.stats[baseStat]);
      return activeCharacter.skills[skill] ? baseModifier + activeCharacter.proficiencyBonus : baseModifier;
    };

    const inputStyle = { width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' };
    const labelStyle = { display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' };

    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <button 
          onClick={() => setActiveCharacter(null)}
          className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-bold transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          VOLTAR PARA PERSONAGENS
        </button>

        <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna da esquerda - Imagem e Info básica */}
            <div className="space-y-6">
              <div>
                <div className="relative mb-4">
                  <div
                    className="w-full h-64 bg-black border-2 border-[#1a2a1a] rounded-lg bg-cover bg-center cursor-pointer hover:border-[#00ff66] transition-colors"
                    style={{ 
                      backgroundImage: activeCharacter.img ? `url(${activeCharacter.img})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                    onClick={startEditCharacterImage}
                  >
                    {!activeCharacter.img && (
                      <div className="absolute inset-0 flex items-center justify-center text-[#4a5a4a] text-sm text-center pointer-events-none">
                        Clique para adicionar<br />imagem do personagem
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Nome do Personagem</label>
                    <input 
                      type="text" 
                      value={activeCharacter.name}
                      onChange={(e) => updateCharacter('name', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Classe</label>
                    <select 
                      value={activeCharacter.class}
                      onChange={(e) => updateCharacter('class', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                    >
                      <option value="Lutador">Lutador</option>
                      <option value="Mago">Mago</option>
                      <option value="Clerigo">Clérigo</option>
                      <option value="Ladino">Ladino</option>
                      <option value="Paladino">Paladino</option>
                      <option value="Explorador">Explorador</option>
                      <option value="Barbaro">Bárbaro</option>
                      <option value="Bardo">Bardo</option>
                      <option value="Druida">Druida</option>
                      <option value="Feiticeiro">Feiticeiro</option>
                      <option value="Bruxo">Bruxo</option>
                      <option value="Monge">Monge</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna do meio - Atributos */}
            <div className="space-y-6">
              <h4 className="text-[#f1e5ac] text-lg font-serif uppercase tracking-widest text-center">Atributos</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(activeCharacter.stats).map(([stat, value]) => (
                  <div key={stat} className="bg-black border border-[#1a2a1a] rounded-lg p-4 text-center">
                    <div className="text-[#4a5a4a] text-[10px] font-black uppercase tracking-widest mb-2">
                      {stat === 'strength' ? 'Força' :
                       stat === 'dexterity' ? 'Destreza' :
                       stat === 'constitution' ? 'Constituição' :
                       stat === 'intelligence' ? 'Inteligência' :
                       stat === 'wisdom' ? 'Sabedoria' : 'Carisma'}
                    </div>
                    <input 
                      type="number" 
                      min="1" 
                      max="20" 
                      value={value}
                      onChange={(e) => updateCharacterStat(stat, e.target.value)}
                      className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded text-white text-center text-xl font-bold py-2 mb-2 focus:outline-none focus:border-[#00ff66]"
                    />
                    <div className="text-[#00ff66] text-lg font-bold">
                      {getModifier(value) >= 0 ? '+' : ''}{getModifier(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna da direita - Habilidades */}
            <div className="space-y-6">
              <h4 className="text-[#f1e5ac] text-lg font-serif uppercase tracking-widest text-center">Pericias</h4>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {['Atletismo', 'Acrobacia', 'Furtividade', 'Prestidigitação', 'Arcanismo', 'História', 'Investigação', 'Natureza', 'Religião', 'Intuição', 'Lidar com Animais', 'Medicina', 'Percepção', 'Sobrevivência', 'Atuação', 'Enganação', 'Intimidação', 'Persuasão'].map(skill => (
                  <div key={skill} className="flex items-center justify-between bg-black border border-[#1a2a1a] rounded px-3 py-2">
                    <label className="flex items-center gap-2 text-white text-sm">
                      <input 
                        type="checkbox"
                        checked={activeCharacter.skills[skill] || false}
                        onChange={(e) => updateSkill(skill, e.target.checked)}
                        className="accent-[#00ff66]"
                      />
                      {skill}
                    </label>
                    <span className="text-[#00ff66] font-bold text-sm">
                      {getSkillModifier(skill) >= 0 ? '+' : ''}{getSkillModifier(skill)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#050a05] text-white font-sans">
      <Navbar />

      <div className="max-w-[1000px] mx-auto py-12 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-bold mb-8 transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          VOLTAR AO DASHBOARD
        </Link>

        <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {!activeCharacter ? (
            <>
              <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-[0.2em] uppercase italic">
                Meus Personagens
              </h2>
              {renderCharacters()}
            </>
          ) : (
            <>
              <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-[0.2em] uppercase italic">
                Ficha do Personagem
              </h2>
              {renderCharacterSheet()}
            </>
          )}
        </div>
      </div>

      {/* Modal de Edição de Imagem do Personagem */}
      <Modal
        isOpen={editingCharacterImg}
        onClose={cancelImageEdit}
        title="Editar Imagem"
      >
        <ImageUpload
          label="Selecionar Imagem do Dispositivo"
          onChange={(e) => handleImageUpload(e, true)}
          currentImage={tempCharacterImg}
          helperText="Selecione uma imagem JPG, PNG ou GIF do seu dispositivo"
        />

        <div className="flex gap-3 pt-4">
          <button 
            onClick={saveCharacterImage}
            disabled={!tempCharacterImg}
            className="flex-1 bg-[#00ff66] text-black font-black py-3 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] disabled:opacity-50"
          >
            Salvar Imagem
          </button>
          <button 
            onClick={() => {
              updateCharacter('img', '');
              cancelImageEdit();
            }}
            className="flex-1 bg-red-600 text-white font-black py-3 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all"
          >
            Remover Imagem
          </button>
        </div>
        
        <button 
          onClick={cancelImageEdit}
          className="w-full border border-[#4a5a4a] text-[#4a5a4a] py-3 rounded-lg text-sm uppercase tracking-widest hover:border-white hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </Modal>
    </main>
  );
}
