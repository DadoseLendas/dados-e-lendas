"use client";
import { X, Upload } from 'lucide-react';

interface MapUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function MapUploadModal({ isOpen, onClose, onFileUpload }: MapUploadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-6">
      <div className="bg-[#0a0a0a] border border-[#00ff66]/20 p-10 rounded-[24px] w-full max-w-md relative shadow-[0_0_50px_rgba(0,255,102,0.1)]">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-[#00ff66] transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-white text-2xl font-bold mb-10 uppercase tracking-[0.2em] text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          Carregar Mapa
        </h2>
        <div className="flex flex-col gap-8">
          <label className="flex flex-col items-center justify-center gap-6 p-12 border-2 border-dashed border-white/5 rounded-3xl cursor-pointer hover:bg-[#00ff66]/[0.02] hover:border-[#00ff66]/30 group transition-all duration-500">
            <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:border-[#00ff66] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(0,255,102,0.15)] transition-all">
              <Upload className="text-white/20 group-hover:text-[#00ff66] transition-all" size={32} />
            </div>
            <span className="text-white font-bold text-[11px] uppercase tracking-widest opacity-80">Arraste ou clique</span>
            <input type="file" className="hidden" accept="image/*" onChange={onFileUpload} />
          </label>
        </div>
      </div>
    </div>
  );
}
