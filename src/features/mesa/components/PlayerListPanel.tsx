'use client';

interface PlayerCharacter {
  id: number;
  name: string;
  img: string | null;
  imgOffsetX: number;
  imgOffsetY: number;
}

interface PlayerListPanelProps {
  characters: PlayerCharacter[];
  onSelectCharacter: (id: number) => void;
  floating?: boolean;
}

export default function PlayerListPanel({ characters, onSelectCharacter, floating = false }: PlayerListPanelProps) {
  const cardClasses = "bg-[#0a120a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 min-w-[180px] shadow-[0_0_30px_rgba(0,0,0,0.6)]";

  const renderTitle = () => !floating && (
    <span data-drag-handle className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5a4a] mb-1 block cursor-grab active:cursor-grabbing">Fichas dos Jogadores</span>
  );

  if (characters.length === 0) {
    const content = (
      <div className={cardClasses}>
        {renderTitle()}
        <span className="text-[10px] text-white/30">Nenhum jogador com personagem.</span>
      </div>
    );
    if (floating) return content;
    return <div className="absolute left-20 top-1/2 -translate-y-1/2 z-50">{content}</div>;
  }

  const content = (
    <div className={`${cardClasses} flex flex-col gap-2`}>
      {renderTitle()}
      {characters.map(pc => (
        <button
          key={pc.id}
          onClick={() => onSelectCharacter(pc.id)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#00ff66]/10 hover:text-[#00ff66] transition-all text-left text-[11px] text-white/70 font-medium"
        >
          <div
            className="w-7 h-7 rounded-full bg-neutral-800 shrink-0 border border-white/10"
            style={pc.img ? { backgroundImage: `url(${pc.img})`, backgroundSize: 'cover', backgroundPosition: `${pc.imgOffsetX}% ${pc.imgOffsetY}%` } : {}}
          />
          <span className="truncate">{pc.name}</span>
        </button>
      ))}
    </div>
  );

  if (floating) return content;
  return <div className="absolute left-20 top-1/2 -translate-y-1/2 z-50">{content}</div>;
}
