'use client';
import { useState } from 'react';
import { Ruler, Circle, Triangle, Square, Eye, EyeOff, Eraser, Brush, Maximize2, Trash2, ChevronUp } from 'lucide-react';
import type { RulerShape } from './MapRegua';
import type { FowConfig } from '@/features/mesa/hooks/useFogOfWar';
import type { UserRuler } from '@/features/mesa/types';

interface RulerDistance {
  meters: number;
  feet: number;
}

interface BottomToolbarProps {
  currentUserId: string | null;
  currentUserName: string;
  isDM: boolean;
  rulers: Map<string, UserRuler>;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };
  onToggleRuler: () => void;
  onClearRuler: () => void;
  getRulerDistance: (ruler: UserRuler, gridSize: number, info: { value: number; unit: string }) => RulerDistance | null;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  rulerShape: RulerShape;
  onRulerShape: (shape: RulerShape) => void;
  fowConfig: FowConfig;
  onFowConfig: (config: FowConfig) => void;
  fogActive: boolean;
  onFogActiveToggle: () => void;
  fogTool: 'brush' | 'erase';
  onFogTool: (tool: 'brush' | 'erase') => void;
  brushSize: number;
  onBrushSize: (size: number) => void;
  onRevealAll: () => void;
}

const SHAPES: { value: RulerShape; icon: React.ReactNode; label: string }[] = [
  { value: 'line', icon: <Ruler size={15} />, label: 'Linha' },
  { value: 'circle', icon: <Circle size={15} />, label: 'Círculo' },
  { value: 'cone', icon: <Triangle size={15} />, label: 'Cone' },
  { value: 'square', icon: <Square size={15} />, label: 'Quadrado' },
];

const SEP = () => <div className="w-px h-7 bg-white/10 mx-0.5 flex-shrink-0" />;

function ToolbarButton({
  active, onClick, title, children, accent = '#00ff66',
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="relative p-2 rounded-xl transition-all duration-300"
      style={{
        color: active ? accent : 'rgba(255,255,255,0.35)',
        filter: active ? `drop-shadow(0 0 6px ${accent})` : 'none',
        backgroundColor: active ? `${accent}1a` : 'transparent',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = accent; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
    >
      {children}
    </button>
  );
}

export default function BottomToolbar({
  currentUserId,
  currentUserName,
  isDM,
  rulers,
  gridSize,
  gridDistanceInfo,
  onToggleRuler,
  onClearRuler,
  getRulerDistance,
  broadcast,
  rulerShape,
  onRulerShape,
  fowConfig,
  onFowConfig,
  fogActive,
  onFogActiveToggle,
  fogTool,
  onFogTool,
  brushSize,
  onBrushSize,
  onRevealAll,
}: BottomToolbarProps) {
  const [showRulerOptions, setShowRulerOptions] = useState(false);

  const myRuler = currentUserId ? rulers.get(currentUserId) : undefined;
  const rulerEnabled = !!myRuler?.showRuler;
  const distance = myRuler ? getRulerDistance(myRuler, gridSize, gridDistanceInfo) : null;

  const handleToggleRuler = () => {
    onToggleRuler();
    if (rulerEnabled) setShowRulerOptions(false);
  };

  return (
    <div
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-2xl select-none"
      style={{
        backgroundColor: 'rgba(10,18,10,0.82)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 0 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Régua ── */}
      <div className="relative flex items-center">
        <ToolbarButton active={rulerEnabled} onClick={handleToggleRuler} title="Ativar régua">
          <Ruler size={18} />
        </ToolbarButton>

        {rulerEnabled && (
          <button
            type="button"
            onClick={() => setShowRulerOptions(v => !v)}
            className="p-1 -ml-1 rounded-lg text-white/30 hover:text-[#00ff66] transition-colors duration-300"
            title="Forma da régua"
          >
            <ChevronUp size={12} className={`transition-transform duration-300 ${showRulerOptions ? '' : 'rotate-180'}`} />
          </button>
        )}

        {rulerEnabled && showRulerOptions && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex gap-1 px-1.5 py-1.5 rounded-xl"
            style={{
              backgroundColor: 'rgba(10,18,10,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 24px rgba(0,0,0,0.6)',
            }}
          >
            {SHAPES.map((shape) => (
              <ToolbarButton
                key={shape.value}
                active={rulerShape === shape.value}
                onClick={() => { onRulerShape(shape.value); setShowRulerOptions(false); }}
                title={shape.label}
              >
                {shape.icon}
              </ToolbarButton>
            ))}
          </div>
        )}
      </div>

      {/* ── Distância / limpar régua ── */}
      {rulerEnabled && (
        <>
          <SEP />
          <div className="flex items-center gap-2 px-1.5">
            {distance ? (
              <>
                <span className="text-[13px] font-black text-[#00ff66] tabular-nums tracking-tight">
                  {distance.meters.toFixed(1)}m
                </span>
                <span className="text-[9px] text-white/20">·</span>
                <span className="text-[11px] text-white/40 tabular-nums">{distance.feet.toFixed(0)}pés</span>
              </>
            ) : (
              <span className="text-[10px] text-white/25 font-bold uppercase tracking-wider whitespace-nowrap">
                Clique para medir
              </span>
            )}
            <button
              type="button"
              onClick={onClearRuler}
              className="text-white/25 hover:text-red-400 transition-colors duration-300"
              title="Limpar régua"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}

      {/* ── Névoa (DM apenas) ── */}
      {isDM && (
        <>
          <SEP />
          <ToolbarButton active={fogActive} onClick={onFogActiveToggle} title={fogActive ? 'Desativar névoa' : 'Ativar névoa'}>
            {fogActive ? <Eye size={18} /> : <EyeOff size={18} />}
          </ToolbarButton>

          {fogActive && (
            <>
              <div className="flex items-center gap-0.5 px-0.5">
                <ToolbarButton active={fogTool === 'brush'} onClick={() => onFogTool('brush')} title="Pincel — adicionar névoa">
                  <Brush size={15} />
                </ToolbarButton>
                <ToolbarButton active={fogTool === 'erase'} onClick={() => onFogTool('erase')} title="Borracha — remover névoa" accent="#ffaa44">
                  <Eraser size={15} />
                </ToolbarButton>
              </div>

              <div className="flex items-center gap-2 px-2">
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider whitespace-nowrap">Pincel</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={brushSize}
                  onChange={(e) => onBrushSize(Number(e.target.value))}
                  className="w-16 accent-[#00ff66] cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-3 text-center tabular-nums font-bold">{brushSize}</span>
              </div>

              <ToolbarButton onClick={onRevealAll} title="Revelar tudo" accent="#00ff66">
                <Maximize2 size={15} />
              </ToolbarButton>
            </>
          )}

          {/* Estilo da névoa */}
          <SEP />
          <div className="flex items-center gap-0.5 px-0.5">
            {([
              { value: 'black', label: 'Preto' },
              { value: 'gray', label: 'Cinza' },
              { value: 'desaturated_blur', label: 'Desfocado' },
            ] as const).map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => onFowConfig({ ...fowConfig, style: s.value })}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                  fowConfig.style === s.value
                    ? 'bg-[#00ff66]/15 text-[#00ff66]'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {fowConfig.style === 'gray' && (
            <div className="flex items-center gap-2 px-2">
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Opac.</span>
              <input
                type="range" min={0.1} max={1} step={0.05} value={fowConfig.gray_opacity}
                onChange={e => onFowConfig({ ...fowConfig, gray_opacity: Number(e.target.value) })}
                className="w-14 accent-[#00ff66] cursor-pointer"
              />
              <span className="text-[9px] text-white/40 w-7 tabular-nums font-bold">{Math.round(fowConfig.gray_opacity * 100)}%</span>
            </div>
          )}

          {fowConfig.style === 'desaturated_blur' && (
            <div className="flex items-center gap-2 px-2">
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Blur</span>
              <input
                type="range" min={2} max={24} step={1} value={fowConfig.desaturated_blur_radius}
                onChange={e => onFowConfig({ ...fowConfig, desaturated_blur_radius: Number(e.target.value) })}
                className="w-14 accent-[#00ff66] cursor-pointer"
              />
              <span className="text-[9px] text-white/40 w-5 tabular-nums font-bold">{fowConfig.desaturated_blur_radius}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}