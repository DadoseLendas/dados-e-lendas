"use client";
import { useState } from 'react';
import { X, Upload, Map as MapIcon } from 'lucide-react';

interface MapUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MAX_BYTES = 7 * 1024 * 1024; // 7 MB
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export default function MapUploadModal({ isOpen, onClose, onFileUpload }: MapUploadModalProps) {
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Restringe de verdade aos formatos anunciados (PNG/JPG/WEBP)
    if (!ACCEPTED.includes(file.type)) {
      setErro('Formato inválido. Use PNG, JPG ou WEBP.');
      e.target.value = '';
      return;
    }
    // Bloqueio real de tamanho (o "Limite: 7 MB" deixa de ser só texto)
    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setErro(`Arquivo de ${mb} MB excede o limite de 7 MB.`);
      e.target.value = '';
      return;
    }

    setErro(null);
    onFileUpload(e);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-[#0d1a0d] border border-[#00ff66]/25 p-8 rounded-[24px] w-full max-w-md relative shadow-[0_0_80px_rgba(0,255,102,0.12),0_0_0_1px_rgba(0,255,102,0.05)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Glow sutil no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#00ff66]/40 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-[#00ff66] hover:bg-[#00ff66]/10 transition-all"
        >
          <X size={16} />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapIcon size={16} className="text-[#00ff66]" />
            <h2 className="text-[#00ff66] text-sm font-black uppercase tracking-[0.25em]">Carregar Mapa</h2>
          </div>
          <p className="text-white/30 text-[11px] pl-6">Substitui o mapa atual da campanha</p>
        </div>

        <label className="flex flex-col items-center justify-center gap-5 p-8 border border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-[#00ff66]/[0.03] hover:border-[#00ff66]/40 group transition-all duration-300 bg-black/30">
          <div className="w-16 h-16 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center group-hover:border-[#00ff66]/60 group-hover:bg-[#00ff66]/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_24px_rgba(0,255,102,0.1)] transition-all duration-300">
            <Upload className="text-white/25 group-hover:text-[#00ff66] transition-all duration-300" size={28} />
          </div>
          <div className="text-center">
            <span className="block text-white/70 group-hover:text-white font-bold text-[12px] uppercase tracking-widest transition-colors mb-1">Arraste ou clique para selecionar</span>
            <span className="block text-white/25 text-[11px]">Limite: 7 MB</span>
          </div>
          <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleChange} />
        </label>

        {/* Mensagem de erro de validação */}
        {erro && (
          <p className="mt-3 text-center text-[11px] font-bold text-red-400">{erro}</p>
        )}

        {/* Tipos de arquivo aceitos */}
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          {['PNG', 'JPG', 'WEBP'].map(fmt => (
            <span key={fmt} className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.07] text-[10px] font-black text-white/40 uppercase tracking-wider">
              {fmt}
            </span>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-white/20">
          Mapas maiores podem demorar para carregar.
        </p>
      </div>
    </div>
  );
}