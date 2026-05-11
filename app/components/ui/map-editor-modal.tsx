'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface MapEditorModalProps {
  isOpen: boolean;
  mapUrl: string;
  campaignId: string;
  onConfirm: (gridPx: number, mapScale: number, gridColor: string, gridOpacity: number, gridThickness: number, gridDashed: boolean, gridDashFrequency: number, gridDimension: string) => Promise<void>;
  onCancel: () => void;
}

export default function MapEditorModal({
  isOpen,
  mapUrl,
  campaignId,
  onConfirm,
  onCancel,
}: MapEditorModalProps) {
  const [gridPx, setGridPx] = useState<number>(50);
  const [mapScale, setMapScale] = useState<number>(100);
  const [gridColor, setGridColor] = useState<string>('#ffffff');
  const [gridOpacity, setGridOpacity] = useState<number>(0.08);
  const [gridThickness, setGridThickness] = useState<number>(1);
  const [gridDashed, setGridDashed] = useState<boolean>(false);
  const [gridDashFrequency, setGridDashFrequency] = useState<number>(5);
  const [gridDimension, setGridDimension] = useState<string>('5 pes'); // NOVO
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(gridPx, mapScale, gridColor, gridOpacity, gridThickness, gridDashed, gridDashFrequency, gridDimension);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getGridBg = () => {
    const r = parseInt(gridColor.slice(1, 3), 16);
    const g = parseInt(gridColor.slice(3, 5), 16);
    const b = parseInt(gridColor.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${gridOpacity})`;
    
    if (gridDashed) {
      // SVG para grid pontilhado
      const dashSize = Math.max(2, gridPx / gridDashFrequency);
      const svg = `<svg width="${gridPx}" height="${gridPx}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="${gridPx}" y2="0" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
        <line x1="0" y1="0" x2="0" y2="${gridPx}" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
      </svg>`;
      return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
    } else {
      // Grid sólido com espessura
      return `linear-gradient(to right, ${rgba} ${gridThickness}px, transparent ${gridThickness}px), linear-gradient(to bottom, ${rgba} ${gridThickness}px, transparent ${gridThickness}px)`;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#00ff66]/20 rounded-[24px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,255,102,0.1)]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-white text-2xl font-bold uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            Editor de Mapa
          </h2>
          <button 
            onClick={onCancel} 
            className="text-white/40 hover:text-[#00ff66] transition-colors"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto flex gap-6 p-6">
          {/* Preview do Mapa */}
          <div className="flex-1 flex flex-col gap-4">
            <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Preview do Mapa
            </label>
            <div className="flex-1 border border-white/10 rounded-lg overflow-hidden bg-black/50 relative min-h-[300px]">
              <img 
                src={mapUrl} 
                alt="Mapa Preview"
                className="w-full h-full object-contain"
                style={{ transform: `scale(${mapScale / 100})` }}
              />
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  backgroundImage: getGridBg(),
                  backgroundSize: `${gridPx}px ${gridPx}px`,
                }} 
              />
            </div>
          </div>

          {/* Controles */}
          <div className="w-80 flex flex-col gap-6">
            {/* Grid Size - Input Numérico */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Tamanho do Grid (px)
              </label>
              <input 
                type="number"
                value={gridPx}
                onChange={(e) => setGridPx(Math.max(10, parseInt(e.target.value) || 50))}
                min={10}
                max={200}
                className="w-full bg-[#050505] border border-white/5 rounded-lg py-2 px-3 text-white text-sm"
              />
              <div className="text-[9px] text-white/40">Intervalo: 10-200px</div>
            </div>

            {/* Grid Size - Slider */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-white/50 uppercase">
                Ajuste fino
              </label>
              <input 
                type="range"
                value={gridPx}
                onChange={(e) => setGridPx(parseInt(e.target.value))}
                min={10}
                max={200}
                className="w-full accent-[#00ff66]"
              />
            </div>

            {/* Predefinidos */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-bold text-white/50 uppercase">
                Predefinidos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '5ft / 40px', value: 40 },
                  { label: '5ft / 50px', value: 50 },
                  { label: '10ft / 80px', value: 80 },
                  { label: '10ft / 100px', value: 100 },
                ].map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setGridPx(preset.value)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      gridPx === preset.value
                        ? 'bg-[#00ff66] text-black'
                        : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Scale */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Escala do Mapa ({mapScale}%)
              </label>
              <input 
                type="range"
                value={mapScale}
                onChange={(e) => setMapScale(parseInt(e.target.value))}
                min={50}
                max={200}
                step={10}
                className="w-full accent-[#00ff66]"
              />
            </div>

            {/* Grid Color */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Espessura da Linha ({gridThickness}px)
              </label>
              <input 
                type="range"
                value={gridThickness}
                onChange={(e) => setGridThickness(parseInt(e.target.value))}
                min={1}
                max={4}
                className="w-full accent-[#00ff66]"
              />
            </div>

            {/* Grid Dashed */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Estilo
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGridDashed(false)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    !gridDashed
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                  }`}
                >
                  Sólido
                </button>
                <button
                  onClick={() => setGridDashed(true)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    gridDashed
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                  }`}
                >
                  Pontilhado
                </button>
              </div>
            </div>

            {gridDashed && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                  Frequência do Pontilhado
                </label>
                <input 
                  type="range"
                  value={gridDashFrequency}
                  onChange={(e) => setGridDashFrequency(parseInt(e.target.value))}
                  min={2}
                  max={10}
                  className="w-full accent-[#00ff66]"
                />
                <div className="text-[9px] text-white/40">Mais alto = pontilhado menor</div>
              </div>
            )}

            {/* Dimensão do Grid - CRÍTICO para movimento/magia */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Dimensão do Grid
              </label>
              <p className="text-[9px] text-white/50 mb-2">Define a distância real de cada quadrado (usado para movimento e magia)</p>
              <input 
                type="text"
                value={gridDimension}
                onChange={(e) => setGridDimension(e.target.value)}
                placeholder="ex: 5 pes, 10 m, 1.5 m"
                className="w-full bg-[#050505] border border-white/5 rounded-lg py-2 px-3 text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGridDimension('5 pes')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    gridDimension === '5 pes'
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                  }`}
                >
                  5 pes
                </button>
                <button
                  onClick={() => setGridDimension('10 pes')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    gridDimension === '10 pes'
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                  }`}
                >
                  10 pes
                </button>
                <button
                  onClick={() => setGridDimension('1,5 m')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    gridDimension === '1,5 m'
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                  }`}
                >
                  1,5 m
                </button>
                <button
                  onClick={() => setGridDimension('2 m')}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    gridDimension === '2 m'
                      ? 'bg-[#00ff66] text-black'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-[#00ff66]/30'
                  }`}
                >
                  2 m
                </button>
              </div>
            </div>

            {/* Grid Color */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Cor do Grid
              </label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color"
                  value={gridColor}
                  onChange={(e) => setGridColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <span className="text-[10px] text-white/50">{gridColor}</span>
              </div>
            </div>

            {/* Grid Opacity */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                Opacidade do Grid ({Math.round(gridOpacity * 100)}%)
              </label>
              <input 
                type="range"
                value={gridOpacity}
                onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                min={0}
                max={0.5}
                step={0.01}
                className="w-full accent-[#00ff66]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex gap-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-black text-[12px] uppercase tracking-[0.15em] rounded-xl hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-[#00ff66] text-black font-black text-[12px] uppercase tracking-[0.15em] rounded-xl hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,255,102,0.4)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Confirmar e Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
