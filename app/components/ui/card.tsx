"use client";

import { Edit, Trash2, MoreVertical, Map, Users, Calendar } from 'lucide-react';

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
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
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
    <>
      <div className="card-container" onClick={onAccess}>
        <div className="card-hero">
          {/* Imagem de fundo */}
          {image && (
            <div 
              className="card-bg-image"
              style={{ backgroundImage: `url('${image}')` }}
            />
          )}
          {!image && placeholder && (
            <div 
              className="card-bg-image"
              style={{ backgroundImage: `url('${placeholder}')` }}
            />
          )}

          {!image && !placeholder && (
            <div className="hero-icon">
              <Map size={34} strokeWidth={1.6} />
            </div>
          )}
        </div>
        
        <div className="card-content">
          {/* Menu dropdown */}
          {onDropdownToggle && (
            <div className="dropdown-container" ref={dropdownRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDropdownToggle();
                }}
                className="dropdown-button"
              >
                <MoreVertical size={16} />
              </button>
              
              {dropdownOpen && (
                <div className="dropdown-menu">
                  {showEditOption && onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="dropdown-item edit-item"
                    >
                      <Edit size={12} />
                      Editar
                    </button>
                  )}
                  {showCopyOption && onCopyCode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyCode();
                      }}
                      className="dropdown-item copy-item"
                    >
                      Copiar Código
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="dropdown-item delete-item"
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
          <div className="card-info">
            <div className="card-text">
              <h3 className="card-title">{title}</h3>
              <p className="card-subtitle">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card-container {
          position: relative;
          background: #0a120a;
          border: 1px solid #1a2a1a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
          transition: all 0.3s ease;
          cursor: ${onAccess ? 'pointer' : 'default'};
        }

        .card-container:hover {
          border-color: #00ff66;
        }

        .card-hero {
          position: relative;
          height: 128px;
          background: linear-gradient(180deg, #0c1b11 0%, #0a120a 100%);
          border-bottom: 1px solid #1a2a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .card-bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.22;
          transition: opacity 0.3s ease;
        }

        .card-container:hover .card-bg-image {
          opacity: 0.3;
        }

        .hero-icon {
          color: #00ff66;
          opacity: 0.45;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .card-container:hover .hero-icon {
          opacity: 0.75;
        }

        .card-content {
          position: relative;
          padding: 16px;
        }

        .dropdown-container {
          position: absolute;
          top: -120px;
          right: 10px;
          z-index: 3;
        }

        .dropdown-button {
          color: #00ff66;
          opacity: 0.8;
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dropdown-button:hover {
          opacity: 1;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          width: 192px;
          background: #0a120a;
          border: 1px solid #1a2a1a;
          border-radius: 8px;
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
          z-index: 10;
        }

        .dropdown-item {
          width: 100%;
          text-align: left;
          padding: 8px 16px;
          font-size: 12px;
          background: none;
          border: none;
          color: #4a5a4a;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dropdown-item:hover {
          background: #1a2a1a;
        }

        .edit-item:hover,
        .copy-item:hover {
          color: #00ff66;
        }

        .delete-item {
          color: #ff4444;
        }

        .delete-item:hover {
          color: #ff6666;
        }

        .card-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .card-text h3 {
          margin: 0;
        }

        .card-text p {
          margin: 0;
        }

        .card-title {
          color: #f1e5ac;
          font-weight: 900;
          font-size: 22px;
          margin-bottom: 10px;
          text-transform: uppercase;
          line-height: 1.15;
        }

        .card-subtitle {
          color: #8a9a8a;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          border-top: 1px solid #1a2a1a;
          padding-top: 10px;
          letter-spacing: 0.03em;
        }
      `}</style>
    </>
  );
}

export function CampaignCard({ titulo, jogadores, dataCriacao }: { titulo: string; jogadores: number; dataCriacao: string; }) {
  return (
    <div className="bg-[#0a120a] border border-[#1a2a1a] rounded-xl overflow-hidden hover:border-[#00ff66] hover:shadow-[0_0_20px_rgba(0,255,102,0.1)] transition-all cursor-pointer group">
      <div className="h-28 bg-[#1a231a] flex items-center justify-center text-[#00ff66]/30 group-hover:text-[#00ff66] transition-all">
        <Map size={40} strokeWidth={1.5} />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-sm mb-4 text-[#f1e5ac] uppercase truncate">{titulo}</h3>
        <div className="flex justify-between items-center text-[10px] text-[#8a9a8a] border-t border-[#1a2a1a] pt-3 font-bold">
          <span className="flex items-center gap-1.5"><Users size={12} className="text-[#00ff66]" /> {jogadores} JOGADORES</span>
          <span className="flex items-center gap-1.5"><Calendar size={12} className="text-[#00ff66]" /> {dataCriacao}</span>
        </div>
      </div>
    </div>
  );
}
