'use client';
import { Trash2 } from 'lucide-react';
import { UserRuler } from '@/features/mesa/types';

interface RulerDistance {
  meters: number;
  feet: number;
}

interface MapRulersProps {
  visibleRulers: { userId: string; ruler: UserRuler }[];
  currentUserId: string | null;
  isDM: boolean;
  rulers: Map<string, UserRuler>;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };
  getRulerDistance: (ruler: UserRuler, gridSize: number, info: { value: number; unit: string }) => RulerDistance | null;
  clearUserRuler: (userId: string, isDM: boolean, broadcast: (event: string, payload: Record<string, unknown>) => void) => void;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
}

const USER_COLORS = ['#00ff66', '#ff4444', '#4488ff', '#ffaa44', '#ff44ff', '#44ffaa', '#ffff44', '#aa44ff'];

export default function MapRegua({
  visibleRulers, currentUserId, isDM, rulers, gridSize, gridDistanceInfo,
  getRulerDistance, clearUserRuler, broadcast,
}: MapRulersProps) {
  return visibleRulers.map(({ userId, ruler }) => {
    if (!ruler.rulerStart || !ruler.rulerEnd) return null;

    const dx = ruler.rulerEnd.x - ruler.rulerStart.x;
    const dy = ruler.rulerEnd.y - ruler.rulerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const distance = getRulerDistance(ruler, gridSize, gridDistanceInfo);
    const midX = (ruler.rulerStart.x + ruler.rulerEnd.x) / 2;
    const midY = (ruler.rulerStart.y + ruler.rulerEnd.y) / 2;
    const isMyRuler = userId === currentUserId;
    const rulerColor = ruler.color || (isMyRuler ? '#00ff66' : USER_COLORS[Array.from(rulers.keys()).indexOf(userId) % USER_COLORS.length]);

    return (
      <div key={userId}>
        <div
          className="absolute left-0 top-0 pointer-events-none"
          style={{ transform: `translate(${ruler.rulerStart.x}px, ${ruler.rulerStart.y}px) rotate(${angle}deg)`, transformOrigin: '0 0' }}
        >
          <div className="h-[2px] rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ width: `${length}px`, backgroundColor: rulerColor, opacity: isMyRuler ? 1 : 0.6 }} />
        </div>
        <div className="absolute pointer-events-none rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold shadow-[0_0_16px_rgba(0,0,0,0.5)] whitespace-nowrap"
          style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)', border: `1px solid ${rulerColor}`, color: rulerColor }}
        >
          {distance ? `${distance.meters.toFixed(1)}m (${distance.feet.toFixed(0)}pés)` : ''}
          {!isMyRuler && isDM && (
            <button onClick={(e) => { e.stopPropagation(); clearUserRuler(userId, isDM, broadcast); }} className="ml-1.5 text-white/40 hover:text-red-400 transition-colors inline-flex" title="Limpar régua">
              <Trash2 size={8} />
            </button>
          )}
        </div>
        {!isMyRuler && isDM && (
          <div className="absolute pointer-events-none text-[8px] font-black uppercase" style={{ left: ruler.rulerStart.x, top: ruler.rulerStart.y - 15, transform: 'translateX(-50%)', color: rulerColor }}>
            {ruler.userName}
          </div>
        )}
      </div>
    );
  });
}
