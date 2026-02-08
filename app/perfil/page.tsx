"use client";
import { useState, useRef } from 'react';
import Navbar from '@/app/components/ui/navbar';
import Footer from '@/app/components/ui/footer';
import { User, Camera } from 'lucide-react';

export default function PerfilView() {
  const [abaAtiva, setAbaAtiva] = useState('perfil');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Navbar abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} isLoggedIn />
      <div className="max-w-[600px] mx-auto animate-in fade-in zoom-in duration-300 py-12 px-6">
      <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <h2 className="text-[#f1e5ac] text-2xl font-serif text-center mb-10 tracking-[0.2em] uppercase italic">Meu Perfil</h2>

        {/* Avatar e Upload */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-32 h-32 rounded-full border-2 border-[#00ff66] flex items-center justify-center text-[#00ff66] text-3xl font-bold bg-[#00ff66]/5 mb-6 shadow-[0_0_20px_rgba(0,255,102,0.1)]">
            AV
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
          />
          <button 
            onClick={handleUploadClick}
            className="flex items-center gap-2 border border-[#00ff66] text-[#00ff66] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#00ff66] hover:text-black transition-all"
          >
            <Camera size={14} />
            Upload de Foto
          </button>
        </div>

        {/*formulário*/}
        <div className="space-y-6">
          <div>
            <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
              Nome de Exibição
            </label>
            <div className="relative">
              {/*vetor do usuario*/}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
                <User size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Aventureiro"
                className="w-full bg-black border border-[#1a2a1a] rounded-lg py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          <button className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)]">
            Salvar Alterações
          </button>
        </div>
      </div>
      </div>
      <Footer />
    </>
  );
}