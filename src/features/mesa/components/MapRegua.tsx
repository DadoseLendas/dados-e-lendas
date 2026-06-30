'use client';
import { Trash2 } from 'lucide-react';
import { UserRuler } from '@/features/mesa/types';

export type RulerShape = 'line' | 'circle' | 'cone' | 'square';

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

function ShapeOverlay({
  ruler, color, gridSize, gridDistanceInfo, shape, isLocked,
}: {
  ruler: UserRuler;
  color: string;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };
  shape: RulerShape;
  isLocked: boolean;
}) {
  if (!ruler.rulerStart || !ruler.rulerEnd) return null;

  const sx = ruler.rulerStart.x;
  const sy = ruler.rulerStart.y;
  const ex = ruler.rulerEnd.x;
  const ey = ruler.rulerEnd.y;
  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const squares = dist / gridSize;
  const baseDistance = squares * gridDistanceInfo.value;
  const meters = gridDistanceInfo.unit === 'm' ? baseDistance : baseDistance * 0.3048;
  const feet = gridDistanceInfo.unit === 'm' ? baseDistance * 3.28084 : baseDistance;
  const label = `${meters.toFixed(1)}m (${feet.toFixed(0)}pés)`;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;

  const fill = color + '22';
  const stroke = color;

  // pointer-events:auto somente na área da régua, permitindo que o handler global
  // (useMesaInteraction) capture o mousedown e mova a régua travada inteira.
  const grabCursor = isLocked ? 'grab' : 'default';

  if (shape === 'line') {
    const angleDeg = angle * (180 / Math.PI);
    return (
      <>
        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${sx}px, ${sy}px) rotate(${angleDeg}deg)`,
            transformOrigin: '0 0',
            pointerEvents: isLocked ? 'auto' : 'none',
            cursor: grabCursor,
          }}
        >
          <div
            className="h-[10px] -translate-y-1/2"
            style={{ width: `${dist}px` }}
          >
            <div
              className="h-[2px] rounded-full mt-1"
              style={{ width: `${dist}px`, backgroundColor: stroke, boxShadow: `0 0 6px ${stroke}60` }}
            />
          </div>
        </div>
        <div
          className="absolute rounded-lg px-2 py-1 text-[10px] font-black whitespace-nowrap"
          style={{
            left: midX, top: midY, transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(10,18,10,0.88)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${stroke}55`,
            color: stroke,
            cursor: grabCursor,
            boxShadow: `0 0 12px ${stroke}30`,
            pointerEvents: isLocked ? 'auto' : 'none',
          }}
        >
          {label}
        </div>
      </>
    );
  }

  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: 35,
  };

  if (shape === 'circle') {
    const r = dist;
    return (
      <svg style={svgStyle}>
        <circle cx={sx} cy={sy} r={r} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray="6 3"
          style={{ pointerEvents: isLocked ? 'auto' : 'none', cursor: grabCursor }} />
        <circle cx={sx} cy={sy} r={4} fill={stroke} />
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={midX} y={midY - 8} fill={stroke} fontSize={11} fontWeight="bold" textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px black)' }}>{label}</text>
      </svg>
    );
  }

  if (shape === 'cone') {
    const halfAngle = Math.atan(0.5);
    const a1 = angle - halfAngle;
    const a2 = angle + halfAngle;
    const x1 = sx + dist * Math.cos(a1);
    const y1 = sy + dist * Math.sin(a1);
    const x2 = sx + dist * Math.cos(a2);
    const y2 = sy + dist * Math.sin(a2);
    const d = `M ${sx} ${sy} L ${x1} ${y1} A ${dist} ${dist} 0 0 1 ${x2} ${y2} Z`;
    return (
      <svg style={svgStyle}>
        <path d={d} fill={fill} stroke={stroke} strokeWidth={2}
          style={{ pointerEvents: isLocked ? 'auto' : 'none', cursor: grabCursor }} />
        <circle cx={sx} cy={sy} r={4} fill={stroke} />
        <text
          x={sx + dist * 0.6 * Math.cos(angle)}
          y={sy + dist * 0.6 * Math.sin(angle) - 8}
          fill={stroke} fontSize={11} fontWeight="bold" textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px black)' }}
        >{label}</text>
      </svg>
    );
  }

  if (shape === 'square') {
    const size = Math.max(gridSize, Math.round(dist / gridSize) * gridSize);
    const angleDeg = angle * (180 / Math.PI);
    return (
      <svg style={svgStyle}>
        <g transform={`rotate(${angleDeg}, ${sx}, ${sy})`}>
          <rect x={sx} y={sy - size / 2} width={size} height={size}
            fill={fill} stroke={stroke} strokeWidth={2}
            style={{ pointerEvents: isLocked ? 'auto' : 'none', cursor: grabCursor }} />
        </g>
        <circle cx={sx} cy={sy} r={4} fill={stroke} />
        <text x={midX} y={midY - 8} fill={stroke} fontSize={11} fontWeight="bold" textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px black)' }}>{label}</text>
      </svg>
    );
  }

  return null;
}

export default function MapRegua({
  visibleRulers, currentUserId, isDM, rulers, gridSize, gridDistanceInfo,
  getRulerDistance, clearUserRuler, broadcast,
}: MapRulersProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 35 }}
    >
      {visibleRulers.map(({ userId, ruler }) => {
        if (!ruler.rulerStart || !ruler.rulerEnd) return null;
        const isMyRuler = userId === currentUserId;
        const rulerColor = ruler.color || (isMyRuler ? '#00ff66' : USER_COLORS[Array.from(rulers.keys()).indexOf(userId) % USER_COLORS.length]);

        return (
          <div key={userId} className="absolute inset-0">
            <ShapeOverlay
              ruler={ruler}
              color={rulerColor}
              gridSize={gridSize}
              gridDistanceInfo={gridDistanceInfo}
              shape={ruler.rulerShape ?? 'line'}
              isLocked={isMyRuler && ruler.rulerLocked}
            />
            {!isMyRuler && isDM && ruler.rulerStart && (
              <div
                className="absolute pointer-events-auto"
                style={{ left: ruler.rulerStart.x, top: ruler.rulerStart.y - 20, transform: 'translateX(-50%)' }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-black uppercase" style={{ color: rulerColor }}>{ruler.userName}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearUserRuler(userId, isDM, broadcast); }}
                    className="text-white/40 hover:text-red-400 transition-colors"
                    title="Limpar régua"
                  >
                    <Trash2 size={8} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}