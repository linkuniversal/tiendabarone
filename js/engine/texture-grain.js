/**
 * js/engine/texture-grain.js
 * Generador procedural de trama analógica de madera/textil en memoria.
 * Construye un micro-patrón repetible mediante createMulberry32 en canvas 2D.
 * CERO costo de CPU en scroll (a diferencia de los filtros SVG feTurbulence).
 */

import { createMulberry32 } from './math.js';

export function initTextureGrain(director) {
  const canvas = document.getElementById('grainCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const TILE_SIZE = 128;
  let patternCanvas = null;

  function generateTile() {
    if (typeof document === 'undefined') return null;
    const tile = document.createElement('canvas');
    tile.width = TILE_SIZE;
    tile.height = TILE_SIZE;
    const tCtx = tile.getContext('2d');
    if (!tCtx) return null;

    const imgData = tCtx.createImageData(TILE_SIZE, TILE_SIZE);
    const data = imgData.data;
    const rng = createMulberry32(0x351703);

    for (let i = 0; i < data.length; i += 4) {
      // Tono cálido oro-nogal con variaciones suaves de intensidad
      const v = Math.floor(180 + rng() * 75);
      data[i] = v;     // R
      data[i + 1] = v; // G
      data[i + 2] = v; // B
      data[i + 3] = Math.floor(rng() * 40 + 10); // Alpha sutil
    }
    tCtx.putImageData(imgData, 0, 0);
    return tile;
  }

  function paint() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    if (!patternCanvas) {
      patternCanvas = generateTile();
    }
    if (!patternCanvas) return;

    ctx.clearRect(0, 0, w, h);
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }
  }

  director.register({
    id: 'texture-grain',
    element: canvas,
    minIntervalMs: 0,
    onResize: paint,
    onTick: null, // Es estático: no recalcula en cada frame, ahorrando batería al 100%
  });
}
