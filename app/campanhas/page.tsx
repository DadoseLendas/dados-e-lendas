'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import type { ChangeEvent } from 'react';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal';
import { Users, Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default function CampanhasPage() {
  const [abaAtiva, setAbaAtiva] = useState('campanhas');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Criação
  const [campaignName, setCampaignName] = useState('');
  
  // Lógica de entrada (Join)
  const [joinCode, setJoinCode] = useState('');
  const [step, setStep] = useState(1); // 1: Código, 2: Seleção de Personagem
  const [tempCampaign, setTempCampaign] = useState(null);
  const [userCharacters, setUserCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  // 1. CARREGAR CAMPANHAS (Mestre ou Membro)
  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Busca campanhas onde o usuário é DM ou Membro
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_members!inner(user_id)
      `)
      .or(`dm_id.eq.${user.id},campaign_members.user_id.eq.${user.id}`);

    if (!error) {
      const formatted = data.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        date: new Date(c.created_at).toLocaleDateString('pt-BR'),
        isOwner: c.dm_id === user.id,
        img: 'https://via.placeholder.com/400x200/1a2a1a/00ff66?text=RPG+Campaign'
      }));
      setCampaigns(formatted);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  // 2. CRIAR CAMPANHA (dm_id e code)
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();

    const { error } = await supabase
      .from('campaigns')
      .insert({
        name: campaignName.trim(),
        code: inviteCode,
        dm_id: user.id
      });

    if (error) return alert('Erro ao criar campanha.');
    
    setShowModal(false);
    setCampaignName('');
    fetchCampaigns();
  };

  // 3. JUNTAR-SE À CAMPANHA (campaign_members e logs)
  const handleJoinCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (step === 1) {
      // Validar código
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (error || !campaign) return alert('Código inválido.');

      // Buscar personagens do jogador
      const { data: chars } = await supabase
        .from('characters')
        .select('id, name')
        .eq('owner_id', user.id);

      if (!chars || chars.length === 0) return alert('Você precisa criar um personagem primeiro!');

      setTempCampaign(campaign);
      setUserCharacters(chars);
      setStep(2);
    } else {
      // Vincular personagem na campaign_members
      const { error: joinError } = await supabase
        .from('campaign_members')
        .insert({
          campaign_id: tempCampaign.id,
          user_id: user.id,
          current_character_id: parseInt(selectedCharacterId)
        });

      if (joinError) {
        alert(joinError.code === '23505' ? 'Você já está nessa campanha!' : 'Erro ao entrar.');
      } else {
        // Opcional: Criar log de entrada
        await supabase.from('campaign_logs').insert({
          campaign_id: tempCampaign.id,
          player_id: user.id,
          character_id: parseInt(selectedCharacterId),
          type: 'join',
          message: `Entrou na campanha.`
        });

        alert('Sucesso! Bem-vindo à aventura.');
        setShowJoinModal(false);
        setStep(1);
        setJoinCode('');
        fetchCampaigns();
      }
    }
  };

  return (
    <>
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} isLoggedIn />
      <div className="max-w-[800px] mx-auto py-12 px-6">
        <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10 shadow-2xl">
          <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-widest uppercase italic">
            Minhas Campanhas
          </h2>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-widest">
                Total: {campaigns.length}
              </h3>
              <div className="flex gap-3">
                <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 border border-[#00ff66] text-[#00ff66] px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-[#00ff66] hover:text-black transition-all">
                  <Plus size={14} /> Entrar
                </button>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:brightness-110 transition-all">
                  <Plus size={14} /> Criar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map(campaign => (
                <Card
                  key={campaign.id}
                  id={campaign.id}
                  title={campaign.name}
                  subtitle={`${campaign.isOwner ? 'Mestre' : 'Jogador'} | Código: ${campaign.code}`}
                  image={campaign.img}
                  onCopyCode={() => {
                    navigator.clipboard.writeText(campaign.code);
                    alert('Código copiado!');
                  }}
                  showCopyOption={campaign.isOwner}
                  accessLabel="Jogar"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Criar */}
      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Campanha" onSubmit={handleCreateCampaign}>
        <TextInput label="Nome da Aventura" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: O Retorno de Tiamat" />
        <ModalButtons primaryText="Fundar Campanha" primaryType="submit" onSecondary={() => setShowModal(false)} />
      </FormModal>

      {/* Modal Juntar-se (Passo a Passo) */}
      <FormModal 
        isOpen={showJoinModal} 
        onClose={() => { setShowJoinModal(false); setStep(1); }} 
        title={step === 1 ? "Entrar em Campanha" : "Escolha seu Personagem"} 
        onSubmit={handleJoinCampaign}
      >
        {step === 1 ? (
          <TextInput label="Código do Convite" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Cole o código aqui" />
        ) : (
          <div className="space-y-4">
            <p className="text-[#00ff66] text-xs uppercase font-bold">Campanha: {tempCampaign?.name}</p>
            <select 
              required
              className="w-full bg-[#111] border border-[#222] text-[#f1e5ac] p-3 rounded-lg outline-none focus:border-[#00ff66]"
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
            >
              <option value="">Selecione seu Herói...</option>
              {userCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>
          </div>
        )}
        <ModalButtons primaryText={step === 1 ? "Verificar Código" : "Confirmar Entrada"} primaryType="submit" onSecondary={() => setShowJoinModal(false)} />
      </FormModal>

      <Footer />
    </>
  );
}
