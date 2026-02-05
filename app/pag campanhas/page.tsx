'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal';
import { ArrowLeft, Users, Plus } from 'lucide-react';

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
    <>
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
      </>
      );
}

