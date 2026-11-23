/**
 * js/engine/video-boomerang.js
 * Motor de video boomerang interactivo y liviano (sin congelamiento en móviles).
 * 
 * Invariantes de rendimiento:
 *   1. Hardware Decoder Guard: Pausa estricta de videos fuera de viewport (IntersectionObserver).
 *   2. Zero-Blackout Loop: Elimina la pausa negra típica de HTML5 video al reiniciar el bucle.
 *   3. Touch Scrubbing: Al arrastrar el dedo sobre la tarjeta, hace vaivén fluido (boomerang táctil).
 *   4. Low-Power Fallback: Si el móvil bloquea el autoplay, mantiene el poster WebP nítido.
 */

import { clamp } from './math.js';

export function initVideoBoomerang(director) {
  const videos = Array.from(document.querySelectorAll('.boomerang-video'));
  if (videos.length === 0) return;

  const videoStates = new Map();

  // Configuración inicial de atributos universales para móviles
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');

    const card = v.closest('.motion-asset-card');

    const stateObj = {
      video: v,
      card,
      isVisible: false,
      isDragging: false,
      dragStartX: 0,
      dragStartTime: 0,
      duration: 3.0,
      isLoaded: false,
    };

    videoStates.set(v, stateObj);

    v.addEventListener('loadedmetadata', () => {
      stateObj.duration = Math.max(0.5, v.duration || 3.0);
      stateObj.isLoaded = true;
    });

    // Eliminador del parpadeo negro entre loops
    v.addEventListener('timeupdate', () => {
      if (stateObj.isDragging) return;
      // 60ms antes de que termine el clip, reinicia al primer milisegundo de forma invisible
      if (v.duration && v.currentTime >= v.duration - 0.06) {
        v.currentTime = 0.001;
      }
    });

    // Soporte táctil / pointer para vaivén manual tipo boomerang
    if (card) {
      card.addEventListener('pointerdown', (e) => {
        stateObj.isDragging = true;
        stateObj.dragStartX = e.clientX;
        stateObj.dragStartTime = v.currentTime;
        try { v.pause(); } catch (_) {}
      }, { passive: true });

      window.addEventListener('pointermove', (e) => {
        if (!stateObj.isDragging) return;
        const deltaX = e.clientX - stateObj.dragStartX;
        const spanSec = stateObj.duration;
        // 180px de arrastre equivalen a todo el video de 3 segundos
        const offset = (deltaX / 180.0) * spanSec;
        const targetTime = clamp(stateObj.dragStartTime + offset, 0.001, spanSec - 0.05);
        v.currentTime = targetTime;
      }, { passive: true });

      const stopDrag = () => {
        if (!stateObj.isDragging) return;
        stateObj.isDragging = false;
        if (stateObj.isVisible) {
          v.play().catch(() => {});
        }
      };

      window.addEventListener('pointerup', stopDrag, { passive: true });
      window.addEventListener('pointercancel', stopDrag, { passive: true });
    }
  }

  // Observer de visibilidad: SOLO decodifica el video visible en pantalla
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const v = entry.target;
          const st = videoStates.get(v);
          if (!st) continue;

          st.isVisible = entry.isIntersecting;

          if (st.isVisible) {
            // Reproduce con captura de promesa para evitar excepciones de autoplay
            const playPromise = v.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // Si el dispositivo tiene modo ahorro de batería, mantiene el poster WebP
              });
            }
          } else {
            v.pause();
          }
        }
      },
      { threshold: 0.25, rootMargin: '40px 0px' }
    );

    for (let i = 0; i < videos.length; i++) {
      videoObserver.observe(videos[i]);
    }
  } else {
    // Fallback básico para navegadores muy antiguos
    for (let i = 0; i < videos.length; i++) {
      videos[i].play().catch(() => {});
    }
  }

  // Registro en el Director para pausar si la pestaña se oculta
  director.register({
    id: 'video-boomerang-manager',
    element: null,
    minIntervalMs: 0,
    onTick: () => {
      if (document.hidden) {
        for (let i = 0; i < videos.length; i++) {
          if (!videos[i].paused) videos[i].pause();
        }
      }
    },
  });
}
