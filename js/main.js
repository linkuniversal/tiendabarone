/**
 * js/main.js
 * Tienda Barone · Punto de entrada ES Module.
 * Conecta el Director de rendimiento, texturizado analógico en memoria,
 * videos boomerang sin lag y la interfaz de usuario.
 */

import { EngineDirector } from './engine/director.js';
import { initTextureGrain } from './engine/texture-grain.js';
import { initVideoBoomerang } from './engine/video-boomerang.js';
import { initDomController } from './ui/dom-controller.js';

function bootstrap() {
  const director = new EngineDirector();

  // 1. Textura analógica de madera/tiza generada una sola vez en memoria (GPU)
  initTextureGrain(director);

  // 2. Videos boomerang interactivos sincronizados con viewport
  initVideoBoomerang(director);

  // 3. Controlador de interfaz (sucursales, horarios en vivo y física de resorte)
  initDomController(director);

  // 4. Inicia el bucle maestro unificado con cálculo de deltaTime
  director.start();

  // Redimensionado protegido para móviles y rotación de pantalla
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) return;
    resizeTimer = requestAnimationFrame(() => {
      resizeTimer = null;
      director.triggerResizeAll();
    });
  }, { passive: true });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
