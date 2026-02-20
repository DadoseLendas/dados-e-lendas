'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import type { ChangeEvent } from 'react';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal';
import { Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function CampanhasPage() {
  const supabase = useMemo(() => createClient(), []);
  const [abaAtiva, setAbaAtiva] = useState('campanhas');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Criação
  const [campaignName, setCampaignName] = useState('');
  const [campaignImg, setCampaignImg] = useState(''); // Estado da imagem reativado
  const [editingCampaignId, setEditingCampaignId] = useState<string | number | null>(null);
  const [editCampaignName, setEditCampaignName] = useState('');
  const [editCampaignImg, setEditCampaignImg] = useState('');
  
  // Lógica de entrada (Join)
  const [joinCode, setJoinCode] = useState('');
  const [step, setStep] = useState(1);
  const [tempCampaign, setTempCampaign] = useState<any>(null);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
      setAuthReady(true);
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (!currentUserId) {
        setCampaigns([]);
        return;
      }

      const { data: ownedCampaigns, error: ownedError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('dm_id', currentUserId);

      if (ownedError) throw ownedError;

      const { data: membershipRows, error: membershipError } = await supabase
        .from('campaign_members')
        .select('campaign_id')
        .eq('user_id', currentUserId);

      if (membershipError) {
        console.warn('Não foi possível ler campaign_members. Exibindo apenas campanhas do mestre.', membershipError.message);
      }

      const membershipCampaignIds = ((membershipRows ?? []) as Array<{ campaign_id: string | number }>).map(row => row.campaign_id);
      let memberCampaigns: any[] = [];

      if (!membershipError && membershipCampaignIds.length > 0) {
        const { data: campaignsFromMembership, error: membershipCampaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .in('id', membershipCampaignIds);

        if (membershipCampaignsError) {
          console.warn('Não foi possível carregar campanhas por membership.', membershipCampaignsError.message);
        }
        memberCampaigns = campaignsFromMembership ?? [];
      }

      const uniqueCampaigns = new Map();
      [...(ownedCampaigns ?? []), ...memberCampaigns].forEach((campaign) => {
        uniqueCampaigns.set(campaign.id, campaign);
      });

      const allCampaigns = Array.from(uniqueCampaigns.values());

      if (allCampaigns.length > 0) {
        const formatted = [...allCampaigns]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          date: new Date(c.created_at).toLocaleDateString('pt-BR'),
          isOwner: c.dm_id === currentUserId,
          img: c.image_url || 'https://via.placeholder.com/400x200/0a120a/00ff66?text=RPG'
        }));
        setCampaigns(formatted);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Erro ao buscar campanhas:", err);
      setFetchError('Não foi possível carregar campanhas. Verifique as políticas RLS de SELECT no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    fetchCampaigns();
  }, [authReady, currentUserId]);

  // LÓGICA DE TRATAMENTO DE IMAGEM
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setCampaignImg(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setEditCampaignImg(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // FUNÇÃO DE CRIAÇÃO CORRIGIDA
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tentando criar campanha...");

    try {
      const trimmedCampaignName = campaignName.trim();
      if (!trimmedCampaignName) {
        alert('Informe um nome para a campanha.');
        return;
      }

      if (!currentUserId) return alert("Usuário não autenticado");

      const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();

      // IMPORTANTE: Se o seu banco não tiver a coluna 'image_url', remova-a abaixo
      const { data: createdCampaign, error } = await supabase
        .from('campaigns')
        .insert({
          name: trimmedCampaignName,
          code: inviteCode,
          dm_id: currentUserId,
          image_url: campaignImg || null
        })
        .select()
        .single();

      if (error) {
        console.error("Erro do Supabase:", error);
        alert(`Erro: ${error.message}`);
        return;
      }

      if (createdCampaign) {
        const { error: memberError } = await supabase
          .from('campaign_members')
          .insert({
            campaign_id: createdCampaign.id,
            user_id: currentUserId,
          });

        if (memberError) {
          console.warn('Campanha criada, mas não foi possível adicionar o mestre como membro:', memberError.message);
        }

        setCampaigns((prev) => {
          const alreadyExists = prev.some((campaign) => campaign.id === createdCampaign.id);
          if (alreadyExists) return prev;

          const newCampaign = {
            id: createdCampaign.id,
            name: createdCampaign.name,
            code: createdCampaign.code,
            date: new Date(createdCampaign.created_at).toLocaleDateString('pt-BR'),
            isOwner: createdCampaign.dm_id === currentUserId,
            img: campaignImg || createdCampaign.image_url || 'https://via.placeholder.com/400x200/0a120a/00ff66?text=RPG'
          };

          return [newCampaign, ...prev];
        });
      }

      console.log("Campanha criada com sucesso:", createdCampaign);
      setShowModal(false);
      setCampaignName('');
      setCampaignImg('');
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  };

  const handleJoinCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    if (step === 1) {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (error || !campaign) return alert('Código inválido.');

      const { data: chars } = await supabase
        .from('characters')
        .select('id, name')
        .eq('owner_id', currentUserId);

      if (!chars || chars.length === 0) return alert('Crie um personagem primeiro!');

      setTempCampaign(campaign);
      setUserCharacters(chars);
      setStep(2);
    } else {
      const { error: joinError } = await supabase
        .from('campaign_members')
        .insert({
          campaign_id: tempCampaign.id,
          user_id: currentUserId,
          current_character_id: parseInt(selectedCharacterId)
        });

      if (joinError) return alert('Erro ao entrar.');

      setShowJoinModal(false);
      setStep(1);
      setJoinCode('');
      fetchCampaigns();
    }
  };

  const openEditModal = (campaign: any) => {
    setEditingCampaignId(campaign.id);
    setEditCampaignName(campaign.name ?? '');
    setEditCampaignImg(campaign.img ?? '');
    setDropdownOpen(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingCampaignId(null);
    setEditCampaignName('');
    setEditCampaignImg('');
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCampaignId || !currentUserId) return;

    const trimmedName = editCampaignName.trim();
    if (!trimmedName) {
      alert('Informe um nome para a campanha.');
      return;
    }

    const { data: updatedCampaign, error } = await supabase
      .from('campaigns')
      .update({
        name: trimmedName,
        image_url: editCampaignImg || null
      })
      .eq('id', editingCampaignId)
      .eq('dm_id', currentUserId)
      .select()
      .single();

    if (error) {
      alert(`Erro ao editar: ${error.message}`);
      return;
    }

    setCampaigns((prev) => prev.map((campaign) => {
      if (campaign.id !== editingCampaignId) return campaign;
      return {
        ...campaign,
        name: updatedCampaign.name,
        img: updatedCampaign.image_url || 'https://via.placeholder.com/400x200/0a120a/00ff66?text=RPG'
      };
    }));

    closeEditModal();
  };

  const handleDeleteCampaign = async (campaignId: string | number) => {
    if (!currentUserId) return;
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('dm_id', currentUserId);

    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
      return;
    }

    setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId));
    setDropdownOpen(null);
  };

  return (
    <>
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      <div className="max-w-[1000px] mx-auto py-12 px-6">
        <h2 className="text-[#f1e5ac] text-2xl font-serif mb-10 tracking-[0.2em] uppercase italic">
          Minhas Campanhas
        </h2>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-[0.2em]">
              Campanhas: {campaigns.length}
            </h3>
            <div className="flex gap-3">
              <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 border border-[#00ff66] text-[#00ff66] px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-[#00ff66] hover:text-black transition-all">
                <Plus size={14} /> Juntar
              </button>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:brightness-110 transition-all">
                <Plus size={14} /> Criar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-[#8a9a8a] text-sm py-10">Carregando campanhas...</div>
          ) : fetchError ? (
            <div className="text-center text-red-400 text-sm py-10">{fetchError}</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center text-[#8a9a8a] text-sm py-10">Nenhuma campanha encontrada.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map(campaign => (
                <Card
                  key={campaign.id}
                  id={campaign.id}
                  title={campaign.name}
                  subtitle={`${campaign.isOwner ? 'Mestre' : 'Jogador'}`}
                  metaRight={{ icon: 'calendar', label: campaign.date }}
                  showMetaDivider={false}
                  image={campaign.img}
                  dropdownOpen={dropdownOpen === String(campaign.id)}
                  onDropdownToggle={() => setDropdownOpen((prev) => prev === String(campaign.id) ? null : String(campaign.id))}
                  dropdownRef={dropdownRef}
                  onCopyCode={() => {
                    navigator.clipboard.writeText(campaign.code);
                    alert('Código copiado!');
                  }}
                  onEdit={() => openEditModal(campaign)}
                  onDelete={campaign.isOwner ? () => handleDeleteCampaign(campaign.id) : undefined}
                  onAccess={() => setDropdownOpen(null)}
                  showEditOption={campaign.isOwner}
                  showCopyOption={campaign.isOwner}
                  accessLabel="Jogar"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRIAR CORRIGIDO */}
      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} title="Criar Campanha" onSubmit={handleCreateCampaign}>
        <TextInput 
          label="Nome da aventura" 
          value={campaignName} 
          onChange={(e) => setCampaignName(e.target.value)} 
          placeholder="Nome da campanha" 
        />
        
        <ImageUpload 
          label="Capa da Campanha" 
          onChange={handleImageChange} 
          currentImage={campaignImg} 
        />

        <ModalButtons primaryText="Fundar Campanha" primaryType="submit" onSecondary={() => setShowModal(false)} />
      </FormModal>

      <FormModal isOpen={showEditModal} onClose={closeEditModal} title="Editar Campanha" onSubmit={handleUpdateCampaign}>
        <TextInput
          label="Nome da aventura"
          value={editCampaignName}
          onChange={(e) => setEditCampaignName(e.target.value)}
          placeholder="Nome da campanha"
        />

        <ImageUpload
          label="Capa da Campanha"
          onChange={handleEditImageChange}
          currentImage={editCampaignImg}
        />

        <ModalButtons primaryText="Salvar" primaryType="submit" onSecondary={closeEditModal} />
      </FormModal>

      <FormModal isOpen={showJoinModal} onClose={() => { setShowJoinModal(false); setStep(1); }} title={step === 1 ? "Entrar" : "Personagem"} onSubmit={handleJoinCampaign}>
        {step === 1 ? (
          <TextInput label="Código" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Código" />
        ) : (
          <select 
            className="w-full bg-[#111] border border-[#222] text-[#f1e5ac] p-3 rounded-lg"
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
          >
            <option value="">Selecione seu Herói</option>
            {userCharacters.map(char => <option key={char.id} value={char.id}>{char.name}</option>)}
          </select>
        )}
        <ModalButtons primaryText={step === 1 ? "Próximo" : "Entrar"} primaryType="submit" onSecondary={() => setShowJoinModal(false)} />
      </FormModal>

      <Footer />
    </>
  );
}