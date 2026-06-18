'use client';

import type { Token } from '@/features/mesa/types';
import { computeTokenLabels } from '@/features/mesa/utils/token-labels';

interface TokenLayerProps {
  tokens: Token[];
  gridSize: number;
  mapaUrl: string | null;
  tokenSelecionado: string | null;
  isDM: boolean;
  footprintForCategory: (sizeCategory: Token['sizeCategory']) => number;
  onTokenMouseDown: (event: React.MouseEvent, tokenId: string) => void;
  onOpenTokenSheet: (tokenId: string) => void;
}

export default function TokenLayer({
  tokens,
  gridSize,
  mapaUrl,
  tokenSelecionado,
  isDM,
  footprintForCategory,
  onTokenMouseDown,
  onOpenTokenSheet,
}: TokenLayerProps) {
  const tokenLabels = computeTokenLabels(tokens);
  return (
    <>
      {tokens.map((token) => {
        const footprint = footprintForCategory(token.sizeCategory);
        const displaySize = gridSize * footprint;
        const labelText = tokenLabels.get(token.id);
        const labelHeight = labelText ? 18 : 0;

        return (
          <div
            key={token.id}
            onMouseDown={(e) => onTokenMouseDown(e, token.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (token.characterId || !isDM) return;
              onOpenTokenSheet(token.id);
            }}
            style={{
              transform: `translate(${token.x}px, ${token.y}px)`,
              position: 'absolute',
              top: mapaUrl ? '0' : '50%',
              left: mapaUrl ? '0' : '50%',
              marginTop: mapaUrl ? '0' : `-${displaySize / 2}px`,
              marginLeft: mapaUrl ? '0' : `-${displaySize / 2}px`,
              width: `${displaySize}px`,
              height: `${displaySize + labelHeight}px`,
              zIndex: tokenSelecionado === token.id ? 100 : 10,
            }}
            className="flex flex-col items-center cursor-move group overflow-visible"
          >
            <div
              style={{
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                flex: '0 0 auto',
                transform: token.isMonster ? `rotate(${token.rotation ?? 0}deg)` : 'none',
                transformOrigin: '50% 50%',
              }}
              className={`relative shrink-0 overflow-hidden transition-all duration-200 ${token.characterId ? 'rounded-full border-2 bg-neutral-900' : ''} ${
                token.characterId
                  ? tokenSelecionado === token.id
                    ? 'border-[#00ff66] shadow-[0_0_20px_#00ff66] scale-110'
                    : 'border-white/60 group-hover:border-[#00ff66] group-hover:shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                  : tokenSelecionado === token.id
                    ? 'scale-110'
                    : ''
              }`}
            >
              {token.url ? (
                <img
                  src={token.url}
                  alt={token.name ?? ''}
                  draggable={false}
                  style={{ objectPosition: `${token.imgOffsetX ?? 50}% ${token.imgOffsetY ?? 50}%` }}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="text-white/20 text-lg">?</span>
                </div>
              )}
            </div>
            {labelText && (
              <span className="mt-1 text-[8px] font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[80px] truncate text-center leading-tight flex-none">
                {labelText}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}