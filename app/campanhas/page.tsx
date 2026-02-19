'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import type { ChangeEvent } from 'react';
import Card from '@/app/components/ui/card';
import { FormModal, TextInput, ImageUpload, ModalButtons } from '@/app/components/ui/modal';
import { ArrowLeft, Users, Plus, ShieldAlert } from 'lucide-react'; 
import Link from 'next/link'; 

// TELA DE ACESSO NEGADO
function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-[#050a05] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-[#0a120a] border border-red-900/30 p-12 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.1)] max-w-lg w-full">
        <div className="mx-auto w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-500/50">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-serif text-white mb-4 italic tracking-wide">ACESSO NEGADO</h1>
        <p className="text-[#8a9a8a] mb-8 leading-relaxed">
          Para gerenciar campanhas, você precisa se identificar na guilda.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/login" className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg uppercase tracking-widest hover:bg-[#00cc52] transition-colors">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// TELA DE CARREGAMENTO
function LoadingState() {
  return (
    <div className="min-h-screen bg-[#050a05] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#1a2a1a] border-t-[#00ff66] rounded-full animate-spin"></div>
        <p className="text-[#00ff66] text-xs uppercase tracking-[0.3em] font-bold animate-pulse">Carregando Campanhas...</p>
      </div>
    </div>
  );
}

//Define campanha
type Campaign = {
  id: number | string;
  name: string;
  date: string;
  code: string;
  img: string;
  isOwner: boolean;
}

export default function CampanhasPage() {
  const router = useRouter();
  const supabase = createClient();

  // Estados de Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [abaAtiva, setAbaAtiva] = useState('campanhas');
  // Estados da aplicação
  const [campaigns, setCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
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
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />
      
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
      <Footer />
    </>
  );
}

