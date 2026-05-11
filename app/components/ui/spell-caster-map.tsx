'use client';

import React, { useState, useCallback, useEffect } from 'react';
import MapCanvas from './map-canvas';
import {
  Token,
  SpellPreview,
  detectTokensInSphere,
  detectTokensInCone,
  detectTokensInLine,
  detectTokensInTarget,
} from '@/utils/map-engine';
import { aplicarEfeitoMagia, SpellExecution, EffectResult } from '@/utils/spell-executor';

interface SpellCasterMapProps {
  campaignId: string;
  tokens: Token[];
  onTokensUpdate?: (tokens: Token[]) => void;
}

export default function SpellCasterMap({
  campaignId,
  tokens: initialTokens,
  onTokensUpdate,
}: SpellCasterMapProps) {
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>();
  const [previewArea, setPreviewArea] = useState<SpellPreview | undefined>();
  const [draggedSpell, setDraggedSpell] = useState<SpellExecution | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTokens(initialTokens);
  }, [initialTokens]);

  // Atualizar quando token é movido
  const handleTokenMove = useCallback((tokenId: string, x: number, y: number) => {
    setTokens((prev) => {
      const updated = prev.map((t) => (t.id === tokenId ? { ...t, x, y } : t));
      onTokensUpdate?.(updated);
      return updated;
    });
  }, [onTokensUpdate]);

  // Aceitar spell via drag-drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const spellData = e.dataTransfer.getData('application/json');
    if (!spellData) return;

    try {
      const spell: SpellExecution = JSON.parse(spellData);
      setDraggedSpell(spell);

      // Calcular preview baseado na posição do mouse
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      updateSpellPreview(spell, x, y);
    } catch (err) {
      console.error('Erro ao parsear spell:', err);
    }
  };

  const handleDragLeave = () => {
    setPreviewArea(undefined);
  };

  // Atualizar preview visual
  const updateSpellPreview = (spell: SpellExecution, screenX: number, screenY: number) => {
    if (!spell.areaFormato || !spell.areaRaio) {
      setPreviewArea(undefined);
      return;
    }

    const radiusPixels = spell.areaRaio * 8; // aproximado

    let affectedTokens: Token[] = [];

    if (spell.areaFormato === 'esfera') {
      affectedTokens = detectTokensInSphere(tokens, screenX, screenY, radiusPixels);
    } else if (spell.areaFormato === 'cone') {
      // Para cone, usar ângulo 0 por enquanto
      affectedTokens = detectTokensInCone(
        tokens,
        screenX,
        screenY,
        radiusPixels,
        0,
        60
      );
    } else if (spell.areaFormato === 'linha') {
      affectedTokens = detectTokensInLine(
        tokens,
        screenX,
        screenY,
        screenX + radiusPixels,
        screenY,
        20
      );
    } else if (spell.areaFormato === 'alvo') {
      affectedTokens = detectTokensInTarget(tokens, screenX, screenY);
    }

    setPreviewArea({
      centerX: screenX,
      centerY: screenY,
      radius: radiusPixels,
      format: (spell.areaFormato as 'esfera' | 'cone' | 'linha' | 'alvo') || 'alvo',
      angle: 0,
      affectedTokens: affectedTokens.map((t) => t.id),
    });
  };

  // Executar magia ao soltar
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedSpell || !previewArea) {
      setDraggedSpell(null);
      setPreviewArea(undefined);
      return;
    }

    setLoading(true);

    try {
      // Prepare spell execution
      const spellExecution: SpellExecution = {
        ...draggedSpell,
        posicao: {
          x: previewArea.centerX,
          y: previewArea.centerY,
        },
      };

      // Executar efeito
      const tokenPositions = tokens.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        raio: t.size,
      }));

      const resultados = aplicarEfeitoMagia(spellExecution, tokenPositions, 3);

      // Aplicar dano aos tokens
      const updatedTokens = tokens.map((token) => {
        const resultado = resultados.find((r) => r.tokenId === token.id);
        if (!resultado) return token;

        const newHp = Math.max(0, token.hp - resultado.danoRecebido);
        return { ...token, hp: newHp };
      });

      setTokens(updatedTokens);
      onTokensUpdate?.(updatedTokens);

      // Log no console
      console.log('🎯 Magia executada:', {
        spell: draggedSpell.spellName,
        atingidos: resultados.length,
        detalhes: resultados,
      });

      // Limpar
      setDraggedSpell(null);
      setPreviewArea(undefined);
    } catch (err) {
      console.error('❌ Erro ao executar magia:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full bg-[#050a05] border border-[#00ff66]/30 rounded-lg p-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-[#00ff66] rounded-full" />
        <h2 className="text-lg font-bold text-[#00ff66]">Mesa de Combate</h2>
        <span className="text-xs bg-[#00ff66]/20 text-[#00ff66] px-2 py-1 rounded">
          {tokens.length} tokens
        </span>
      </div>

      <div className="relative bg-[#0a0a0a] rounded border border-[#00ff66]/20">
        <MapCanvas
          tokens={tokens}
          onTokenMove={handleTokenMove}
          onTokenSelect={setSelectedTokenId}
          selectedTokenId={selectedTokenId}
          previewArea={previewArea}
          gridSize={40}
          width={1024}
          height={600}
        />

        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
            <div className="bg-[#050a05] border border-[#00ff66] px-4 py-2 rounded">
              <p className="text-[#00ff66] font-bold">⚡ Executando magia...</p>
            </div>
          </div>
        )}

        {draggedSpell && (
          <div className="absolute bottom-4 left-4 bg-[#050a05] border border-[#00ff66]/50 px-3 py-2 rounded text-xs text-[#00ff66]">
            📍 {draggedSpell.spellName}
            {previewArea && (
              <div className="text-[#ffff00] mt-1">
                {previewArea.affectedTokens.length} alvo(s)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info do token selecionado */}
      {selectedTokenId && (
        <div className="mt-4 p-3 bg-[#0a1a0a] border border-[#00ff66]/30 rounded text-sm">
          {(() => {
            const token = tokens.find((t) => t.id === selectedTokenId);
            if (!token) return null;
            return (
              <div className="space-y-1">
                <p className="text-[#00ff66] font-bold">{token.name}</p>
                <p className="text-gray-400">
                  Posição: ({Math.round(token.x)}, {Math.round(token.y)})
                </p>
                <p className="text-gray-400">
                  HP: {token.hp}/{token.maxHp}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
