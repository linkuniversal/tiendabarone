/**
 * js/main.js
 * Tienda Barone · Bootstrap ES Module.
 */

import { EngineDirector } from './engine/director.js?v=3';
import { initVideoBoomerang } from './engine/video-boomerang.js?v=3';
import { initDomController } from './ui/dom-controller.js?v=4';

function bootstrap() {
  const director = new EngineDirector();

  initVideoBoomerang();
  initDomController(director);

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf !== null) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      director.triggerResizeAll();
    });
  }, { passive: true });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
