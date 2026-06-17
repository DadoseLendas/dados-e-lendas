'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Token, MapState, SpellPreview, distancePixels, snapToGrid, calculateFitViewport } from '@/utils/map-engine';

interface UseMapCanvasOptions {
  tokens: Token[];
  width: number;
  height: number;
  gridSize?: number;
  onTokenMove?: (tokenId: string, x: number, y: number) => void;
  onTokenSelect?: (tokenId: string | undefined) => void;
  selectedTokenId?: string;
  previewArea?: SpellPreview;
  readOnly?: boolean;
}

export function useMapCanvas({
  tokens,
  width,
  height,
  gridSize = 40,
  onTokenMove,
  onTokenSelect,
  selectedTokenId,
  previewArea,
  readOnly = false,
}: UseMapCanvasOptions) {
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

  useEffect(() => {
    setMapState((prev) => ({
      ...prev,
      tokens,
      selectedTokenId,
      previewArea,
    }));
  }, [tokens, selectedTokenId, previewArea]);

  useEffect(() => {
    if (tokens.length > 0) {
      const fit = calculateFitViewport(tokens, width, height);
      setMapState((prev) => ({
        ...prev,
        ...fit,
      }));
    }
  }, [tokens.length, width, height]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const { offsetX, offsetY, zoom } = mapState;
      return {
        x: (screenX - offsetX) / zoom,
        y: (screenY - offsetY) / zoom,
      };
    },
    [mapState]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);

      const clickedToken = mapState.tokens.find((token) => {
        const dist = distancePixels(world.x, world.y, token.x, token.y);
        return dist <= token.size;
      });

      if (clickedToken) {
        setDraggingToken(clickedToken.id);
        setDragStart(world);
        onTokenSelect?.(clickedToken.id);
      } else {
        onTokenSelect?.(undefined);
      }
    },
    [readOnly, canvasRef, screenToWorld, mapState.tokens, onTokenSelect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingToken || !dragStart || readOnly) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);

      const snappedX = snapToGrid(world.x, mapState.gridSize);
      const snappedY = snapToGrid(world.y, mapState.gridSize);

      const token = mapState.tokens.find((t) => t.id === draggingToken);
      if (token) {
        const newToken = { ...token, x: snappedX, y: snappedY };
        setMapState((prev) => ({
          ...prev,
          tokens: prev.tokens.map((t) =>
            t.id === draggingToken ? newToken : t
          ),
        }));
      }
    },
    [draggingToken, dragStart, readOnly, canvasRef, screenToWorld, mapState.tokens, mapState.gridSize]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingToken) {
      const token = mapState.tokens.find((t) => t.id === draggingToken);
      if (token) {
        onTokenMove?.(draggingToken, token.x, token.y);
      }
    }
    setDraggingToken(null);
    setDragStart(null);
  }, [draggingToken, mapState.tokens, onTokenMove]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, mapState.zoom * delta));

    setMapState((prev) => ({
      ...prev,
      zoom: newZoom,
    }));
  }, [mapState.zoom]);

  return {
    mapState,
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
}
