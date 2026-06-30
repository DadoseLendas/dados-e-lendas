'use client';
import { useEffect, useRef, useCallback } from 'react';
import type { FowConfig } from '@/features/mesa/hooks/useFogOfWar';

interface FogOfWarLayerProps {
  hiddenCells: Set<string>;
  gridSize: number;
  mapWidth: number;
  mapHeight: number;
  fowConfig: FowConfig;
  isDM: boolean;
  fogActive: boolean;
  onFogPaint?: (col: number, row: number) => void;
  onFogPaintEnd?: () => void;
}

export default function FogOfWarLayer({
  hiddenCells, gridSize, mapWidth, mapHeight,
  fowConfig, isDM, fogActive, onFogPaint, onFogPaintEnd,
}: FogOfWarLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPainting = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = Math.max(1, mapWidth);
    const h = Math.max(1, mapHeight);
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    if (!fowConfig.enabled || hiddenCells.size === 0) return;

    const { style, gray_opacity, desaturated_blur_radius } = fowConfig;

    if (style === 'desaturated_blur') {
      ctx.save();
      ctx.filter = `blur(${desaturated_blur_radius}px) grayscale(1)`;
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = 'rgb(30, 30, 30)';
      hiddenCells.forEach(key => {
        const [col, row] = key.split(',').map(Number);
        ctx.fillRect(col * gridSize, row * gridSize, gridSize + 1, gridSize + 1);
      });
      ctx.restore();
    } else {
      const alpha = style === 'black' ? 1 : gray_opacity;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgb(0, 0, 0)';
      hiddenCells.forEach(key => {
        const [col, row] = key.split(',').map(Number);
        ctx.fillRect(col * gridSize, row * gridSize, gridSize + 1, gridSize + 1);
      });
      ctx.restore();
    }

    if (isDM && fogActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,102,0.3)';
      ctx.lineWidth = 1;
      hiddenCells.forEach(key => {
        const [col, row] = key.split(',').map(Number);
        const neighbors: [number, number, number, number, number, number][] = [
          [col-1, row,  col*gridSize,        row*gridSize,        col*gridSize,        (row+1)*gridSize],
          [col+1, row,  (col+1)*gridSize,    row*gridSize,        (col+1)*gridSize,    (row+1)*gridSize],
          [col, row-1,  col*gridSize,        row*gridSize,        (col+1)*gridSize,    row*gridSize],
          [col, row+1,  col*gridSize,        (row+1)*gridSize,    (col+1)*gridSize,    (row+1)*gridSize],
        ];
        neighbors.forEach(([nc, nr, x1, y1, x2, y2]) => {
          if (!hiddenCells.has(`${nc},${nr}`)) {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        });
      });
      ctx.restore();
    }
  }, [hiddenCells, gridSize, fowConfig, isDM, fogActive, mapWidth, mapHeight]);

  const getCell = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const col = Math.floor((e.clientX - rect.left) * scaleX / gridSize);
    const row = Math.floor((e.clientY - rect.top) * scaleY / gridSize);
    return { col, row };
  }, [gridSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDM || !fogActive || !onFogPaint) return;
    e.preventDefault(); e.stopPropagation();
    isPainting.current = true;
    const cell = getCell(e);
    if (cell) onFogPaint(cell.col, cell.row);
  }, [isDM, fogActive, onFogPaint, getCell]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting.current || !onFogPaint) return;
    e.preventDefault();
    const cell = getCell(e);
    if (cell) onFogPaint(cell.col, cell.row);
  }, [onFogPaint, getCell]);

  const handleMouseUp = useCallback(() => {
    isPainting.current = false;
    onFogPaintEnd?.();
  }, [onFogPaintEnd]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: (isDM && fogActive) ? 'auto' : 'none',
        zIndex: 30,
        cursor: isDM && fogActive ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}