'use client';
import { useState } from 'react';
import { Ruler, Circle, Triangle, Square, Eye, EyeOff, Eraser, Brush, Maximize2, Trash2 } from 'lucide-react';
import type { RulerShape } from './MapRegua';

interface BottomToolbarProps {
  currentUserId: string | null;
  currentUserName: string;
  isDM: boolean;
  rulers: Map<string, any>;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };
  onToggleRuler: () => void;
  onClearRuler: () => void;
  getRulerDistance: (ruler: any, gridSize: number, info: { value: number; unit: string }) => any;
  broadcast: (event: string, payload: Record<string, unknown>) => void;
  rulerShape: RulerShape;
  onRulerShape: (shape: RulerShape) => void;
  fowConfig: any;
  onFowConfig: (config: any) => void;
  fogActive: boolean;
  onFogActiveToggle: () => void;
  fogTool: 'brush' | 'erase';
  onFogTool: (tool: 'brush' | 'erase') => void;
  brushSize: number;
  onBrushSize: (size: number) => void;
  onRevealAll: () => void;
}

const SHAPES: { value: RulerShape; icon: React.ReactNode; label: string }[] = [
  { value: 'line', icon: <Ruler size={16} />, label: 'Linha' },
  { value: 'circle', icon: <Circle size={16} />, label: 'Círculo' },
  { value: 'cone', icon: <Triangle size={16} />, label: 'Cone' },
  { value: 'square', icon: <Square size={16} />, label: 'Quadrado' },
];

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
  const [rulerEnabled, setRulerEnabled] = useState(false);

  const handleToggleRuler = () => {
    setRulerEnabled(!rulerEnabled);
    onToggleRuler();
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1.5 shadow-2xl">
      {/* Botão Régua */}
      <div className="relative flex items-center">
        <button
          onClick={handleToggleRuler}
          className={`p-1.5 rounded-md transition-colors ${rulerEnabled ? 'bg-[#00ff66]/20 text-[#00ff66]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          title="Ativar régua"
        >
          <Ruler size={18} />
        </button>

        {rulerEnabled && (
          <button
            onClick={() => setShowRulerOptions(!showRulerOptions)}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-[10px]">▼</span>
          </button>
        )}
      </div>

      {/* Opções de forma da régua */}
      {rulerEnabled && showRulerOptions && (
        <div className="absolute bottom-full mb-2 left-0 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg p-1 flex gap-1">
          {SHAPES.map((shape) => (
            <button
              key={shape.value}
              onClick={() => {
                onRulerShape(shape.value);
                setShowRulerOptions(false);
              }}
              className={`p-1.5 rounded-md transition-colors ${
                rulerShape === shape.value
                  ? 'bg-[#00ff66]/20 text-[#00ff66]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={shape.label}
            >
              {shape.icon}
            </button>
          ))}
        </div>
      )}

      {/* Limpar régua */}
      {rulerEnabled && (
        <button
          onClick={onClearRuler}
          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Limpar régua"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Separador */}
      <div className="w-px h-6 bg-white/10" />

      {/* Opções de Névoa (apenas DM) */}
      {isDM && (
        <>
          <button
            onClick={onFogActiveToggle}
            className={`p-1.5 rounded-md transition-colors ${fogActive ? 'bg-[#00ff66]/20 text-[#00ff66]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            title={fogActive ? 'Desativar névoa' : 'Ativar névoa'}
          >
            {fogActive ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          {fogActive && (
            <>
              <button
                onClick={() => onFogTool('brush')}
                className={`p-1.5 rounded-md transition-colors ${fogTool === 'brush' ? 'bg-[#00ff66]/20 text-[#00ff66]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="Pincel (adicionar névoa)"
              >
                <Brush size={16} />
              </button>
              <button
                onClick={() => onFogTool('erase')}
                className={`p-1.5 rounded-md transition-colors ${fogTool === 'erase' ? 'bg-[#00ff66]/20 text-[#00ff66]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                title="Borracha (remover névoa)"
              >
                <Eraser size={16} />
              </button>

              <div className="flex items-center gap-1 px-1">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={brushSize}
                  onChange={(e) => onBrushSize(Number(e.target.value))}
                  className="w-16 accent-[#00ff66]"
                />
                <span className="text-[10px] text-white/40">{brushSize}</span>
              </div>

              <button
                onClick={onRevealAll}
                className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Revelar tudo"
              >
                <Maximize2 size={16} />
              </button>
            </>
          )}

          <div className="w-px h-6 bg-white/10" />
        </>
      )}
    </div>
  );
}