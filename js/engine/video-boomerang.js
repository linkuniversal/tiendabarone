/**
 * js/engine/video-boomerang.js
 * Reproducción continua eficiente protegida por viewport.
 * - Loop nativo (cero tirones en WebViews móviles).
 * - Pausa automática fuera de pantalla y cuando se oculta la pestaña.
 */

export function initVideoBoomerang() {
  const videos = Array.from(document.querySelectorAll('.boomerang-video'));
  if (videos.length === 0) return;

  const visibilityMap = new Map();

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.loop = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');
    visibilityMap.set(v, false);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const v = entry.target;
          const isVis = entry.isIntersecting;
          visibilityMap.set(v, isVis);

          if (isVis && !document.hidden) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { threshold: 0.20, rootMargin: '60px 0px' }
    );

    for (let i = 0; i < videos.length; i++) {
      observer.observe(videos[i]);
    }
  } else {
    for (let i = 0; i < videos.length; i++) {
      videos[i].play().catch(() => {});
    }
  }

  document.addEventListener('visibilitychange', () => {
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (document.hidden) {
        if (!v.paused) v.pause();
      } else if (visibilityMap.get(v)) {
        v.play().catch(() => {});
      }
    }
  });
}
