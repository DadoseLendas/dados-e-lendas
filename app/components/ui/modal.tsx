import { ReactNode, FormEvent } from 'react';
import { ChangeEvent } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

interface FormModalProps extends ModalProps {
  onSubmit: (e: FormEvent) => void;
}

interface ImageUploadProps {
  label: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  currentImage?: string;
  helperText?: string;
}

// Modal Base
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <h2 className="text-[#f1e5ac] text-xl font-serif text-center mb-8 tracking-[0.2em] uppercase italic">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Modal com Form
export function FormModal({ isOpen, onClose, title, onSubmit, children }: FormModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <h2 className="text-[#f1e5ac] text-xl font-serif text-center mb-8 tracking-[0.2em] uppercase italic">{title}</h2>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
        </form>
      </div>
    </div>
  );
}

// Input de Texto
export function TextInput({ label, value, onChange, placeholder, ...props }: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  [key: string]: any;
}) {
  return (
    <div>
      <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
        {label}
      </label>
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-4 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
        {...props}
      />
    </div>
  );
}

// Upload de Imagem
export function ImageUpload({ label, onChange, currentImage, helperText }: ImageUploadProps) {
  return (
    <div>
      <label className="block text-[#4a5a4a] text-[10px] font-black uppercase tracking-[0.2em] mb-3">
        {label}
      </label>
      <input 
        type="file" 
        accept="image/*"
        onChange={onChange}
        className="w-full bg-black border border-[#1a2a1a] rounded-lg py-3 px-4 text-white text-sm focus:outline-none focus:border-[#00ff66] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-black file:bg-[#00ff66] file:text-black"
      />
      {currentImage && (
        <div className="mt-4 text-center">
          <img src={currentImage} alt="Preview" className="max-w-52 max-h-24 object-cover rounded border border-[#1a2a1a] mx-auto" />
        </div>
      )}
      {helperText && (
        <span className="text-[#4a5a4a] text-[10px] italic mt-2 block">
          {helperText}
        </span>
      )}
    </div>
  );
}

// Botões do Modal
export function ModalButtons({ 
  primaryText, 
  onPrimary, 
  primaryType = "button",
  secondaryText = "Cancelar", 
  onSecondary,
  primaryDisabled = false 
}: {
  primaryText: string;
  onPrimary?: () => void;
  primaryType?: "button" | "submit";
  secondaryText?: string;
  onSecondary: () => void;
  primaryDisabled?: boolean;
}) {
  return (
    <div className="space-y-3 pt-4">
      <button 
        type={primaryType}
        onClick={onPrimary}
        disabled={primaryDisabled}
        className="w-full bg-[#00ff66] text-black font-black py-4 rounded-lg text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] disabled:opacity-50"
      >
        {primaryText}
      </button>
      <button 
        type="button"
        onClick={onSecondary}
        className="w-full border border-[#4a5a4a] text-[#4a5a4a] py-4 rounded-lg text-sm uppercase tracking-widest hover:border-white hover:text-white transition-colors"
      >
        {secondaryText}
      </button>
    </div>
  );
}
 // Funções de modal
  const toggleModal = (show) => {
    setShowModal(show);
    if (!show) {
      setCampaignName('');
      setCampaignImg('');
      setCampaignImgFile(null);
    }
  };

  const toggleEditModal = (show) => {
    setShowEditModal(show);
    if (!show) {
      setCampaignName('');
      setCampaignImg('');
      setCampaignImgFile(null);
      setEditingCampaign(null);
    }
  };

  const toggleJoinModal = (show) => {
    setShowJoinModal(show);
    if (!show) setJoinCode('');
  };