'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/components/ui/modal';
import { ArrowLeft, Users, Plus } from 'lucide-react';
import Footer from '@/components/Footer';

export default function CampanhasPage() {
  // Estados da aplicação
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignImg, setCampaignImg] = useState('');
  const [campaignImgFile, setCampaignImgFile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  
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

  return (
    <main className="min-h-screen bg-[#050a05] text-white font-sans">
      <Navbar />

      <div className="max-w-[800px] mx-auto py-12 px-6">

        <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-[0.2em] uppercase italic">
            Minhas Campanhas
          </h2>

          {/* Campanhas */}
          <div className="space-y-6">
            {/* Header com contadores e botões */}
            <div className="flex justify-between items-center">
              <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-[0.2em]">
                Campanhas: {campaigns.length}/6
              </h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 border border-[#00ff66] text-[#00ff66] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#00ff66] hover:text-black transition-all"
                >
                  <Plus size={14} />
                  Juntar à Campanha
                </button>
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)]"
                >
                  <Plus size={14} />
                  Criar Campanha
                </button>
              </div>
            </div>
            
            {/* Grid de campanhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.length === 0 ? (
                <div className="col-span-full text-center py-12 text-[#4a5a4a]">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma campanha criada ainda</p>
                </div>
              ) : (
                campaigns.map(campaign => (
                  <Card
                    key={campaign.id}
                    id={campaign.id}
                    title={campaign.name}
                    subtitle={`Iniciada em: ${campaign.date} | ${campaign.isOwner ? 'Mestre' : 'Jogador'}`}
                    image={campaign.img}
                    dropdownOpen={dropdownOpen === `campaign-${campaign.id}`}
                    onDropdownToggle={() => setDropdownOpen(dropdownOpen === `campaign-${campaign.id}` ? null : `campaign-${campaign.id}`)}
                    onEdit={campaign.isOwner ? () => {
                      setEditingCampaign(campaign);
                      setCampaignName(campaign.name);
                      setCampaignImg(campaign.img);
                      setShowEditModal(true);
                      setDropdownOpen(null);
                    } : undefined}
                    onDelete={() => {
                      if (confirm('Tem certeza que deseja excluir esta campanha?')) {
                        setCampaigns(campaigns.filter(c => c.id !== campaign.id));
                      }
                      setDropdownOpen(null);
                    }}
                    onAccess={() => alert('Acessando campanha...')}
                    onCopyCode={campaign.isOwner ? () => {
                      navigator.clipboard.writeText(campaign.code);
                      alert('Código copiado!');
                      setDropdownOpen(null);
                    } : undefined}
                    showEditOption={campaign.isOwner}
                    showCopyOption={campaign.isOwner}
                    deleteLabel={campaign.isOwner ? 'Excluir' : 'Sair'}
                    accessLabel="Acessar"
                    dropdownRef={dropdownOpen === `campaign-${campaign.id}` ? dropdownRef : undefined}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Criar Campanha */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Criar Campanha"
        onSubmit={(e) => {
          e.preventDefault();
          if (!campaignName.trim()) return alert('Digite um nome para a campanha');
          if (campaigns.length >= 6) return alert('Limite de 6 campanhas atingido');
          
          const newCampaign = {
            id: Date.now(),
            name: campaignName.trim(),
            date: new Date().toLocaleDateString('pt-BR'),
            code: Math.random().toString(36).substr(2, 8).toUpperCase(),
            img: campaignImg || 'https://via.placeholder.com/400x200/333/fff?text=Nova+Campanha',
            isOwner: true
          };
          
          setCampaigns([...campaigns, newCampaign]);
          setShowModal(false);
          setCampaignName('');
          setCampaignImg('');
        }}
      >
        <TextInput
          label="Nome da campanha"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Nome da campanha"
        />
        
        <ImageUpload
          label="Imagem da campanha"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => setCampaignImg(event.target?.result as string);
              reader.readAsDataURL(file);
            }
          }}
          currentImage={campaignImg}
        />

        <ModalButtons
          primaryText="Criar campanha"
          primaryType="submit"
          onSecondary={() => setShowModal(false)}
        />
      </FormModal>

      {/* Modal Juntar-se a Campanha */}
      <FormModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Juntar-se a Campanha"
        onSubmit={(e) => {
          e.preventDefault();
          if (!joinCode.trim()) return alert('Digite o código da campanha');
          
          const newCampaign = {
            id: Date.now(),
            name: `Campanha ${joinCode.trim().toUpperCase()}`,
            date: new Date().toLocaleDateString('pt-BR'),
            code: joinCode.trim().toUpperCase(),
            img: 'https://via.placeholder.com/400x200/333/fff?text=Campanha+Joinada',
            isOwner: false
          };
          
          setCampaigns([...campaigns, newCampaign]);
          setShowJoinModal(false);
          setJoinCode('');
          alert('Campanha adicionada com sucesso!');
        }}
      >
        <TextInput
          label="Código da campanha"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Digite o código da campanha"
        />

        <ModalButtons
          primaryText="Juntar-se à Campanha"
          primaryType="submit"
          onSecondary={() => setShowJoinModal(false)}
        />
      </FormModal>

      {/* Modal Editar Campanha */}
      <FormModal
        isOpen={showEditModal && !!editingCampaign}
        onClose={() => setShowEditModal(false)}
        title="Editar Campanha"
        onSubmit={(e) => {
          e.preventDefault();
          if (!campaignName.trim()) return alert('Digite um nome para a campanha');
          
          setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { ...c, name: campaignName.trim(), img: campaignImg || c.img } : c));
          setShowEditModal(false);
          setEditingCampaign(null);
          setCampaignName('');
          setCampaignImg('');
        }}
      >
        <TextInput
          label="Nome da campanha"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Nome da campanha"
        />
        
        <ImageUpload
          label="Imagem da campanha"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => setCampaignImg(event.target?.result as string);
              reader.readAsDataURL(file);
            }
          }}
          currentImage={campaignImg}
        />

        <ModalButtons
          primaryText="Salvar Alterações"
          primaryType="submit"
          onSecondary={() => setShowEditModal(false)}
        />
      </FormModal>
    </main>
  );
}
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  // Navegação
  const handleNavigation = (view) => {
    setCurrentView(view);
    setActiveCharacter(null);
  };

  // Gerar código único para campanha
  const generateCampaignCode = () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  // Copiar código para clipboard
  const copyCodeToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Código copiado para a área de transferência!');
    } catch (err) {
      // Fallback para navegadores que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Código copiado para a área de transferência!');
    }
  };

  // Funções de campanha
  const joinCampaign = () => {
    if (!joinCode.trim()) {
      alert('Digite o código da campanha!');
      return;
    }
    const existingCampaign = campaigns.find(c => c.code === joinCode.trim().toUpperCase());
    if (existingCampaign) {
      alert('Você já está nesta campanha!');
      setJoinCode('');
      toggleJoinModal(false);
      return;
    }
    setCampaigns([...campaigns, {
      id: Date.now(),
      name: `Campanha ${joinCode}`,
      img: 'https://via.placeholder.com/400x200/222/fff?text=Player',
      date: new Date().toLocaleDateString('pt-BR'),
      code: joinCode.trim().toUpperCase(),
      isOwner: false,
      linkedCharacter: null
    }]);
    setJoinCode('');
    toggleJoinModal(false);
    alert('Você se juntou à campanha com sucesso! Vincule um personagem para acessar.');
  };

  const toggleLinkCharacterModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowLinkCharacterModal(!showLinkCharacterModal);
  };

  const linkCharacterToCampaign = (characterId) => {
    if (selectedCampaign) {
      setCampaigns(campaigns.map(c => 
        c.id === selectedCampaign.id ? { ...c, linkedCharacter: characterId } : c
      ));
      setShowLinkCharacterModal(false);
      setSelectedCampaign(null);
      alert('Personagem vinculado à campanha com sucesso!');
    }
  };

  const accessCampaign = (campaign) => {
    if (!campaign.isOwner && !campaign.linkedCharacter) {
      toggleLinkCharacterModal(campaign);
      return;
    }
    alert(`Acessando campanha: ${campaign.name}`);
  };

  // Upload de imagem
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, isCharacter = false) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isCharacter) {
          setTempCharacterImg(e.target?.result as string);
          setTempCharacterImgFile(file);
        } else {
          setCampaignImg(e.target?.result as string);
          setCampaignImgFile(file);
        }
      };
      reader.readAsDataURL(file);
    } else {
      alert('Por favor, selecione apenas arquivos de imagem.');
      if (event.target) (event.target as HTMLInputElement).value = '';
    }
  };

  // Adicionar campanha
  const addCampaign = () => {
    if (!campaignName.trim()) {
      alert('Digite um nome para a campanha!');
      return;
    }

    const campaignCode = generateCampaignCode();
    const newCampaign = {
      id: Date.now(),
      name: campaignName.trim(),
      img: campaignImg || 'https://via.placeholder.com/400x200/222/fff?text=RPG',
      date: new Date().toLocaleDateString('pt-BR'),
      code: campaignCode,
      isOwner: true,
      linkedCharacter: null
    };

    setCampaigns([...campaigns, newCampaign]);
    toggleModal(false);
    
    // Mostrar código da campanha em modal estilizado
    setCurrentCampaignCode(campaignCode);
    setShowCampaignCodeModal(true);
  };

  // Editar campanha
  const startEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setCampaignName(campaign.name);
    setCampaignImg(campaign.img);
    setShowEditModal(true);
  };

  const saveEditCampaign = () => {
    if (!campaignName.trim()) {
      alert('Digite um nome para a campanha!');
      return;
    }

    const updatedCampaigns = campaigns.map(c => 
      c.id === editingCampaign.id 
        ? { ...c, name: campaignName.trim(), img: campaignImg || c.img }
        : c
    );
    
    setCampaigns(updatedCampaigns);
    toggleEditModal(false);
  };


  const getModifier = (value) => Math.floor((value - 10) / 2);

  // Renderizar campanhas
  const renderCampaigns = () => (
    <div className="space-y-6">
      {/* Header com contadores e botões */}
      <div className="flex justify-between items-center">
        <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-[0.2em]">
          Campanhas: {campaigns.length}/6
        </h3>
        <div className="flex gap-3">
          <button 
            onClick={() => toggleJoinModal(true)}
            className="flex items-center gap-2 border border-[#00ff66] text-[#00ff66] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#00ff66] hover:text-black transition-all"
          >
            <Plus size={14} />
            Juntar à Campanha
          </button>
          <button 
            onClick={() => toggleModal(true)}
            className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)]"
          >
            <Plus size={14} />
            Criar Campanha
          </button>
        </div>
      </div>
      
      {/* Grid de campanhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#4a5a4a]">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhuma campanha criada ainda</p>
          </div>
        ) : (
          campaigns.map(campaign => {
            const linkedCharacter = campaign.linkedCharacter 
              ? characters.find(c => c.id === campaign.linkedCharacter)
              : null;
            
            return (
              <div key={campaign.id} className="group relative bg-black border border-[#1a2a1a] rounded-xl overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] hover:border-[#00ff66] transition-all">
                {/* Imagem de fundo */}
                {campaign.img && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
                    style={{ backgroundImage: `url('${campaign.img}')` }}
                  />
                )}
                
                <div className="relative p-6">
                  {/* Menu dropdown */}
                  <div className="absolute top-4 right-4" ref={dropdownOpen === `campaign-${campaign.id}` ? dropdownRef : null}>
                    <button 
                      onClick={() => toggleDropdown(`campaign-${campaign.id}`)}
                      className="text-[#4a5a4a] hover:text-[#00ff66] p-2 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                      </div>
                    </button>
                    
                    {dropdownOpen === `campaign-${campaign.id}` && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a120a] border border-[#1a2a1a] rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] z-10">
                        {campaign.isOwner && (
                          <>
                            <button
                              onClick={() => {
                                startEditCampaign(campaign);
                                setDropdownOpen(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#4a5a4a] hover:text-[#00ff66] hover:bg-[#1a2a1a] transition-colors flex items-center gap-2"
                            >
                              <Edit size={12} />
                              Editar Campanha
                            </button>
                            <button
                              onClick={() => {
                                copyCodeToClipboard(campaign.code);
                                setDropdownOpen(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-[#4a5a4a] hover:text-[#00ff66] hover:bg-[#1a2a1a] transition-colors"
                            >
                              Copiar Código
                            </button>
                          </>
                        )}
                        {!campaign.isOwner && (
                          <button
                            onClick={() => {
                              toggleLinkCharacterModal(campaign);
                              setDropdownOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-[#4a5a4a] hover:text-[#00ff66] hover:bg-[#1a2a1a] transition-colors"
                          >
                            Vincular Personagem
                          </button>
                        )}
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-[#1a2a1a] transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={12} />
                          {campaign.isOwner ? 'Excluir' : 'Sair'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo do card */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-bold text-lg mb-2">{campaign.name}</h3>
                      <p className="text-[#4a5a4a] text-xs">
                        Iniciada em: {campaign.date} | <span className="text-[#00ff66]">{campaign.isOwner ? 'Mestre' : 'Jogador'}</span>
                      </p>
                      {!campaign.isOwner && linkedCharacter && (
                        <p className="text-[#00ff66] text-xs mt-1">Personagem: {linkedCharacter.name}</p>
                      )}
                      {!campaign.isOwner && !linkedCharacter && (
                        <p className="text-red-400 text-xs mt-1">Personagem não vinculado</p>
                      )}
                    </div>

                    <button 
                      onClick={() => accessCampaign(campaign)}
                      className="w-full bg-[#00ff66] text-black font-black py-3 rounded-lg text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center justify-center gap-2"
                    >
                      <Eye size={14} />
                      {campaign.isOwner || campaign.linkedCharacter ? 'Acessar' : 'Vincular Personagem'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

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
              className="group relative bg-black border border-[#1a2a1a] rounded-xl overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] hover:border-[#00ff66] transition-all"
            >
              {/* Imagem de fundo */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ backgroundImage: `url('${character.img || 'https://via.placeholder.com/400x200/333/fff?text=Personagem'}')` }}
              />
              
              <div className="relative p-6">
                {/* Menu dropdown */}
                <div className="absolute top-4 right-4" ref={dropdownOpen === `character-${character.id}` ? dropdownRef : null}>
                  <button 
                    onClick={() => toggleDropdown(`character-${character.id}`)}
                    className="text-[#4a5a4a] hover:text-[#00ff66] p-2 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="w-1 h-1 bg-current rounded-full"></div>
                      <div className="w-1 h-1 bg-current rounded-full"></div>
                      <div className="w-1 h-1 bg-current rounded-full"></div>
                    </div>
                  </button>
                  
                  {dropdownOpen === `character-${character.id}` && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a120a] border border-[#1a2a1a] rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] z-10">
                      <button
                        onClick={() => deleteCharacter(character.id)}
                        className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-[#1a2a1a] transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={12} />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>

                {/* Conteúdo do card */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">{character.name}</h3>
                    <p className="text-[#4a5a4a] text-xs">
                      {character.class} Nv. {character.level}
                    </p>
                  </div>

                  <button 
                    onClick={() => openCharacterSheet(character.id)}
                    className="w-full bg-[#00ff66] text-black font-black py-3 rounded-lg text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center justify-center gap-2"
                  >
                    <Eye size={14} />
                    Acessar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

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



  const startEditingImage = () => {
    setTempCharacterImg(activeCharacter.img || '');
    setTempCharacterImgFile(null);
    setEditingCharacterImg(true);
  };

  const cancelImageEdit = () => {
    setEditingCharacterImg(false);
    setTempCharacterImg('');
    setTempCharacterImgFile(null);
  };

  const saveCharacterImage = () => {
    updateCharacter('img', tempCharacterImg);
    cancelImageEdit();
  };

  // Renderizar ficha de personagem
  const renderCharacterSheet = () => {
    if (!activeCharacter) return null;

    const statNames = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
    const skillsData = {
      atletismo: { name: 'Atletismo', attr: 'str' }, acrobacia: { name: 'Acrobacia', attr: 'dex' },
      prestidigitacao: { name: 'Prestidigitação', attr: 'dex' }, furtividade: { name: 'Furtividade', attr: 'dex' },
      arcanismo: { name: 'Arcanismo', attr: 'int' }, historia: { name: 'História', attr: 'int' },
      investigacao: { name: 'Investigação', attr: 'int' }, natureza: { name: 'Natureza', attr: 'int' },
      religiao: { name: 'Religião', attr: 'int' }, lidarAnimais: { name: 'Lidar com Animais', attr: 'wis' },
      intuicao: { name: 'Intuição', attr: 'wis' }, medicina: { name: 'Medicina', attr: 'wis' },
      percepcao: { name: 'Percepção', attr: 'wis' }, sobrevivencia: { name: 'Sobrevivência', attr: 'wis' },
      enganacao: { name: 'Enganação', attr: 'cha' }, intimidacao: { name: 'Intimidação', attr: 'cha' },
      atuacao: { name: 'Atuação', attr: 'cha' }, persuasao: { name: 'Persuasão', attr: 'cha' }
    };

    const getSkillModifier = (skill, attr) => {
      const baseModifier = getModifier(activeCharacter.stats[attr]);
      return activeCharacter.skills[skill] ? baseModifier + activeCharacter.proficiencyBonus : baseModifier;
    };

    const inputStyle = { width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' };
    const labelStyle = { display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' };

    return (
      <div className="container" style={{ maxWidth: '1200px' }}>
        <div style={{ marginBottom: '20px' }}>
          <button className="back-button" onClick={backToCharacters}>
            ← Voltar aos personagens
          </button>
        </div>
        
        <div style={{ background: '#141414', border: '1px solid #333', padding: '30px', borderRadius: '10px' }}>
          {/* Layout de 3 colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '30px' }}>
            
            {/* Coluna Esquerda - Informações Básicas */}
            <div>
              {/* Avatar e Nome */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ position: 'relative', marginBottom: '15px' }}>
                  <div 
                    style={{ 
                      width: '150px', 
                      height: '150px', 
                      borderRadius: '10px', 
                      backgroundColor: '#000', 
                      backgroundImage: activeCharacter.img ? `url('${activeCharacter.img}')` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'border 0.3s ease',
                      margin: '0 auto'
                    }}
                    onClick={startEditingImage}
                    onMouseEnter={(e) => e.target.style.border = '2px solid #0a4d0a'}
                    onMouseLeave={(e) => e.target.style.border = '2px solid transparent'}
                    title="Clique para editar imagem"
                  ></div>
                  {!activeCharacter.img && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#666', fontSize: '0.8rem', textAlign: 'center', pointerEvents: 'none' }}>
                      Clique para<br />adicionar foto
                    </div>
                  )}
                </div>
                
                {/* Nome do Personagem */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.9rem', marginBottom: '5px' }}>Nome do Personagem</label>
                  <input
                    type="text"
                    value={activeCharacter.name}
                    onChange={(e) => updateCharacter('name', e.target.value)}
                    placeholder="Nome do Personagem"
                    style={{ width: '100%', padding: '8px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none' }}
                  />
                </div>
                
                {/* Nome do Jogador */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.9rem', marginBottom: '5px' }}>Nome do Jogador</label>
                  <input
                    type="text"
                    value={activeCharacter.playerName || ''}
                    onChange={(e) => updateCharacter('playerName', e.target.value)}
                    placeholder="Nome do Jogador"
                    style={{ width: '100%', padding: '8px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>
              
              {/* Informações Básicas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' }}>Classe</label>
                  <input
                    type="text"
                    value={activeCharacter.class}
                    onChange={(e) => updateCharacter('class', e.target.value)}
                    style={{ width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' }}>Nível</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={activeCharacter.level}
                    onChange={(e) => updateCharacter('level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' }}>Raça</label>
                  <input
                    type="text"
                    value={activeCharacter.race || ''}
                    onChange={(e) => updateCharacter('race', e.target.value)}
                    style={{ width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' }}>Alinhamento</label>
                  <input
                    type="text"
                    value={activeCharacter.alignment || ''}
                    onChange={(e) => updateCharacter('alignment', e.target.value)}
                    style={{ width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              
              {/* Antecedente e XP */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' }}>Antecedente</label>
                  <input
                    type="text"
                    value={activeCharacter.background || ''}
                    onChange={(e) => updateCharacter('background', e.target.value)}
                    style={{ width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#0a4d0a', fontSize: '0.8rem', marginBottom: '3px' }}>Pontos de Experiência</label>
                  <input
                    type="number"
                    min="0"
                    value={activeCharacter.experiencePoints || 0}
                    onChange={(e) => updateCharacter('experiencePoints', Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: '100%', padding: '6px', background: 'rgba(42, 42, 42, 0.5)', border: '1px solid #333', borderRadius: '4px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              
              {/* Inspiração e Bônus de Proficiência */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#0b0b0b', padding: '10px', border: '1px solid #222', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '5px' }}>INSPIRAÇÃO</div>
                  <input
                    type="checkbox"
                    checked={activeCharacter.inspiration || false}
                    onChange={(e) => updateCharacter('inspiration', e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#0a4d0a' }}
                  />
                </div>
                <div style={{ background: '#0b0b0b', padding: '10px', border: '1px solid #222', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '5px' }}>BÔNUS PROF.</div>
                  <input
                    type="number"
                    min="2"
                    max="6"
                    value={activeCharacter.proficiencyBonus || 2}
                    onChange={(e) => updateCharacter('proficiencyBonus', Math.max(2, Math.min(6, parseInt(e.target.value) || 2)))}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Coluna Central - Atributos */}
            <div>
              {/* Atributos Principais */}
              <h3 style={{ color: '#0a4d0a', marginBottom: '20px', textAlign: 'center' }}>Atributos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
                {Object.entries(activeCharacter.stats).map(([stat, value]) => {
                  const modifier = getModifier(value);
                  return (
                    <div key={stat} style={{ textAlign: 'center', backgroundColor: '#0b0b0b', padding: '15px', border: '1px solid #222', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '8px' }}>{statNames[stat]}</div>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={value}
                        onChange={(e) => updateCharacterStat(stat, e.target.value)}
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          margin: '5px 0',
                          color: '#fff',
                          background: 'transparent',
                          border: '2px solid transparent',
                          borderRadius: '4px',
                          textAlign: 'center',
                          width: '100%',
                          outline: 'none',
                          padding: '2px'
                        }}
                      />
                      <div style={{ fontSize: '0.8rem', color: '#0a4d0a' }}>+{modifier}</div>
                    </div>
                  );
                })}
              </div>
              
              {/* Salvaguardas */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#0a4d0a', marginBottom: '10px', fontSize: '1rem' }}>Salvaguardas</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.entries(statNames).map(([stat, name]) => {
                    const modifier = getModifier(activeCharacter.stats[stat]);
                    const proficient = activeCharacter.savingThrows?.[stat] || false;
                    const totalBonus = proficient ? modifier + activeCharacter.proficiencyBonus : modifier;
                    return (
                      <div key={stat} style={{ display: 'flex', alignItems: 'center', background: 'rgba(42, 42, 42, 0.3)', padding: '8px', borderRadius: '4px' }}>
                        <input
                          type="checkbox"
                          checked={proficient}
                          onChange={(e) => updateSavingThrow(stat, e.target.checked)}
                          style={{ marginRight: '8px', accentColor: '#0a4d0a' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#fff', flex: 1 }}>{name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#0a4d0a', fontWeight: 'bold' }}>+{totalBonus}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Coluna Direita - Perícias */}
            <div>
              <h3 style={{ color: '#0a4d0a', marginBottom: '20px', textAlign: 'center' }}>Perícias</h3>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {Object.entries(skillsData).map(([skillKey, skillInfo]) => {
                  const proficient = activeCharacter.skills?.[skillKey] || false;
                  const skillModifier = getSkillModifier(skillKey, skillInfo.attr);
                  return (
                    <div key={skillKey} style={{ display: 'flex', alignItems: 'center', background: 'rgba(42, 42, 42, 0.3)', padding: '8px', borderRadius: '4px', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={proficient}
                        onChange={(e) => updateSkill(skillKey, e.target.checked)}
                        style={{ marginRight: '8px', accentColor: '#0a4d0a' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#fff', flex: 1 }}>{skillInfo.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#666', marginRight: '8px' }}>({statNames[skillInfo.attr]})</span>
                      <span style={{ fontSize: '0.8rem', color: '#0a4d0a', fontWeight: 'bold', width: '30px', textAlign: 'right' }}>+{skillModifier}</span>
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
    <main className="min-h-screen bg-[#050a05] text-white font-sans">
      <Navbar />

      <div className="max-w-[800px] mx-auto py-12 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-[#4a5a4a] hover:text-[#00ff66] text-xs font-bold mb-8 transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          VOLTAR AO DASHBOARD
        </Link>

        <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-[0.2em] uppercase italic">
            {currentView === 'campanhas' ? 'Minhas Campanhas' : 
             currentView === 'personagens' ? 'Meus Personagens' :
             'Ficha do Personagem'}
          </h2>

          {/* Navigation */}
          <div className="flex gap-4 mb-8 justify-center">
            <button 
              onClick={() => handleNavigation('campanhas')}
              className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${
                currentView === 'campanhas' 
                  ? 'bg-[#00ff66] text-black border-[#00ff66]' 
                  : 'border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black'
              }`}
            >
              <Users size={14} className="inline mr-2" />
              Campanhas
            </button>
            <button 
              onClick={() => handleNavigation('personagens')}
              className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest border transition-all ${
                currentView === 'personagens' 
                  ? 'bg-[#00ff66] text-black border-[#00ff66]' 
                  : 'border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black'
              }`}
            >
              <Sword size={14} className="inline mr-2" />
              Personagens
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {currentView === 'campanhas' && renderCampaigns()}
            {currentView === 'personagens' && renderCharacters()}
            {currentView === 'character-sheet' && renderCharacterSheet()}
          </div>
        </div>
      </div>

      {/* Modal de Edição de Campanha */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && toggleEditModal(false)}>
          <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-[#f1e5ac] text-xl font-serif text-center mb-8 tracking-[0.2em] uppercase italic">Editar Campanha</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  Nome da campanha
                </label>
                <input 
                  type="text" 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Nome da campanha"
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-4 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                />
              </div>
              
              <div>
                <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  Imagem da campanha
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-black file:bg-[#00ff66] file:text-black"
                />
                {campaignImg && (
                  <div className="mt-4 text-center">
                    <img 
                      src={campaignImg} 
                      alt="Preview" 
                      className="max-w-52 max-h-24 object-cover rounded border border-[#1a2a1a] mx-auto"
                    />
                  </div>
                )}
                <span className="text-[#4a5a4a] text-[10px] italic mt-2 block">
                  Selecione uma nova imagem do seu dispositivo (opcional)
                </span>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  onClick={saveEditCampaign}
                  className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)]"
                >
                  Salvar Alterações
                </button>
                <button 
                  onClick={() => toggleEditModal(false)}
                  className="w-full border border-[#4a5a4a] text-[#4a5a4a] py-4 rounded-lg text-sm uppercase tracking-widest hover:border-white hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Código da Campanha */}
      {showCampaignCodeModal && (
        <div className="modal show" onClick={(e) => e.target.classList.contains('modal') && setShowCampaignCodeModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Campanha Criada com Sucesso!</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: '#0a4d0a', marginBottom: '20px', textAlign: 'center', fontSize: '1.1rem' }}>
                ✓ Sua campanha foi criada e está pronta para receber jogadores!
              </p>
              
              <div className="input-group">
                <label>Código da Campanha</label>
                <div style={{
                  background: '#0a2410',
                  border: '2px solid #0a4d0a',
                  padding: '15px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    color: '#fff',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    letterSpacing: '4px',
                    fontFamily: 'monospace'
                  }}>
                    {currentCampaignCode}
                  </span>
                </div>
                <span style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', display: 'block' }}>
                  Compartilhe este código com seus jogadores para que possam se juntar à campanha
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <div className="btn-submit-container" style={{ flex: '1' }}>
                  <button 
                    className="btn-submit" 
                    onClick={() => {
                      copyCodeToClipboard(currentCampaignCode);
                      setShowCampaignCodeModal(false);
                    }}
                  >
                    Copiar Código
                  </button>
                </div>
              </div>
              
              <div className="btn-cancel" onClick={() => setShowCampaignCodeModal(false)}>
                Fechar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Juntar Campanha */}
      {showJoinModal && (
        <div className="modal show" onClick={(e) => e.target.classList.contains('modal') && toggleJoinModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Juntar à Campanha</h2>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Código da Campanha</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código da campanha"
                  style={{
                    background: '#0f1110',
                    border: '1px solid #333',
                    padding: '10px',
                    color: 'white',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    fontSize: '1.2rem',
                    letterSpacing: '2px'
                  }}
                  maxLength="8"
                />
                <span style={{ color: '#888', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Insira o código de 8 caracteres fornecido pelo mestre
                </span>
              </div>
              
              <div className="btn-submit-container">
                <button className="btn-submit" onClick={joinCampaign}>
                  Juntar à Campanha
                </button>
              </div>
              <div className="btn-cancel" onClick={() => toggleJoinModal(false)}>
                Cancelar
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* Modal para Vincular Personagem */}
      {showLinkCharacterModal && selectedCampaign && (
        <div className="modal show" onClick={(e) => e.target.classList.contains('modal') && setShowLinkCharacterModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Vincular Personagem</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: '#888', marginBottom: '20px' }}>
                Selecione um personagem para usar na campanha <strong>{selectedCampaign.name}</strong>
              </p>
              
              {characters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <p>Você não possui personagens criados.</p>
                  <button 
                    className="btn-submit" 
                    onClick={() => {
                      setShowLinkCharacterModal(false);
                      createCharacter();
                    }}
                    style={{ marginTop: '10px' }}
                  >
                    Criar Primeiro Personagem
                  </button>
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {characters.map(character => (
                    <div 
                      key={character.id} 
                      onClick={() => linkCharacterToCampaign(character.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        margin: '5px 0',
                        background: 'rgba(42, 42, 42, 0.5)',
                        border: '1px solid #333',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(10, 77, 10, 0.2)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(42, 42, 42, 0.5)'}
                    >
                      <div 
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '5px',
                          backgroundImage: character.img ? `url('${character.img}')` : 'none',
                          backgroundColor: '#000',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          marginRight: '15px'
                        }}
                      />
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{character.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>
                          {character.class} Nv. {character.level} - {character.race || 'Raça não definida'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="btn-cancel" onClick={() => setShowLinkCharacterModal(false)} style={{ marginTop: '15px' }}>
                Cancelar
              </div>
            </div>
          </div>
        </div>
      )}
      
      {editingCharacterImg && (
        <div className="modal show" onClick={(e) => e.target.classList.contains('modal') && cancelImageEdit()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Editar Imagem do Personagem</h2>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Selecionar Imagem do Dispositivo</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                  style={{
                    padding: '8px',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
                <span style={{ color: '#444', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '5px', display: 'block' }}>
                  Selecione uma imagem JPG, PNG ou GIF do seu dispositivo
                </span>
                {tempCharacterImg && (
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <img 
                      src={tempCharacterImg} 
                      alt="Preview" 
                      style={{
                        maxWidth: '200px',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #555'
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <div className="btn-submit-container" style={{ flex: '1' }}>
                  <button 
                    className="btn-submit" 
                    onClick={saveCharacterImage}
                    disabled={!tempCharacterImg}
                    style={{ opacity: tempCharacterImg ? 1 : 0.5 }}
                  >
                    Salvar Imagem
                  </button>
                </div>
                <div className="btn-submit-container" style={{ flex: '1' }}>
                  <button 
                    className="btn-submit" 
                    onClick={() => {
                      updateCharacter('img', '');
                      cancelImageEdit();
                    }}
                    style={{ backgroundColor: '#4d0a0a', borderColor: '#630e0e' }}
                  >
                    Remover Imagem
                  </button>
                </div>
              </div>
              <div className="btn-cancel" onClick={cancelImageEdit}>
                Cancelar
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* MODAL  */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1a1a1a', width: '400px', border: '1px solid #333' }}>
            <div style={{ backgroundColor: '#333', padding: '15px', textAlign: 'center', borderBottom: '1px solid #111' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'black', fontWeight: 'bold' }}>Criar Campanha</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addCampaign(); }} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ color: '#888', fontSize: '1.1rem' }}>Nome da campanha</label>
                <input 
                  type="text" 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Nome da campanha"
                />
              </div>
              <div className="input-group">
                <label>Imagem da campanha</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{
                    padding: '8px',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                {campaignImg && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img 
                      src={campaignImg} 
                      alt="Preview" 
                      style={{
                        maxWidth: '200px',
                        maxHeight: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #555'
                      }}
                    />
                  </div>
                )}
                <span style={{ color: '#888', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Selecione uma imagem do seu dispositivo
                </span>
              </div>
              
              <div className="btn-submit-container">
                <button type="submit" className="btn-submit">
                  Criar campanha
                </button>
              </div>
              <div className="btn-cancel" onClick={() => toggleModal(false)}>
                Cancelar
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
