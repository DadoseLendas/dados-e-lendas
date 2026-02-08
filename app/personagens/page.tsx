'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { Sword, Plus, ArrowLeft } from 'lucide-react';

export default function PersonagensPage() {
  // Estados da aplicação
  const [abaAtiva, setAbaAtiva] = useState('personagens');
  const [characters, setCharacters] = useState([]);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [editingCharacterImg, setEditingCharacterImg] = useState(false);
  const [tempCharacterImg, setTempCharacterImg] = useState('');
  const [tempCharacterImgFile, setTempCharacterImgFile] = useState(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState('');
  
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
      name: 'Novo Personagem',
      class: 'Lutador',
      level: 1,
      race: '',
      background: '',
      alignment: '',
      experiencePoints: 0,
      proficiencyBonus: 2,
      inspiration: false,
      stats: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
      },
      savingThrows: {
        str: false,
        dex: false,
        con: false,
        int: false,
        wis: false,
        cha: false
      },
      skills: {
        acrobacia: false,
        arcanismo: false,
        atletismo: false,
        atuacao: false,
        enganacao: false,
        furtividade: false,
        historia: false,
        intimidacao: false,
        intuicao: false,
        investigacao: false,
        lidarAnimais: false,
        medicina: false,
        natureza: false,
        percepcao: false,
        persuasao: false,
        prestidigitacao: false,
        religiao: false,
        sobrevivencia: false
      },
      inventory: [],
      img: ''
    };
    
    setCharacters([...characters, newCharacter]);
  };

  const openCharacterSheet = (characterId: number | null) => {
    setActiveCharacter(characters.find(c => c.id === characterId) || null);
  };

  const backToCharacters = () => {
    setActiveCharacter(null);
  };

  const toggleDropdown = (itemId: string) => {
    setDropdownOpen(dropdownOpen === itemId ? null : itemId);
  };

  const deleteCharacter = (characterId: number | null) => {
    if (confirm('Tem certeza que deseja excluir este personagem?')) {
      setCharacters(characters.filter(c => c.id !== characterId));
      if (activeCharacter?.id === characterId) backToCharacters();
    }
  };

  const getModifier = (value: number) => Math.floor((value - 10) / 2);

  const updateCharacter = (field: string, value: any) => {
    if (!activeCharacter) return;
    const updatedCharacter = { ...activeCharacter, [field]: value };
    setActiveCharacter(updatedCharacter);
    setCharacters(characters.map(c => c.id === activeCharacter.id ? updatedCharacter : c));
  };

  const updateCharacterStat = (stat: string, value: string) => {
    const numValue = Math.max(1, Math.min(20, parseInt(value) || 1));
    if (activeCharacter) {
      updateCharacter('stats', { ...activeCharacter.stats, [stat]: numValue });
    }
  };

  const updateSavingThrow = (stat: string, value: boolean) => {
    if (activeCharacter) {
      updateCharacter('savingThrows', { ...activeCharacter.savingThrows, [stat]: value });
    }
  };

  const updateSkill = (skill: string, value: boolean) => {
    if (activeCharacter) {
      updateCharacter('skills', { ...activeCharacter.skills, [skill]: value });
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setTempCharacterImg(result);
        setTempCharacterImgFile(file);
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

  const addInventoryItem = () => {
    if (!newInventoryItem.trim() || !activeCharacter) return;
    const updatedInventory = [...(activeCharacter.inventory || []), { id: Date.now(), name: newInventoryItem }];
    updateCharacter('inventory', updatedInventory);
    setNewInventoryItem('');
  };

  const removeInventoryItem = (itemId: number) => {
    if (!activeCharacter) return;
    const updatedInventory = activeCharacter.inventory.filter((item: any) => item.id !== itemId);
    updateCharacter('inventory', updatedInventory);
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
            <div
              key={character.id}
              className="bg-[#0a120a] border border-[#1a2a1a] rounded-lg p-6 hover:border-[#00ff66] transition-all"
              style={{
                backgroundImage: character.img ? `url('${character.img}')` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="bg-black/70 rounded-lg p-6 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-[#00ff66] text-lg font-bold mb-1">{character.name}</h3>
                  <p className="text-[#4a5a4a] text-xs uppercase tracking-wider">{character.class} Nv. {character.level}</p>
                </div>
                <div className="flex justify-between items-center mt-4 gap-2">
                  <button
                    onClick={() => openCharacterSheet(character.id)}
                    className="flex-1 bg-[#00ff66] text-black font-black py-2 rounded text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    Acessar
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(`character-${character.id}`)}
                      className="text-[#00ff66] hover:text-white transition-colors px-2"
                    >
                      ⋮
                    </button>
                    {dropdownOpen === `character-${character.id}` && (
                      <div className="absolute right-0 mt-2 w-32 bg-[#050a05] border border-[#1a2a1a] rounded-lg shadow-lg z-10"
                        ref={dropdownRef}
                      >
                        <button
                          onClick={() => {
                            deleteCharacter(character.id);
                            setDropdownOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-400/10 text-xs uppercase font-bold tracking-wider"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const getSkillModifier = (skill: string, attr: string) => {
    if (!activeCharacter) return 0;
    const baseModifier = getModifier(activeCharacter.stats[attr as keyof typeof activeCharacter.stats] || 10);
    const proficient = activeCharacter.skills[skill as keyof typeof activeCharacter.skills] || false;
    return proficient ? baseModifier + activeCharacter.proficiencyBonus : baseModifier;
  };

  const skillsData: Record<string, { name: string; attr: string }> = {
    atletismo: { name: 'Atletismo', attr: 'str' },
    acrobacia: { name: 'Acrobacia', attr: 'dex' },
    prestidigitacao: { name: 'Prestidigitação', attr: 'dex' },
    furtividade: { name: 'Furtividade', attr: 'dex' },
    arcanismo: { name: 'Arcanismo', attr: 'int' },
    historia: { name: 'História', attr: 'int' },
    investigacao: { name: 'Investigação', attr: 'int' },
    natureza: { name: 'Natureza', attr: 'int' },
    religiao: { name: 'Religião', attr: 'int' },
    lidarAnimais: { name: 'Lidar com Animais', attr: 'wis' },
    intuicao: { name: 'Intuição', attr: 'wis' },
    medicina: { name: 'Medicina', attr: 'wis' },
    percepcao: { name: 'Percepção', attr: 'wis' },
    sobrevivencia: { name: 'Sobrevivência', attr: 'wis' },
    enganacao: { name: 'Enganação', attr: 'cha' },
    intimidacao: { name: 'Intimidação', attr: 'cha' },
    atuacao: { name: 'Atuação', attr: 'cha' },
    persuasao: { name: 'Persuasão', attr: 'cha' }
  };

  const statNames: Record<string, string> = {
    str: 'Força',
    dex: 'Destreza',
    con: 'Constituição',
    int: 'Inteligência',
    wis: 'Sabedoria',
    cha: 'Carisma'
  };

  // Renderizar ficha de personagem
  const renderCharacterSheet = () => {
    if (!activeCharacter) return null;

    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <button 
          onClick={backToCharacters}
          className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-bold transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          VOLTAR PARA PERSONAGENS
        </button>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Coluna Esquerda - Informações Básicas */}
            <div className="space-y-6">
              <div>
                <div className="relative mb-4">
                  <div
                    className="w-full h-48 bg-black border-2 border-[#1a2a1a] rounded-lg bg-cover bg-center cursor-pointer hover:border-[#00ff66] transition-colors"
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
                      className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Classe</label>
                      <input 
                        type="text" 
                        value={activeCharacter.class}
                        onChange={(e) => updateCharacter('class', e.target.value)}
                        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Nível</label>
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        value={activeCharacter.level}
                        onChange={(e) => updateCharacter('level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Raça</label>
                      <input 
                        type="text" 
                        value={activeCharacter.race}
                        onChange={(e) => updateCharacter('race', e.target.value)}
                        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Alinhamento</label>
                      <input 
                        type="text" 
                        value={activeCharacter.alignment}
                        onChange={(e) => updateCharacter('alignment', e.target.value)}
                        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Antecedente</label>
                    <input 
                      type="text" 
                      value={activeCharacter.background}
                      onChange={(e) => updateCharacter('background', e.target.value)}
                      className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Pontos de Experiência</label>
                    <input 
                      type="number" 
                      min="0"
                      value={activeCharacter.experiencePoints}
                      onChange={(e) => updateCharacter('experiencePoints', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                    />
                  </div>



                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black border border-[#1a2a1a] rounded-lg p-3 text-center">
                      <div className="text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Inspiração</div>
                      <input
                        type="checkbox"
                        checked={activeCharacter.inspiration}
                        onChange={(e) => updateCharacter('inspiration', e.target.checked)}
                        className="accent-[#00ff66]"
                      />
                    </div>
                    <div className="bg-black border border-[#1a2a1a] rounded-lg p-3 text-center">
                      <div className="text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Bônus Prof.</div>
                      <input
                        type="number"
                        min="2"
                        max="6"
                        value={activeCharacter.proficiencyBonus}
                        onChange={(e) => updateCharacter('proficiencyBonus', Math.max(2, Math.min(6, parseInt(e.target.value) || 2)))}
                        className="w-full bg-transparent text-white text-center font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna do Meio - Atributos */}
            <div className="space-y-6">
              <h3 className="text-[#f1e5ac] text-lg font-serif uppercase tracking-widest text-center">Atributos</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(activeCharacter.stats).map(([stat, value]) => {
                  const modifier = getModifier(value);
                  return (
                    <div key={stat} className="bg-black border border-[#1a2a1a] rounded-lg p-3 text-center">
                      <div className="text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                        {statNames[stat]}
                      </div>
                      <input 
                        type="number" 
                        min="1" 
                        max="20" 
                        value={value}
                        onChange={(e) => updateCharacterStat(stat, e.target.value)}
                        className="w-full bg-[#0a120a] border border-[#1a2a1a] rounded text-white text-center text-lg font-bold py-1 mb-2 focus:outline-none focus:border-[#00ff66]"
                      />
                      <div className="text-[#00ff66] text-sm font-bold">
                        {modifier >= 0 ? '+' : ''}{modifier}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h4 className="text-[#f1e5ac] text-sm font-serif uppercase tracking-wider mb-3">Salvaguardas</h4>
                <div className="space-y-2">
                  {Object.entries(statNames).map(([stat, name]) => {
                    const modifier = getModifier(activeCharacter.stats[stat as keyof typeof activeCharacter.stats] || 10);
                    const proficient = activeCharacter.savingThrows?.[stat as keyof typeof activeCharacter.savingThrows] || false;
                    const totalBonus = proficient ? modifier + activeCharacter.proficiencyBonus : modifier;
                    return (
                      <div key={stat} className="flex items-center justify-between bg-black border border-[#1a2a1a] rounded px-3 py-2">
                        <label className="flex items-center gap-2 text-white text-sm">
                          <input 
                            type="checkbox"
                            checked={proficient}
                            onChange={(e) => updateSavingThrow(stat, e.target.checked)}
                            className="accent-[#00ff66]"
                          />
                          {name}
                        </label>
                        <span className="text-[#00ff66] font-bold text-sm">
                          {totalBonus >= 0 ? '+' : ''}{totalBonus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coluna da Direita - Perícias e Inventário */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[#f1e5ac] text-lg font-serif uppercase tracking-widest text-center mb-3">Perícias</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(skillsData).map(([skillKey, skillInfo]) => {
                    const proficient = activeCharacter.skills?.[skillKey] || false;
                    const skillModifier = getSkillModifier(skillKey, skillInfo.attr);
                    return (
                      <div key={skillKey} className="flex items-center justify-between bg-black border border-[#1a2a1a] rounded px-3 py-2">
                        <label className="flex items-center gap-2 text-white text-sm">
                          <input 
                            type="checkbox"
                            checked={proficient}
                            onChange={(e) => updateSkill(skillKey, e.target.checked)}
                            className="accent-[#00ff66]"
                          />
                          <span>{skillInfo.name}</span>
                        </label>
                        <span className="text-[#00ff66] font-bold text-sm">
                          {skillModifier >= 0 ? '+' : ''}{skillModifier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[#f1e5ac] text-lg font-serif uppercase tracking-widest text-center mb-3">Inventário</h3>
                <div className="bg-black border border-[#1a2a1a] rounded-lg p-3 space-y-2">
                  {activeCharacter.inventory && activeCharacter.inventory.length > 0 ? (
                    activeCharacter.inventory.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between bg-[#0a120a] border border-[#1a2a1a] rounded px-2 py-1 text-xs">
                        <span className="text-[#00ff66]">{item.name}</span>
                        <button
                          onClick={() => removeInventoryItem(item.id)}
                          className="text-red-400 hover:text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[#4a5a4a] text-xs text-center py-2">Vazio</p>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-[#1a2a1a]">
                    <input 
                      type="text" 
                      value={newInventoryItem}
                      onChange={(e) => setNewInventoryItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addInventoryItem()}
                      placeholder="Item..."
                      className="flex-1 bg-black border border-[#1a2a1a] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#00ff66]"
                    />
                    <button
                      onClick={addInventoryItem}
                      className="bg-[#00ff66] text-black px-2 py-1 rounded text-xs font-black hover:brightness-110"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} isLoggedIn />
      <div className="max-w-[1400px] mx-auto py-12 px-6">
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
      {editingCharacterImg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={cancelImageEdit}>
          <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[#f1e5ac] text-xl font-serif mb-6 tracking-[0.2em] uppercase">Editar Imagem</h2>
            
            <div className="mb-6">
              <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                Selecionar Imagem do Dispositivo
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66]"
              />
              <span className="text-[#4a5a4a] text-xs italic mt-2 block">
                Selecione uma imagem JPG, PNG ou GIF do seu dispositivo
              </span>
              {tempCharacterImg && (
                <div className="mt-4 text-center">
                  <img 
                    src={tempCharacterImg} 
                    alt="Preview" 
                    className="max-w-full max-h-40 object-cover rounded-lg border border-[#1a2a1a] mx-auto"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={saveCharacterImage}
                disabled={!tempCharacterImg}
                className="flex-1 bg-[#00ff66] text-black font-black py-3 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
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
              className="w-full border border-[#4a5a4a] text-[#4a5a4a] hover:border-white hover:text-white py-3 rounded-lg text-sm uppercase tracking-widest transition-colors mt-3"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
