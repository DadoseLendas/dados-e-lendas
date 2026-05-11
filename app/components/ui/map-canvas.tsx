'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Token,
  MapState,
  SpellPreview,
  detectTokensInSphere,
  detectTokensInCone,
  detectTokensInLine,
  distancePixels,
  snapToGrid,
  calculateFitViewport,
} from '@/utils/map-engine';

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
  gridSize = 40, // 40px = 5 pés em D&D
  width = 800,
  height = 600,
  readOnly = false,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapState, setMapState] = useState<MapState>({
    width,
    height,
    gridSize,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    tokens,
    selectedTokenId,
    previewArea,
  });

  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Atualizar estado quando props mudam
  useEffect(() => {
    setMapState((prev) => ({
      ...prev,
      tokens,
      selectedTokenId,
      previewArea,
    }));
  }, [tokens, selectedTokenId, previewArea]);

  // Fit viewport quando montar
  useEffect(() => {
    if (tokens.length > 0) {
      const fit = calculateFitViewport(tokens, width, height);
      setMapState((prev) => ({
        ...prev,
        ...fit,
      }));
    }
  }, [tokens.length, width, height]);

  // ===== RENDERIZAÇÃO =====

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const { gridSize, offsetX, offsetY, zoom } = mapState;
    const scaledGridSize = gridSize * zoom;

    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;

    // Linhas verticais
    let x = offsetX % scaledGridSize;
    while (x < width) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      x += scaledGridSize;
    }

    // Linhas horizontais
    let y = offsetY % scaledGridSize;
    while (y < height) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      y += scaledGridSize;
    }
  };

  const drawToken = (ctx: CanvasRenderingContext2D, token: Token) => {
    const { offsetX, offsetY, zoom } = mapState;
    const screenX = token.x * zoom + offsetX;
    const screenY = token.y * zoom + offsetY;
    const screenRadius = token.size * zoom;

    // Circle
    ctx.fillStyle = token.color || '#4a9eff';
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
    ctx.fill();

    // Borda (mais grossa se selecionado)
    ctx.strokeStyle = selectedTokenId === token.id ? '#ffff00' : '#333';
    ctx.lineWidth = selectedTokenId === token.id ? 3 : 2;
    ctx.stroke();

    // HP bar
    const barWidth = screenRadius * 2;
    const barHeight = 8;
    const barY = screenY + screenRadius + 10;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

    // HP
    const hpPercent = token.hp / token.maxHp;
    const hpColor = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillStyle = hpColor;
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth * hpPercent, barHeight);

    // Nome
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(token.name, screenX, screenY + 5);
  };

  const drawSpellPreview = (ctx: CanvasRenderingContext2D) => {
    if (!previewArea) return;

    const { offsetX, offsetY, zoom } = mapState;
    const screenX = previewArea.centerX * zoom + offsetX;
    const screenY = previewArea.centerY * zoom + offsetY;
    const screenRadius = previewArea.radius * zoom;

    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.lineWidth = 2;

    if (previewArea.format === 'esfera') {
      ctx.beginPath();
      ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (previewArea.format === 'cone') {
      // Desenhar cone
      const angle = previewArea.angle || 0;
      const angleRad = (angle * Math.PI) / 180;
      const coneWidth = 60; // graus

      ctx.beginPath();
      ctx.moveTo(screenX, screenY);

      const startAngle = angleRad - (coneWidth / 2) * (Math.PI / 180);
      const endAngle = angleRad + (coneWidth / 2) * (Math.PI / 180);

      ctx.arc(screenX, screenY, screenRadius, startAngle, endAngle);
      ctx.lineTo(screenX, screenY);

      ctx.fill();
      ctx.stroke();
    } else if (previewArea.format === 'linha') {
      // Desenhar linha
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + screenRadius, screenY);
      ctx.lineWidth = 20;
      ctx.stroke();
    }

    // Marcar tokens atingidos
    previewArea.affectedTokens.forEach((tokenId) => {
      const token = mapState.tokens.find((t) => t.id === tokenId);
      if (!token) return;

      const tokenScreenX = token.x * zoom + offsetX;
      const tokenScreenY = token.y * zoom + offsetY;

      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tokenScreenX, tokenScreenY, token.size * zoom + 5, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Grid
    drawGrid(ctx);

    // Preview de magia
    drawSpellPreview(ctx);

    // Tokens
    mapState.tokens.forEach((token) => {
      drawToken(ctx, token);
    });
  };

  useEffect(() => {
    render();
  }, [mapState, width, height]);

  // ===== INTERAÇÃO =====

  const screenToWorld = (screenX: number, screenY: number): { x: number; y: number } => {
    const { offsetX, offsetY, zoom } = mapState;
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom,
    };
  };

  const worldToScreen = (x: number, y: number): { x: number; y: number } => {
    const { offsetX, offsetY, zoom } = mapState;
    return {
      x: x * zoom + offsetX,
      y: y * zoom + offsetY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    // Detectar token clicado
    const clickedToken = mapState.tokens.find((token) => {
      const dist = distancePixels(
        world.x,
        world.y,
        token.x,
        token.y
      );
      return dist <= token.size;
    });

    if (clickedToken) {
      setDraggingToken(clickedToken.id);
      setDragStart(world);
      onTokenSelect?.(clickedToken.id);
    } else {
      onTokenSelect?.(undefined);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingToken || !dragStart || readOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    // Snap ao grid
    const snappedX = snapToGrid(world.x, mapState.gridSize);
    const snappedY = snapToGrid(world.y, mapState.gridSize);

    const token = mapState.tokens.find((t) => t.id === draggingToken);
    if (token) {
      const newToken = { ...token, x: snappedX, y: snappedY };
      setMapState((prev) => ({
        ...prev,
        tokens: prev.tokens.map((t) => (t.id === draggingToken ? newToken : t)),
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggingToken) {
      const token = mapState.tokens.find((t) => t.id === draggingToken);
      if (token) {
        onTokenMove?.(draggingToken, token.x, token.y);
      }
    }
    setDraggingToken(null);
    setDragStart(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, mapState.zoom * delta));

    setMapState((prev) => ({
      ...prev,
      zoom: newZoom,
    }));
  };

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
