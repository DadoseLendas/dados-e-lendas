import { ReactNode } from 'react';
import { Edit, Trash2, Eye, MoreVertical } from 'lucide-react';

interface CardProps {
  id: string | number;
  title: string;
  subtitle: string;
  image?: string;
  placeholder?: string;
  dropdownOpen?: boolean;
  onDropdownToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAccess?: () => void;
  onCopyCode?: () => void;
  showEditOption?: boolean;
  showCopyOption?: boolean;
  deleteLabel?: string;
  accessLabel?: string;
  dropdownRef?: React.RefObject<HTMLDivElement>;
}

export default function Card({ 
  title, 
  subtitle, 
  image, 
  placeholder,
  dropdownOpen, 
  onDropdownToggle, 
  onEdit, 
  onDelete, 
  onAccess,
  onCopyCode,
  showEditOption = false,
  showCopyOption = false,
  deleteLabel = 'Excluir',
  accessLabel = 'Acessar',
  dropdownRef
}: CardProps) {
  return (
    <div className="group relative bg-black border border-[#1a2a1a] rounded-xl overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] hover:border-[#00ff66] transition-all">
      {/* Imagem de fundo */}
      {image && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
          style={{ backgroundImage: `url('${image}')` }}
        />
      )}
      {!image && placeholder && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
          style={{ backgroundImage: `url('${placeholder}')` }}
        />
      )}
      
      <div className="relative p-6">
        {/* Menu dropdown */}
        {onDropdownToggle && (
          <div className="absolute top-4 right-4" ref={dropdownRef}>
            <button 
              onClick={onDropdownToggle}
              className="text-[#4a5a4a] hover:text-[#00ff66] p-2 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
              </div>
            </button>
            
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a120a] border border-[#1a2a1a] rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] z-10">
                {showEditOption && onEdit && (
                  <button
                    onClick={onEdit}
                    className="w-full text-left px-4 py-2 text-xs text-[#4a5a4a] hover:text-[#00ff66] hover:bg-[#1a2a1a] transition-colors flex items-center gap-2"
                  >
                    <Edit size={12} />
                    Editar
                  </button>
                )}
                {showCopyOption && onCopyCode && (
                  <button
                    onClick={onCopyCode}
                    className="w-full text-left px-4 py-2 text-xs text-[#4a5a4a] hover:text-[#00ff66] hover:bg-[#1a2a1a] transition-colors"
                  >
                    Copiar Código
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-[#1a2a1a] transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={12} />
                    {deleteLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo do card */}
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
            <p className="text-[#4a5a4a] text-xs">{subtitle}</p>
          </div>

          {onAccess && (
            <button 
              onClick={onAccess}
              className="w-full bg-[#00ff66] text-black font-black py-3 rounded-lg text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center justify-center gap-2"
            >
              <Eye size={14} />
              {accessLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}