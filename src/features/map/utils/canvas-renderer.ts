'use client';

import { Token, MapState, SpellPreview } from '@/domain/map/map-engine';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  mapState: MapState,
  width: number,
  height: number
) {
  const { gridSize, offsetX, offsetY, zoom } = mapState;
  const scaledGridSize = gridSize * zoom;

  ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
  ctx.lineWidth = 1;

  let x = offsetX % scaledGridSize;
  while (x < width) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    x += scaledGridSize;
  }

  let y = offsetY % scaledGridSize;
  while (y < height) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    y += scaledGridSize;
  }
}

export function drawToken(
  ctx: CanvasRenderingContext2D,
  mapState: MapState,
  token: Token,
  selectedTokenId?: string
) {
  const { offsetX, offsetY, zoom } = mapState;
  const screenX = token.x * zoom + offsetX;
  const screenY = token.y * zoom + offsetY;
  const screenRadius = token.size * zoom;

  ctx.fillStyle = token.color || '#4a9eff';
  ctx.beginPath();
  ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = selectedTokenId === token.id ? '#ffff00' : '#333';
  ctx.lineWidth = selectedTokenId === token.id ? 3 : 2;
  ctx.stroke();

  const barWidth = screenRadius * 2;
  const barHeight = 8;
  const barY = screenY + screenRadius + 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

  const hpPercent = token.hp / token.maxHp;
  const hpColor = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
  ctx.fillStyle = hpColor;
  ctx.fillRect(screenX - barWidth / 2, barY, barWidth * hpPercent, barHeight);

  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(token.name, screenX, screenY + 5);
}

export function drawSpellPreview(
  ctx: CanvasRenderingContext2D,
  mapState: MapState,
  previewArea?: SpellPreview
) {
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
    const angle = previewArea.angle || 0;
    const angleRad = (angle * Math.PI) / 180;
    const coneWidth = 60;

    ctx.beginPath();
    ctx.moveTo(screenX, screenY);

    const startAngle = angleRad - (coneWidth / 2) * (Math.PI / 180);
    const endAngle = angleRad + (coneWidth / 2) * (Math.PI / 180);

    ctx.arc(screenX, screenY, screenRadius, startAngle, endAngle);
    ctx.lineTo(screenX, screenY);

    ctx.fill();
    ctx.stroke();
  } else if (previewArea.format === 'linha') {
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + screenRadius, screenY);
    ctx.lineWidth = 20;
    ctx.stroke();
  }

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
}

export function renderCanvas(
  canvas: HTMLCanvasElement,
  mapState: MapState,
  width: number,
  height: number,
  selectedTokenId?: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, mapState, width, height);

  drawSpellPreview(ctx, mapState, mapState.previewArea);

  mapState.tokens.forEach((token) => {
    drawToken(ctx, mapState, token, selectedTokenId);
  });
}