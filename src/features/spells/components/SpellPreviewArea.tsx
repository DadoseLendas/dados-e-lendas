'use client';
import { Shield, Square, ArrowRight, Crosshair, Circle } from 'lucide-react';

interface Token {
  id: string;
  x: number;
  y: number;
  raio: number;
  nome: string;
}

interface PreviewArea {
  x: number;
  y: number;
  raioPreview: number;
  inRange: boolean;
  atingidos: Token[];
}

interface SpellPreviewAreaProps {
  previewArea: PreviewArea;
  gridSize: number;
  casterPoint?: { x: number; y: number } | null;
  hoverPoint?: { x: number; y: number } | null;
  spellFormato?: string;
  spellAreaTexto?: string;
  spellAlcanceTexto?: string;
}

export default function SpellPreviewArea({ previewArea, gridSize, casterPoint, hoverPoint, spellFormato = '', spellAreaTexto = '', spellAlcanceTexto = '' }: SpellPreviewAreaProps) {
  const formatoTexto = spellFormato.toLowerCase();
  const areaTextoStr = spellAreaTexto.toLowerCase();
  const alcanceTextoStr = spellAlcanceTexto.toLowerCase();
  const shapeText = formatoTexto || areaTextoStr;

  const isPessoal = alcanceTextoStr.includes("pessoal") || alcanceTextoStr.includes("self");
  const isToque = alcanceTextoStr.includes("toque") || alcanceTextoStr.includes("touch");
  const isAura = shapeText.includes("aura");
  const isCube = shapeText.includes("cubo") || shapeText.includes("quadrado") || shapeText.includes("caixa");
  const isLine = shapeText.includes("linha") || shapeText.includes("line");
  const isCircle = shapeText.includes("circulo") || shapeText.includes("círculo") || shapeText.includes("esfera");
  const isCone = shapeText.includes("cone");
  const isCilindro = shapeText.includes("cilindro") || shapeText.includes("cylinder");
  const isAlvo = !isAura && !isCone && !isCilindro && !isCube && !isLine && !isCircle && (formatoTexto === "" || shapeText.includes("alvo") || shapeText.includes("único") || shapeText.includes("unico"));

  const previewColor = previewArea.inRange ? "border-gray-300 bg-gray-500/20" : "border-red-400 bg-red-500/20";

  if (isPessoal && !isAura && !isCircle && !isCone) {
    return (
      <div className="absolute pointer-events-none" style={{ left: previewArea.x - 12, top: previewArea.y - 12 }}>
        <Shield className={`h-6 w-6 ${previewArea.inRange ? "text-[#00ff66]" : "text-red-400"}`} />
        {previewArea.atingidos.length > 0 && (
          <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
            {previewArea.atingidos[0].nome} (você)
          </div>
        )}
      </div>
    );
  }

  if (isCube) {
    const size = previewArea.raioPreview * 2;
    return (
      <div className="absolute pointer-events-none" style={{ left: previewArea.x - size / 2, top: previewArea.y - size / 2 }}>
        <div className={`border-2 border-dashed ${previewColor}`} style={{ width: size, height: size }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Square className={`h-6 w-6 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
        </div>
        <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
          {previewArea.atingidos.length} alvo(s)
        </div>
      </div>
    );
  }

  if (isLine && casterPoint && hoverPoint) {
    const dx = hoverPoint.x - casterPoint.x;
    const dy = hoverPoint.y - casterPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const thickness = gridSize;
    return (
      <div className="absolute pointer-events-none" style={{ left: casterPoint.x, top: casterPoint.y }}>
        <div className={`border-2 border-dashed ${previewColor} origin-left`} style={{ width: length, height: thickness, transform: `translateY(${-thickness / 2}px) rotate(${angle}deg)` }} />
        <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
          <ArrowRight className={`h-6 w-6 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />
        </div>
        <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
          {previewArea.atingidos.length} alvo(s)
        </div>
      </div>
    );
  }

  if (isCone && casterPoint) {
    const dx = previewArea.x - casterPoint.x;
    const dy = previewArea.y - casterPoint.y;
    const angle = Math.atan2(dy, dx);
    const length = previewArea.raioPreview;
    const halfAngle = 30 * Math.PI / 180;

    const leftX = casterPoint.x + Math.cos(angle - halfAngle) * length;
    const leftY = casterPoint.y + Math.sin(angle - halfAngle) * length;
    const rightX = casterPoint.x + Math.cos(angle + halfAngle) * length;
    const rightY = casterPoint.y + Math.sin(angle + halfAngle) * length;

    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
        <path
          d={`M ${casterPoint.x},${casterPoint.y} L ${leftX},${leftY} A ${length},${length} 0 0,1 ${rightX},${rightY} Z`}
          fill={previewArea.inRange ? "rgba(0,255,102,0.1)" : "rgba(255,68,68,0.1)"}
          stroke={previewArea.inRange ? "rgba(0,255,102,0.6)" : "rgba(255,68,68,0.6)"}
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        <foreignObject x={previewArea.x - 40} y={previewArea.y - 60} width={80} height={24}>
          <div className={`flex items-center justify-center rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
            {previewArea.atingidos.length} alvo(s)
          </div>
        </foreignObject>
      </svg>
    );
  }

  if (isAlvo) {
    return (
      <div className="absolute pointer-events-none" style={{ left: previewArea.x - 12, top: previewArea.y - 12 }}>
        <Crosshair className={`h-6 w-6 ${previewArea.inRange ? "text-[#00ff66]" : "text-red-400"}`} />
        {previewArea.atingidos.length > 0 && (
          <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
            {previewArea.atingidos[0].nome}
          </div>
        )}
      </div>
    );
  }

  const size = previewArea.raioPreview * 2;
  return (
    <div className="absolute pointer-events-none" style={{ left: previewArea.x - previewArea.raioPreview, top: previewArea.y - previewArea.raioPreview }}>
      <div className={`border-2 border-dashed rounded-full ${previewColor}`} style={{ width: size, height: size }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {isAura ? <Shield className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} /> : <Circle className={`h-7 w-7 ${previewArea.inRange ? "text-gray-100" : "text-red-300"}`} />}
      </div>
      <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs ${previewArea.inRange ? "bg-black/80 text-gray-100" : "bg-black/80 text-red-300"}`}>
        {previewArea.atingidos.length} alvo(s)
      </div>
    </div>
  );
}
