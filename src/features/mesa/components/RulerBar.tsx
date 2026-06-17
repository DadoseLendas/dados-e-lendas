'use client';
import { Ruler, Trash2 } from 'lucide-react';

interface RulerDistance {
  meters: number;
  feet: number;
}

interface RulerData {
  userId: string;
  userName: string;
  showRuler: boolean;
  rulerStart: { x: number; y: number } | null;
  rulerEnd: { x: number; y: number } | null;
  rulerLocked: boolean;
  isRulerDragging: boolean;
  color: string;
}

interface RulerBarProps {
  currentUserId: string | null;
  currentUserName: string;
  rulers: Map<string, RulerData>;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };
  onToggleRuler: (uid: string, uname: string, rulers: Map<string, RulerData>, broadcast: (event: string, payload: Record<string, unknown>) => void) => void;
  onClearRuler: (uid: string, uname: string, broadcast: (event: string, payload: Record<string, unknown>) => void) => void;
  getRulerDistance: (ruler: RulerData, gridSize: number, info: { value: number; unit: string }) => RulerDistance | null;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
}

export default function RulerBar({
  currentUserId, currentUserName, rulers, gridSize, gridDistanceInfo,
  onToggleRuler, onClearRuler, getRulerDistance, broadcast,
}: RulerBarProps) {
  const myRuler = currentUserId ? rulers.get(currentUserId) : undefined;

  return (
    <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-4 py-2.5 backdrop-blur-md shadow-[0_0_32px_rgba(0,0,0,0.7)]">
      <button
        type="button"
        onClick={() => onToggleRuler(currentUserId!, currentUserName, rulers, broadcast)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${myRuler?.showRuler ? 'bg-[#00ff66] text-black shadow-[0_0_12px_rgba(0,255,102,0.35)]' : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-[#00ff66]'}`}
        title="Ativar/desativar sua régua de medição"
      >
        <Ruler size={12} />
        Régua
      </button>

      {(() => {
        const distance = myRuler ? getRulerDistance(myRuler, gridSize, gridDistanceInfo) : null;
        if (distance && myRuler?.showRuler) {
          return (
            <div className="flex items-center gap-2.5 border-l border-white/10 pl-3">
              <span className="text-[13px] font-black text-[#00ff66] tabular-nums tracking-tight">
                {distance.meters.toFixed(1)} m
              </span>
              <span className="text-[9px] text-white/20 font-black">·</span>
              <span className="text-[11px] font-bold text-white/40 tabular-nums">
                {distance.feet.toFixed(1)} pés
              </span>
              <button
                type="button"
                onClick={() => onClearRuler(currentUserId!, currentUserName, broadcast)}
                className="ml-0.5 flex items-center justify-center w-5 h-5 rounded text-white/25 hover:text-red-400 transition-colors"
                title="Limpar medição"
              >
                <Trash2 size={10} />
              </button>
            </div>
          );
        }
        return myRuler?.showRuler ? (
          <span className="text-[10px] text-white/25 font-bold pl-2.5 border-l border-white/10 uppercase tracking-wider whitespace-nowrap">Clique para medir</span>
        ) : null;
      })()}
    </div>
  );
}
