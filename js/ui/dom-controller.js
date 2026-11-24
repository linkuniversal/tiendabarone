/**
 * js/ui/dom-controller.js
 * Controlador integral:
 *  1. Horarios útiles dinámicos en Showrooms Oficiales.
 *  2. Showrooms & Google Maps embebido (Lomas de Zamora / Adrogué).
 *  3. Galería Cinética 3D (touch nativo en móvil + drag con mouse en PC + flechas ‹ › + parallax).
 *  4. Studio Lightbox Modal para ampliar fotos y videos sin salir de la página.
 *  5. Botón flotante de WhatsApp diferido tras pasar hacia abajo el botón principal.
 */

import {
  BRAND_DATA,
  BARONE_EVENTS,
  state,
  emitEvent,
  evaluateStoreOpenStatus,
} from '../contract.js?v=4';
import { clamp, createSpringState, stepSpring } from '../engine/math.js?v=3';

function triggerHaptic() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(8); } catch (_) {}
  }
}

export function initDomController(director) {
  const liveStatusBeacon = document.getElementById('liveStatusBeacon');
  const hoursTagToday = document.getElementById('hoursTagToday');

  const activeBranchSub = document.getElementById('activeBranchSub');
  const branchMapFrame = document.getElementById('branchMapFrame');
  const branchActionsRow = document.getElementById('branchActionsRow');
  const branchTabs = Array.from(document.querySelectorAll('.branch-tab-btn'));

  const scheduleRowWeek = document.getElementById('scheduleRowWeek');
  const scheduleRowSat = document.getElementById('scheduleRowSat');
  const scheduleRowSun = document.getElementById('scheduleRowSun');
  const brandLogoTrigger = document.getElementById('brandLogoTrigger');

  const heroWhatsAppBtn = document.getElementById('heroWhatsAppBtn');
  const floatingWaBtn = document.getElementById('floatingWaBtn');

  // Elementos del Studio Lightbox
  const studioLightbox = document.getElementById('studioLightbox');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn = document.getElementById('lightboxNextBtn');
  const lightboxMediaSlot = document.getElementById('lightboxMediaSlot');
  const lightboxViewport = document.getElementById('lightboxViewport');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxTag = document.getElementById('lightboxTag');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxSub = document.getElementById('lightboxSub');
  const lightboxWaBtn = document.getElementById('lightboxWaBtn');

  const domCache = {
    branchId: '',
    showroomScheduleText: '',
    isOpen: null,
  };

  /* ========================================================================
     1. HORARIOS ÚTILES EN VIVO (EN CABECERA DE SHOWROOMS)
     ======================================================================== */
  function updateScheduleStatus() {
    const status = evaluateStoreOpenStatus(new Date());
    state.isOpenNow = status.isOpen;

    if (liveStatusBeacon && domCache.isOpen !== status.isOpen) {
      domCache.isOpen = status.isOpen;
      liveStatusBeacon.style.background = status.isOpen ? '#22C55E' : '#E2A33A';
      liveStatusBeacon.style.boxShadow = status.isOpen
        ? '0 0 8px #22C55E'
        : '0 0 8px rgba(226, 163, 58, 0.55)';
    }

    if (hoursTagToday && status.showroomScheduleText !== domCache.showroomScheduleText) {
      domCache.showroomScheduleText = status.showroomScheduleText;
      hoursTagToday.textContent = status.showroomScheduleText;
    }

    scheduleRowWeek?.classList.toggle('is-today', status.isWeekday);
    scheduleRowSat?.classList.toggle('is-today', status.isSaturday);
    scheduleRowSun?.classList.toggle('is-today', status.isSunday);

    emitEvent(BARONE_EVENTS.STATUS_TICK, { isOpen: status.isOpen });
  }

  /* ========================================================================
     2. SHOWROOMS & MAPA GOOGLE EMBEBIDO (LOMAS / ADROGUÉ)
     ======================================================================== */
  function renderBranch(branchId) {
    const branch = BRAND_DATA.branches[branchId] || BRAND_DATA.branches.lomas;
    if (branch.id === domCache.branchId) return;

    domCache.branchId = branch.id;
    state.activeBranch = branch.id;

    if (activeBranchSub) {
      activeBranchSub.textContent = branch.addressFull;
    }

    if (branchMapFrame && branchMapFrame.getAttribute('src') !== branch.embedUrl) {
      branchMapFrame.setAttribute('src', branch.embedUrl);
      branchMapFrame.setAttribute('title', `Ubicación Showroom ${branch.name} en Google Maps`);
    }

    if (branchActionsRow) {
      const waMsg = encodeURIComponent(`¡Hola Tienda Barone! Quisiera consultar por la sucursal de ${branch.name}.`);
      branchActionsRow.innerHTML = `
        <a href="${branch.mapsUrl}" target="_blank" rel="noopener noreferrer" class="atelier-open-directions">
          <span>Abrir en Google Maps</span>
          <span aria-hidden="true">↗</span>
        </a>
        <a href="https://wa.me/${BRAND_DATA.contact.whatsappNumber}?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="atelier-open-directions">
          <span>Consultar ${branch.shortLabel}</span>
          <span aria-hidden="true">↗</span>
        </a>
      `;
    }

    for (let i = 0; i < branchTabs.length; i++) {
      const tab = branchTabs[i];
      const isMatch = tab.getAttribute('data-branch') === branch.id;
      tab.classList.toggle('active', isMatch);
      tab.setAttribute('aria-selected', String(isMatch));
    }

    emitEvent(BARONE_EVENTS.BRANCH_CHANGED, { branchId: branch.id });
  }

  /* ========================================================================
     3. CARRUSELES CINÉTICOS 3D (TOUCH NATIVO + DRAG MOUSE EN PC + PARALLAX)
     ======================================================================== */
  function initKineticCarousel({ trackId, counterId, progressId, is3DPhotos = false }) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const cards = Array.from(track.children);
    const counterEl = document.getElementById(counterId);
    const progressEl = document.getElementById(progressId);
    const total = cards.length;
    if (total === 0) return;

    let rafUpdate = null;
    let isMouseDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasDragged = false;

    function updateMetrics() {
      rafUpdate = null;
      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width * 0.5;
      const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);

      let closestIdx = 0;
      let closestDist = Infinity;

      for (let i = 0; i < total; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width * 0.5;
        const dist = cardCenter - trackCenter;
        const absDist = Math.abs(dist);

        if (absDist < closestDist) {
          closestDist = absDist;
          closestIdx = i;
        }

        if (is3DPhotos && !director.reducedMotion) {
          const norm = clamp(dist / Math.max(240, trackRect.width * 0.65), -1, 1);
          const scale = 1 - Math.abs(norm) * 0.055;
          const rotY = -norm * 7.5;
          const transY = Math.abs(norm) * 5;
          card.style.transform = `scale(${scale.toFixed(3)}) rotateY(${rotY.toFixed(2)}deg) translateY(${transY.toFixed(1)}px)`;

          const img = card.querySelector('.kinetic-parallax-img');
          if (img) {
            const shift = -norm * 10;
            img.style.transform = `scale(1.10) translateX(${shift.toFixed(1)}px)`;
          }
        }
      }

      if (track.scrollLeft <= 4) closestIdx = 0;
      else if (maxScroll > 4 && track.scrollLeft >= maxScroll - 4) closestIdx = total - 1;

      for (let i = 0; i < total; i++) {
        cards[i].classList.toggle('is-focal', i === closestIdx);
      }

      if (counterEl) {
        const cur = String(closestIdx + 1).padStart(2, '0');
        const tot = String(total).padStart(2, '0');
        counterEl.textContent = `${cur} / ${tot}`;
      }

      if (progressEl) {
        const pct = maxScroll > 2
          ? clamp((track.scrollLeft / maxScroll) * 100, 12, 100)
          : 100;
        progressEl.style.width = `${pct.toFixed(1)}%`;
      }
    }

    function scheduleUpdate() {
      if (rafUpdate === null) {
        rafUpdate = requestAnimationFrame(updateMetrics);
      }
    }

    track.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      isMouseDown = true;
      startX = e.clientX;
      startScrollLeft = track.scrollLeft;
      hasDragged = false;
      track.classList.add('is-dragging');
    });

    track.addEventListener('pointermove', (e) => {
      if (!isMouseDown || e.pointerType !== 'mouse') return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 7) {
        hasDragged = true;
      }
      if (hasDragged) {
        track.scrollLeft = startScrollLeft - dx;
      }
    });

    const endMouseDrag = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      track.classList.remove('is-dragging');
      if (hasDragged) {
        track.dataset.suppressClickUntil = String(performance.now() + 180);
      }
    };

    track.addEventListener('pointerup', endMouseDrag);
    track.addEventListener('pointercancel', endMouseDrag);
    track.addEventListener('mouseleave', endMouseDrag);

    updateMetrics();
  }

  /* ========================================================================
     4. STUDIO LIGHTBOX VIEWER (FOTOS & VIDEOS SIN SALIR DE LA WEB)
     ======================================================================== */
  const lbState = {
    isOpen: false,
    group: 'photos',
    index: 0,
    lastFocusedEl: null,
  };

  function renderLightboxItem() {
    const items = BRAND_DATA.lightboxMedia[lbState.group] || [];
    if (items.length === 0) return;

    const total = items.length;
    lbState.index = ((lbState.index % total) + total) % total;
    const item = items[lbState.index];

    if (lightboxCounter) {
      lightboxCounter.textContent = `${String(lbState.index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }
    if (lightboxTag) lightboxTag.textContent = item.tag;
    if (lightboxTitle) lightboxTitle.textContent = item.title;
    if (lightboxSub) lightboxSub.textContent = item.subtitle;

    if (lightboxWaBtn) {
      const msg = encodeURIComponent(`¡Hola Tienda Barone! Quisiera consultar por: ${item.title} (${item.tag}).`);
      lightboxWaBtn.href = `https://wa.me/${BRAND_DATA.contact.whatsappNumber}?text=${msg}`;
    }

    if (lightboxMediaSlot) {
      lightboxMediaSlot.innerHTML = '';
      if (item.type === 'video') {
        const vid = document.createElement('video');
        vid.src = item.src;
        if (item.poster) vid.poster = item.poster;
        vid.controls = true;
        vid.autoplay = true;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        lightboxMediaSlot.appendChild(vid);
        vid.play().catch(() => {});
      } else {
        const img = document.createElement('img');
        img.src = item.src;
        img.alt = `${item.title} · Tienda Barone`;
        lightboxMediaSlot.appendChild(img);
      }
    }
  }

  function openLightbox(group, index, triggerEl = null) {
    if (!studioLightbox) return;
    lbState.lastFocusedEl = triggerEl || document.activeElement;
    lbState.group = group;
    lbState.index = index;
    lbState.isOpen = true;

    renderLightboxItem();
    studioLightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightboxCloseBtn?.focus();
    triggerHaptic();
  }

  function closeLightbox() {
    if (!studioLightbox || !lbState.isOpen) return;
    lbState.isOpen = false;
    studioLightbox.hidden = true;
    document.body.style.overflow = '';

    if (lightboxMediaSlot) {
      const activeVid = lightboxMediaSlot.querySelector('video');
      if (activeVid) activeVid.pause();
      lightboxMediaSlot.innerHTML = '';
    }

    if (lbState.lastFocusedEl && typeof lbState.lastFocusedEl.focus === 'function') {
      lbState.lastFocusedEl.focus();
    }
  }

  function stepLightbox(delta) {
    if (!lbState.isOpen) return;
    lbState.index += delta;
    renderLightboxItem();
    triggerHaptic();
  }

  /* ========================================================================
     5. BOTÓN FLOTANTE DIFERIDO (SOLO APARECE AL PASAR EL BOTÓN HERO HACIA ABAJO)
     ======================================================================== */
  function initDeferredFloatingWhatsApp() {
    if (!heroWhatsAppBtn || !floatingWaBtn) return;

    let checkRaf = null;
    function checkPosition() {
      checkRaf = null;
      const rect = heroWhatsAppBtn.getBoundingClientRect();
      // Solo visible cuando el botón principal ya quedó arriba fuera de pantalla
      const passedHero = rect.bottom < 16 && window.scrollY > 40;
      floatingWaBtn.classList.toggle('is-visible', passedHero);
    }

    function scheduleCheck() {
      if (checkRaf === null) {
        checkRaf = requestAnimationFrame(checkPosition);
      }
    }

    window.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck, { passive: true });
    checkPosition();
  }

  /* ========================================================================
     6. FÍSICA DE RESORTE EN CARDS BENTO (DESKTOP)
     ======================================================================== */
  function initBentoSprings() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = Array.from(document.querySelectorAll('.bento-card, .btn-whatsapp-primary'));
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const springX = createSpringState(0.0);
      const springY = createSpringState(0.0);
      let targetX = 0.0;
      let targetY = 0.0;
      let isHovered = false;

      card.addEventListener('pointermove', (e) => {
        isHovered = true;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        targetX = px * 4.0;
        targetY = -py * 4.0;
        director.requestWake();
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        isHovered = false;
        targetX = 0.0;
        targetY = 0.0;
        director.requestWake();
      }, { passive: true });

      director.register({
        id: `bento-tilt-${i}`,
        element: card,
        onTick: (dt) => {
          const settled =
            !isHovered &&
            Math.abs(springX.val) < 0.01 &&
            Math.abs(springY.val) < 0.01 &&
            Math.abs(springX.vel) < 0.01 &&
            Math.abs(springY.vel) < 0.01;

          if (settled) {
            springX.val = 0;
            springX.vel = 0;
            springY.val = 0;
            springY.vel = 0;
            if (card.style.transform !== '') card.style.transform = '';
            return false;
          }

          const curX = stepSpring(springX, targetX, dt, { wn: 14.0, zeta: 0.80 });
          const curY = stepSpring(springY, targetY, dt, { wn: 14.0, zeta: 0.80 });
          card.style.transform = `perspective(900px) rotateY(${curX.toFixed(2)}deg) rotateX(${curY.toFixed(2)}deg) translateY(-2px)`;
          return true;
        },
      });
    }
  }

  /* ========================================================================
     7. BINDING DE EVENTOS
     ======================================================================== */
  function bindEvents() {
    for (let i = 0; i < branchTabs.length; i++) {
      branchTabs[i].addEventListener('click', (e) => {
        const branchId = e.currentTarget.getAttribute('data-branch');
        if (branchId) {
          triggerHaptic();
          renderBranch(branchId);
          emitEvent(BARONE_EVENTS.UI_CLICK);
        }
      });
    }

    const navBtns = Array.from(document.querySelectorAll('.carousel-nav-btn'));
    for (let i = 0; i < navBtns.length; i++) {
      navBtns[i].addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const targetId = btn.getAttribute('data-carousel-target');
        const dir = Number(btn.getAttribute('data-dir')) || 1;
        const track = targetId ? document.getElementById(targetId) : null;
        if (!track) return;

        const firstCard = track.firstElementChild;
        const step = firstCard ? firstCard.getBoundingClientRect().width + 14 : 260;
        track.scrollBy({ left: dir * step, behavior: 'smooth' });
        triggerHaptic();
      });
    }

    const lightboxTriggers = Array.from(document.querySelectorAll('[data-lightbox-group]'));
    for (let i = 0; i < lightboxTriggers.length; i++) {
      lightboxTriggers[i].addEventListener('click', (e) => {
        const card = e.currentTarget;
        const track = card.parentElement;
        const suppressUntil = Number(track?.dataset?.suppressClickUntil || 0);
        if (performance.now() < suppressUntil) {
          e.preventDefault();
          return;
        }
        const group = card.getAttribute('data-lightbox-group') || 'photos';
        const idx = Number(card.getAttribute('data-lightbox-index')) || 0;
        openLightbox(group, idx, card);
      });
    }

    lightboxCloseBtn?.addEventListener('click', closeLightbox);
    lightboxBackdrop?.addEventListener('click', closeLightbox);
    lightboxPrevBtn?.addEventListener('click', () => stepLightbox(-1));
    lightboxNextBtn?.addEventListener('click', () => stepLightbox(1));

    let lbTouchX = 0;
    lightboxViewport?.addEventListener('touchstart', (e) => {
      lbTouchX = e.changedTouches[0]?.clientX || 0;
    }, { passive: true });
    lightboxViewport?.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0]?.clientX || 0;
      const diff = endX - lbTouchX;
      if (Math.abs(diff) > 45) {
        stepLightbox(diff < 0 ? 1 : -1);
      }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (!lbState.isOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });

    const scrollTop = () => {
      triggerHaptic();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    brandLogoTrigger?.addEventListener('click', scrollTop);
    brandLogoTrigger?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollTop();
      }
    });

    heroWhatsAppBtn?.addEventListener('click', triggerHaptic);
    floatingWaBtn?.addEventListener('click', triggerHaptic);

    setInterval(() => {
      if (!document.hidden) updateScheduleStatus();
    }, 60000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateScheduleStatus();
    });
  }

  renderBranch('lomas');
  updateScheduleStatus();
  bindEvents();

  initKineticCarousel({
    trackId: 'photoLookbookTrack',
    counterId: 'photoLookbookCounter',
    progressId: 'photoProgressFill',
    is3DPhotos: true,
  });

  initKineticCarousel({
    trackId: 'videoLookbookTrack',
    counterId: 'videoLookbookCounter',
    progressId: 'videoProgressFill',
    is3DPhotos: false,
  });

  initDeferredFloatingWhatsApp();
  initBentoSprings();

  return {
    renderBranch,
    updateScheduleStatus,
  };
}
