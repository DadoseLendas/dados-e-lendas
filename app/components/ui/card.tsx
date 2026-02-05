"use client";

import { ReactNode } from 'react';
import { Edit, Trash2, Eye, MoreVertical, Map, Users, Calendar } from 'lucide-react';

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
    <>
      <div className="card-container">
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
        
        <div className="card-content">
          {/* Menu dropdown */}
          {onDropdownToggle && (
            <div className="dropdown-container" ref={dropdownRef}>
              <button 
                onClick={onDropdownToggle}
                className="dropdown-button"
              >
                <div className="dropdown-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </button>
              
              {dropdownOpen && (
                <div className="dropdown-menu">
                  {showEditOption && onEdit && (
                    <button
                      onClick={onEdit}
                      className="dropdown-item edit-item"
                    >
                      <Edit size={12} />
                      Editar
                    </button>
                  )}
                  {showCopyOption && onCopyCode && (
                    <button
                      onClick={onCopyCode}
                      className="dropdown-item copy-item"
                    >
                      Copiar Código
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={onDelete}
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

            {onAccess && (
              <button 
                onClick={onAccess}
                className="access-button"
              >
                <Eye size={14} />
                {accessLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .card-container {
          position: relative;
          background: black;
          border: 1px solid #1a2a1a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
          transition: all 0.3s ease;
        }

        .card-container:hover {
          border-color: #00ff66;
        }

        .card-bg-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.2;
          transition: opacity 0.3s ease;
        }

        .card-container:hover .card-bg-image {
          opacity: 0.3;
        }

        .card-content {
          position: relative;
          padding: 24px;
        }

        .dropdown-container {
          position: absolute;
          top: 16px;
          right: 16px;
        }

        .dropdown-button {
          color: #4a5a4a;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .dropdown-button:hover {
          color: #00ff66;
        }

        .dropdown-dots {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dot {
          width: 4px;
          height: 4px;
          background-color: currentColor;
          border-radius: 50%;
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
          gap: 16px;
        }

        .card-text h3 {
          margin: 0;
        }

        .card-text p {
          margin: 0;
        }

        .card-title {
          color: white;
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .card-subtitle {
          color: #4a5a4a;
          font-size: 12px;
        }

        .access-button {
          width: 100%;
          background: #00ff66;
          color: black;
          font-weight: 900;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 20px rgba(0, 255, 102, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .access-button:hover {
          filter: brightness(1.1);
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
