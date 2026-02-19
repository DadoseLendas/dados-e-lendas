'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import type { ChangeEvent } from 'react';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal';
import { Users, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function CampanhasPage() {
  const [abaAtiva, setAbaAtiva] = useState('campanhas');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Criação
  const [campaignName, setCampaignName] = useState('');
  
  // Lógica de entrada (Join)
  const [joinCode, setJoinCode] = useState('');
  const [step, setStep] = useState(1); // 1: Inserir Código, 2: Selecionar Personagem
  const [tempCampaign, setTempCampaign] = useState<any>(null);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // Correção do erro: Property 'contains' does not exist

  // 1. FECHAR DROPDOWN AO CLICAR FORA
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. BUSCAR CAMPANHAS DO BANCO
  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Busca campanhas onde o usuário é DM ou Membro
    // Ajustado para os nomes das suas tabelas: campaigns e campaign_members
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_members!inner(user_id)
      `)
      .or(`dm_id.eq.${user.id},campaign_members.user_id.eq.${user.id}`);

    if (!error && data) {
      const formatted = data.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        date: new Date(c.created_at).toLocaleDateString('pt-BR'),
        isOwner: c.dm_id === user.id,
        img: 'https://via.placeholder.com/400x200/0a120a/00ff66?text=RPG+Campanha'
      }));
      setCampaigns(formatted);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  // 3. CRIAR NOVA CAMPANHA
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !campaignName.trim()) return;
    
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

  // 4. LOGICA DE JUNÇÃO (CÓDIGO -> PERSONAGEM -> BANCO)
  const handleJoinCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (step === 1) {
      // Validar código na tabela campaigns
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (error || !campaign) return alert('Código inválido ou campanha não encontrada.');

      // Buscar personagens criados pelo usuário logado
      const { data: chars } = await supabase
        .from('characters')
        .select('id, name')
        .eq('owner_id', user.id);

      if (!chars || chars.length === 0) {
        return alert('Você não tem personagens criados. Crie um antes de entrar!');
      }

      setTempCampaign(campaign);
      setUserCharacters(chars);
      setStep(2);
    } else {
      // Linkar o personagem selecionado à campanha na tabela campaign_members
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
        // Registrar log de entrada na tabela campaign_logs
        await supabase.from('campaign_logs').insert({
          campaign_id: tempCampaign.id,
          player_id: user.id,
          character_id: parseInt(selectedCharacterId),
          type: 'join',
          message: `Entrou na campanha com o código ${tempCampaign.code}`
        });

        alert('Sucesso! Seu personagem foi vinculado à campanha.');
        setShowJoinModal(false);
        setStep(1);
        setJoinCode('');
        fetchCampaigns();
      }
    }
  };

  return (
    <>
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      <div className="max-w-[800px] mx-auto py-12 px-6">
        <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10 shadow-2xl">
          <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-[0.2em] uppercase italic">
            Minhas Campanhas
          </h2>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-[#4a5a4a] text-xs font-black uppercase tracking-[0.2em]">
                Campanhas: {campaigns.length}/6
              </h3>
              <div className="flex gap-3">
                <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 border border-[#00ff66] text-[#00ff66] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#00ff66] hover:text-black transition-all">
                  <Plus size={14} /> Juntar à Campanha
                </button>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#00ff66] text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                  <Plus size={14} /> Criar Campanha
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                 <p className="text-[#4a5a4a] text-center col-span-full">Carregando aventuras...</p>
              ) : campaigns.length === 0 ? (
                <div className="col-span-full text-center py-12 text-[#4a5a4a]">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma campanha encontrada</p>
                </div>
              ) : (
                campaigns.map(campaign => (
                  <Card
                    key={campaign.id}
                    id={campaign.id}
                    title={campaign.name}
                    subtitle={`${campaign.isOwner ? 'Mestre' : 'Jogador'} | Criada em: ${campaign.date}`}
                    image={campaign.img}
                    dropdownOpen={dropdownOpen === `campaign-${campaign.id}`}
                    onDropdownToggle={() => setDropdownOpen(dropdownOpen === `campaign-${campaign.id}` ? null : `campaign-${campaign.id}`)}
                    onCopyCode={() => {
                      navigator.clipboard.writeText(campaign.code);
                      alert('Código copiado: ' + campaign.code);
                    }}
                    showCopyOption={campaign.isOwner}
                    accessLabel="Entrar na Mesa"
                    dropdownRef={dropdownOpen === `campaign-${campaign.id}` ? dropdownRef : undefined}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Criar Campanha */}
      <FormModal isOpen={showModal} onClose={() => setShowModal(false)} title="Criar Campanha" onSubmit={handleCreateCampaign}>
        <TextInput label="Nome da campanha" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Crônicas de Ferro" />
        <ModalButtons primaryText="Criar" primaryType="submit" onSecondary={() => setShowModal(false)} />
      </FormModal>

      {/* Modal Juntar-se (Lógica de 2 Passos) */}
      <FormModal 
        isOpen={showJoinModal} 
        onClose={() => { setShowJoinModal(false); setStep(1); }} 
        title={step === 1 ? "Juntar-se à Campanha" : "Vincular Seu Personagem"} 
        onSubmit={handleJoinCampaign}
      >
        {step === 1 ? (
          <TextInput label="Código da campanha" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Digite o código único" />
        ) : (
          <div className="space-y-4">
            <p className="text-[#f1e5ac] text-sm italic">Campanha: <span className="text-[#00ff66] not-italic font-bold">{tempCampaign?.name}</span></p>
            <label className="block text-[#4a5a4a] text-[10px] font-black uppercase mb-1">Escolha seu herói</label>
            <select 
              required
              className="w-full bg-[#111] border border-[#1a2a1a] text-[#f1e5ac] p-3 rounded-lg outline-none focus:border-[#00ff66] appearance-none"
              value={selectedCharacterId}
              onChange={(e) => setSelectedCharacterId(e.target.value)}
            >
              <option value="">-- Selecione um personagem --</option>
              {userCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>
          </div>
        )}
        <ModalButtons 
          primaryText={step === 1 ? "Próximo" : "Confirmar Entrada"} 
          primaryType="submit" 
          onSecondary={() => { setShowJoinModal(false); setStep(1); }} 
        />
      </FormModal>

      <Footer />
    </>
  );
}