// utils/map-engine.ts
// Sistema de mapa com grid, tokens, cálculo de áreas e detecção

export interface Token {
  id: string;
  characterId: number;
  x: number; // posição em pixels
  y: number;
  size: number; // raio em pixels
  name: string;
  color: string;
  image?: string;
  hp: number;
  maxHp: number;
  isMonster: boolean;
}

export interface MapState {
  width: number;
  height: number;
  gridSize: number; // pixels por quadrado (ex: 40px = 5 pés)
  offsetX: number; // viewport offset
  offsetY: number;
  zoom: number; // 0.5 a 3.0
  tokens: Token[];
  selectedTokenId?: string;
  previewArea?: SpellPreview;
}

export interface SpellPreview {
  centerX: number;
  centerY: number;
  radius: number; // em pixels
  format: "esfera" | "cone" | "linha" | "alvo";
  angle?: number; // para cone/linha
  affectedTokens: string[]; // IDs dos tokens atingidos
}

export interface GridPosition {
  gridX: number;
  gridY: number;
}

// ===== CONVERSÕES =====

/**
 * Converte pixels para posição no grid
 * Ex: 200px, gridSize 40 = 5 quadrados
 */
export function pixelsToGrid(pixels: number, gridSize: number): number {
  return Math.round(pixels / gridSize);
}

/**
 * Converte grid para pixels
 */
export function gridToPixels(gridPos: number, gridSize: number): number {
  return gridPos * gridSize;
}

/**
 * Arredonda pixel position ao grid mais próximo
 */
export function snapToGrid(pixels: number, gridSize: number): number {
  return Math.round(pixels / gridSize) * gridSize;
}

/**
 * Distância entre dois pontos em pixels
 */
export function distancePixels(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Distância entre dois pontos no grid
 * Usa distância Euclidiana
 */
export function distanceGrid(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  gridSize: number
): number {
  const dx = pixelsToGrid(x2 - x1, gridSize);
  const dy = pixelsToGrid(y2 - y1, gridSize);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distância em linha reta (Manhattan/Chebyshev)
 * Para movimento em diagonal sem penalidade
 */
export function distanceChebyshev(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  gridSize: number
): number {
  const dx = Math.abs(pixelsToGrid(x2 - x1, gridSize));
  const dy = Math.abs(pixelsToGrid(y2 - y1, gridSize));
  return Math.max(dx, dy);
}

// ===== DETECÇÃO DE TOKENS =====

/**
 * Detecta tokens dentro de uma área de efeito (esfera)
 */
export function detectTokensInSphere(
  tokens: Token[],
  centerX: number,
  centerY: number,
  radiusPixels: number
): Token[] {
  return tokens.filter((token) => {
    const dist = distancePixels(centerX, centerY, token.x, token.y);
    return dist <= radiusPixels + token.size;
  });
}

/**
 * Detecta tokens em um cone
 * @param angle ângulo em graus (0-360)
 * @param width largura do cone em graus (ex: 60 para cone D&D)
 */
export function detectTokensInCone(
  tokens: Token[],
  centerX: number,
  centerY: number,
  radiusPixels: number,
  angle: number,
  width: number = 60
): Token[] {
  return tokens.filter((token) => {
    const dist = distancePixels(centerX, centerY, token.x, token.y);
    if (dist > radiusPixels) return false;

    // Calcular ângulo do token em relação ao centro
    const dx = token.x - centerX;
    const dy = token.y - centerY;
    const tokenAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Normalizar ângulos pra comparar
    const angleNorm = ((angle + 360) % 360);
    const tokenAngleNorm = ((tokenAngle + 360) % 360);
    const halfWidth = width / 2;

    // Verificar se token está dentro do cone
    let angleDiff = Math.abs(tokenAngleNorm - angleNorm);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    return angleDiff <= halfWidth;
  });
}

/**
 * Detecta tokens em uma linha
 * @param angle ângulo da linha em graus
 * @param widthPixels espessura da linha em pixels
 */
export function detectTokensInLine(
  tokens: Token[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  widthPixels: number = 20
): Token[] {
  return tokens.filter((token) => {
    // Distância do ponto à linha
    const dist = pointToLineDistance(
      token.x,
      token.y,
      startX,
      startY,
      endX,
      endY
    );
    return dist <= widthPixels + token.size;
  });
}

/**
 * Detecta tokens em um cilindro (coluna retangular)
 */
export function detectTokensInCylinder(
  tokens: Token[],
  centerX: number,
  centerY: number,
  widthPixels: number,
  heightPixels: number
): Token[] {
  return tokens.filter((token) => {
    const dx = Math.abs(token.x - centerX);
    const dy = Math.abs(token.y - centerY);
    return dx <= widthPixels / 2 + token.size && dy <= heightPixels / 2 + token.size;
  });
}

/**
 * Detecta tokens em um alvo único
 */
export function detectTokensInTarget(
  tokens: Token[],
  targetX: number,
  targetY: number,
  tolerance: number = 20
): Token[] {
  return tokens.filter((token) => {
    const dist = distancePixels(targetX, targetY, token.x, token.y);
    return dist <= tolerance + token.size;
  });
}

// ===== GEOMETRIA =====

/**
 * Distância de um ponto a uma linha
 * Usa a fórmula do ponto-linha mais próximo
 */
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Detecta se dois tokens se colidem
 */
export function tokensCollide(token1: Token, token2: Token): boolean {
  const dist = distancePixels(token1.x, token1.y, token2.x, token2.y);
  return dist < token1.size + token2.size;
}

/**
 * Encontra espaço vazio próximo pra mover token
 * (usado quando token colide e precisa se afastar)
 */
export function findNearbySpace(
  token: Token,
  tokens: Token[],
  maxDistance: number = 100,
  step: number = 10
): { x: number; y: number } | null {
  for (let angle = 0; angle < 360; angle += 30) {
    for (let dist = step; dist <= maxDistance; dist += step) {
      const rad = (angle * Math.PI) / 180;
      const testX = token.x + Math.cos(rad) * dist;
      const testY = token.y + Math.sin(rad) * dist;

      const testToken = { ...token, x: testX, y: testY };
      const collides = tokens.some((t) => t.id !== token.id && tokensCollide(testToken, t));

      if (!collides) {
        return { x: testX, y: testY };
      }
    }
  }

  return null;
}

// ===== VIEWPORT =====

/**
 * Calcula qual é a melhor posição de câmera pra ver todos os tokens
 */
export function calculateFitViewport(
  tokens: Token[],
  mapWidth: number,
  mapHeight: number,
  padding: number = 50
): { offsetX: number; offsetY: number; zoom: number } {
  if (tokens.length === 0) {
    return { offsetX: 0, offsetY: 0, zoom: 1 };
  }

  let minX = tokens[0].x;
  let maxX = tokens[0].x;
  let minY = tokens[0].y;
  let maxY = tokens[0].y;

  tokens.forEach((token) => {
    minX = Math.min(minX, token.x - token.size);
    maxX = Math.max(maxX, token.x + token.size);
    minY = Math.min(minY, token.y - token.size);
    maxY = Math.max(maxY, token.y + token.size);
  });

  const contentWidth = maxX - minX + padding * 2;
  const contentHeight = maxY - minY + padding * 2;

  const zoomX = mapWidth / contentWidth;
  const zoomY = mapHeight / contentHeight;
  const zoom = Math.min(zoomX, zoomY, 1);

  const offsetX = (mapWidth - contentWidth * zoom) / 2 - minX * zoom;
  const offsetY = (mapHeight - contentHeight * zoom) / 2 - minY * zoom;

  return { offsetX, offsetY, zoom };
}

// ===== INTERPOLAÇÃO (para animações) =====

/**
 * Interpola posição de token entre dois pontos
 * t = 0 a 1 (0 = início, 1 = fim)
 */
export function interpolatePosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
): { x: number; y: number } {
  return {
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t,
  };
}
