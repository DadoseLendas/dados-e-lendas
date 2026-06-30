'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
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
  rulerShape: RulerShape;
  updateRulerPosition?: (userId: string, startX: number, startY: number, endX: number, endY: number) => void;
}

const USER_COLORS = ['#00ff66', '#ff4444', '#4488ff', '#ffaa44', '#ff44ff', '#44ffaa', '#ffff44', '#aa44ff'];

function ShapeOverlay({
  ruler, color, gridSize, gridDistanceInfo, shape, onDragStart, onDragMove, onDragEnd,
}: {
  ruler: UserRuler;
  color: string;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };
  shape: RulerShape;
  onDragStart?: (e: React.MouseEvent, userId: string) => void;
  onDragMove?: (e: React.MouseEvent, userId: string) => void;
  onDragEnd?: (e: React.MouseEvent, userId: string) => void;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDragStart) onDragStart(e, ruler.userId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDragMove) onDragMove(e, ruler.userId);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDragEnd) onDragEnd(e, ruler.userId);
  };

  if (shape === 'line') {
    const angleDeg = angle * (180 / Math.PI);
    return (
      <>
        <div
          className="absolute left-0 top-0 pointer-events-none"
          style={{
            transform: `translate(${sx}px, ${sy}px) rotate(${angleDeg}deg)`,
            transformOrigin: '0 0',
          }}
        >
          <div
            className="h-[2px] rounded-full"
            style={{ width: `${dist}px`, backgroundColor: stroke, boxShadow: `0 0 6px ${stroke}60` }}
          />
        </div>
        <div
          className="absolute pointer-events-none rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold whitespace-nowrap"
          style={{ left: midX, top: midY, transform: 'translate(-50%, -50%)', border: `1px solid ${stroke}`, color: stroke, cursor: 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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
        <circle cx={sx} cy={sy} r={r} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray="6 3" />
        <circle cx={sx} cy={sy} r={4} fill={stroke} />
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={midX} y={midY - 8} fill={stroke} fontSize={11} fontWeight="bold" textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px black)' }}>{label}</text>
        <circle
          cx={midX} cy={midY}
          r={15}
          fill="transparent"
          stroke="transparent"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: 'grab', pointerEvents: 'auto' }}
        />
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
        <path d={d} fill={fill} stroke={stroke} strokeWidth={2} />
        <circle cx={sx} cy={sy} r={4} fill={stroke} />
        <text
          x={sx + dist * 0.6 * Math.cos(angle)}
          y={sy + dist * 0.6 * Math.sin(angle) - 8}
          fill={stroke} fontSize={11} fontWeight="bold" textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px black)' }}
        >{label}</text>
        <circle
          cx={midX} cy={midY}
          r={15}
          fill="transparent"
          stroke="transparent"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: 'grab', pointerEvents: 'auto' }}
        />
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
            fill={fill} stroke={stroke} strokeWidth={2} />
        </g>
        <circle cx={sx} cy={sy} r={4} fill={stroke} />
        <text x={midX} y={midY - 8} fill={stroke} fontSize={11} fontWeight="bold" textAnchor="middle"
          style={{ filter: 'drop-shadow(0 1px 2px black)' }}>{label}</text>
        <circle
          cx={midX} cy={midY}
          r={15}
          fill="transparent"
          stroke="transparent"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: 'grab', pointerEvents: 'auto' }}
        />
      </svg>
    );
  }

  return null;
}

export default function MapRegua({
  visibleRulers, currentUserId, isDM, rulers, gridSize, gridDistanceInfo,
  getRulerDistance, clearUserRuler, broadcast, rulerShape, updateRulerPosition,
}: MapRulersProps) {
  const [draggingRuler, setDraggingRuler] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragStartRuler, setDragStartRuler] = useState<UserRuler | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent, userId: string) => {
    const ruler = visibleRulers.find(r => r.userId === userId)?.ruler;
    if (!ruler || !ruler.rulerStart || !ruler.rulerEnd) return;
    
    setDraggingRuler(userId);
    setDragStartRuler(ruler);
    
    const midX = (ruler.rulerStart.x + ruler.rulerEnd.x) / 2;
    const midY = (ruler.rulerStart.y + ruler.rulerEnd.y) / 2;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setDragOffset({ x: mouseX - midX, y: mouseY - midY });
  }, [visibleRulers]);

  const handleDragMove = useCallback((e: React.MouseEvent, userId: string) => {
    if (draggingRuler !== userId || !dragOffset || !dragStartRuler) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newCenterX = mouseX - dragOffset.x;
    const newCenterY = mouseY - dragOffset.y;
    
    const dx = dragStartRuler.rulerStart!.x - (dragStartRuler.rulerStart!.x + dragStartRuler.rulerEnd!.x) / 2;
    const dy = dragStartRuler.rulerStart!.y - (dragStartRuler.rulerStart!.y + dragStartRuler.rulerEnd!.y) / 2;
    
    const newStartX = newCenterX + dx;
    const newStartY = newCenterY + dy;
    const newEndX = newCenterX - dx;
    const newEndY = newCenterY - dy;
    
    if (updateRulerPosition) {
      updateRulerPosition(userId, newStartX, newStartY, newEndX, newEndY);
    }
  }, [draggingRuler, dragOffset, dragStartRuler, updateRulerPosition]);

  const handleDragEnd = useCallback(() => {
    setDraggingRuler(null);
    setDragOffset(null);
    setDragStartRuler(null);
  }, []);

  useEffect(() => {
    if (draggingRuler) {
      const handleGlobalMouseUp = () => handleDragEnd();
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [draggingRuler, handleDragEnd]);

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
          <div key={userId} className="absolute inset-0 pointer-events-none">
            <ShapeOverlay
              ruler={ruler}
              color={rulerColor}
              gridSize={gridSize}
              gridDistanceInfo={gridDistanceInfo}
              shape={rulerShape}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
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