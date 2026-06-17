'use client';
import { ChevronLeft, ChevronRight, UserRound, Users, Home, BookOpen, Map as MapIcon, ShieldCheck } from 'lucide-react';
import { FiBook } from 'react-icons/fi';
import { GiSpellBook } from 'react-icons/gi';

interface SidebarProps {
  sidebarAberta: boolean;
  isDM: boolean;
  fichaCharacterId: number | string | null;
  showSpellModal: boolean;
  showPlayerList: boolean;
  showBooks: boolean;
  onHome: () => void;
  onOpenCharacterSheet: () => void;
  onOpenSpellBook: () => void;
  onTogglePlayerList: () => void;
  onToggleBooks: () => void;
  onOpenMapUpload: () => void;
  onOpenTokenLibrary: () => void;
  onToggleSidebar: () => void;
}

export default function Sidebar({
  sidebarAberta, isDM, fichaCharacterId, showSpellModal,
  showPlayerList, showBooks,
  onHome, onOpenCharacterSheet, onOpenSpellBook,
  onTogglePlayerList, onToggleBooks, onOpenMapUpload, onOpenTokenLibrary,
  onToggleSidebar,
}: SidebarProps) {
  return (
    <>
      <aside
        className={`absolute left-4 top-1/2 -translate-y-1/2 bg-[#0a120a]/80 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-500 flex flex-col items-center py-6 gap-6 z-40 shadow-[0_0_30px_rgba(0,0,0,0.5)]
        ${sidebarAberta ? 'w-14 opacity-100' : 'w-0 opacity-0 -translate-x-10 pointer-events-none'}`}
      >
        <button
          onClick={onHome}
          className="p-2 text-white/30 hover:text-[#00ff66] hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300"
          title="Início"
        >
          <Home size={22} />
        </button>

        {!isDM && (
          <button
            onClick={onOpenCharacterSheet}
            className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${fichaCharacterId ? 'text-white/30 hover:text-[#00ff66]' : 'text-white/10 cursor-not-allowed'}`}
            title="Ficha"
          >
            <UserRound size={22} />
          </button>
        )}

        {!isDM && (
          <button
            onClick={onOpenSpellBook}
            className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${fichaCharacterId ? 'text-white/30 hover:text-[#00ff66]' : 'text-white/10 cursor-not-allowed'}`}
            title="Magias"
          >
            {showSpellModal ? <GiSpellBook size={28} /> : <FiBook size={22} />}
          </button>
        )}

        {isDM && (
          <>
            <button
              onClick={onTogglePlayerList}
              className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${showPlayerList ? 'text-[#00ff66] drop-shadow-[0_0_8px_#00ff66]' : 'text-white/30 hover:text-[#00ff66]'}`}
              title="Fichas dos Jogadores"
            >
              <Users size={22} />
            </button>

            <button
              onClick={onToggleBooks}
              className={`p-2 hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300 ${showBooks ? 'text-[#00ff66] drop-shadow-[0_0_8px_#00ff66]' : 'text-white/30 hover:text-[#00ff66]'}`}
              title="Biblioteca"
            >
              <BookOpen size={22} />
            </button>

            <button
              onClick={onOpenMapUpload}
              className="p-2 text-white/30 hover:text-[#00ff66] hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300"
              title="Alterar Mapa"
            >
              <MapIcon size={22} />
            </button>

            <button
              onClick={onOpenTokenLibrary}
              className="p-2 text-white/30 hover:text-[#00ff66] hover:drop-shadow-[0_0_8px_#00ff66] transition-all duration-300"
              title="Biblioteca de Tokens"
            >
              <ShieldCheck size={22} />
            </button>
          </>
        )}
      </aside>

      <button
        onClick={onToggleSidebar}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-50 text-white/10 hover:text-[#00ff66] p-1 transition-colors"
      >
        {sidebarAberta ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </>
  );
}


