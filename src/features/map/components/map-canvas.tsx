'use client';

import React, { useEffect } from 'react';
import { Token, SpellPreview } from '@/utils/map-engine';
import { useMapCanvas } from '@/features/map/hooks/useMapCanvas';
import { renderCanvas } from '@/features/map/utils/canvas-renderer';

interface MapCanvasProps {
  tokens: Token[];
  onTokenMove?: (tokenId: string, x: number, y: number) => void;
  onTokenSelect?: (tokenId: string | undefined) => void;
  selectedTokenId?: string;
  previewArea?: SpellPreview;
  gridSize?: number;
  width?: number;
  height?: number;
  readOnly?: boolean;
}

export default function MapCanvas({
  tokens,
  onTokenMove,
  onTokenSelect,
  selectedTokenId,
  previewArea,
  gridSize = 40,
  width = 800,
  height = 600,
  readOnly = false,
}: MapCanvasProps) {
  const { mapState, canvasRef, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } =
    useMapCanvas({
      tokens,
      width,
      height,
      gridSize,
      onTokenMove,
      onTokenSelect,
      selectedTokenId,
      previewArea,
      readOnly,
    });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCanvas(canvas, mapState, width, height, selectedTokenId);
  }, [mapState, width, height, selectedTokenId]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="border border-[#00ff66] rounded cursor-move bg-[#0a0a0a]"
      style={{ display: 'block' }}
    />
  );
}
