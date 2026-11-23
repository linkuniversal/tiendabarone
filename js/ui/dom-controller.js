/**
 * js/ui/dom-controller.js
 * Controlador de interfaz con dirty-checking domCache (ui.js de Pelican),
 * selector de sucursales (Lomas/Adrogué), validador horario oficial en tiempo real
 * y micro-inclinación física 3D con stepSpring en tarjetas.
 */

import {
  BRAND_DATA,
  BARONE_EVENTS,
  state,
  emitEvent,
  evaluateStoreOpenStatus,
} from '../contract.js';
import {
  createSpringState,
  stepSpring,
  clamp,
} from '../engine/math.js';

export function initDomController(director) {
  const themeSwitchBtn = document.getElementById('themeSwitchBtn');
  const themeSwitchLabel = document.getElementById('themeSwitchLabel');
  const liveStatusBeacon = document.getElementById('liveStatusBeacon');
  const liveStatusText = document.getElementById('liveStatusText');
  const hoursTagToday = document.getElementById('hoursTagToday');
  const branchDetailPanel = document.getElementById('branchDetailPanel');
  const scheduleRowWeek = document.getElementById('scheduleRowWeek');
  const scheduleRowSat = document.getElementById('scheduleRowSat');
  const brandLogoTrigger = document.getElementById('brandLogoTrigger');

  const branchTabs = Array.from(document.querySelectorAll('.branch-tab-btn'));

  // Dirty-checking cache para evitar reflows continuos en el DOM
  const domCache = {
    theme: '',
    branchId: '',
    isOpen: null,
    statusText: '',
    hoursTodayText: '',
  };

  /* ========================================================================
     1. HORARIOS OFICIALES EN TIEMPO REAL (LUN-VIE 10:30-13:30/14:30-18:30, SÁB 10-15)
     ======================================================================== */
  function updateScheduleStatus() {
    const status = evaluateStoreOpenStatus(new Date());
    state.isOpenNow = status.isOpen;

    if (liveStatusBeacon) {
      liveStatusBeacon.style.background = status.isOpen ? '#22C55E' : '#94A3B8';
      liveStatusBeacon.style.boxShadow = status.isOpen ? '0 0 8px #22C55E' : 'none';
    }

    if (liveStatusText && status.badgeText !== domCache.statusText) {
      domCache.statusText = status.badgeText;
      liveStatusText.textContent = status.badgeText;
    }

    if (hoursTagToday && status.scheduleTodayText !== domCache.hoursTodayText) {
      domCache.hoursTodayText = status.scheduleTodayText;
      hoursTagToday.textContent = status.scheduleTodayText;
    }

    if (scheduleRowWeek) {
      scheduleRowWeek.classList.toggle('is-today', status.isWeekday);
    }
    if (scheduleRowSat) {
      scheduleRowSat.classList.toggle('is-today', status.isSaturday);
    }

    emitEvent(BARONE_EVENTS.STATUS_TICK, { isOpen: status.isOpen });
  }

  /* ========================================================================
     2. GESTOR DE SUCURSALES (LOMAS DE ZAMORA / ADROGUÉ)
     ======================================================================== */
  function renderBranch(branchId) {
    if (branchId === domCache.branchId) return;
    domCache.branchId = branchId;
    state.activeBranch = branchId;

    const branch = BRAND_DATA.branches[branchId] || BRAND_DATA.branches.lomas;
    if (!branchDetailPanel) return;

    branchDetailPanel.innerHTML = `
      <div class="branch-name-title">${branch.name}</div>
      <div class="branch-address-text">${branch.addressFull}</div>
      <div class="branch-actions-row">
        <a href="${branch.mapsUrl}" target="_blank" rel="noopener noreferrer" class="branch-map-btn">
          <span>Abrir en Google Maps</span>
          <span>↗</span>
        </a>
        <a href="https://wa.me/${BRAND_DATA.contact.whatsappNumber}?text=${encodeURIComponent(`¡Hola Tienda Barone! Quisiera consultar por la sucursal de ${branch.name}.`)}" target="_blank" rel="noopener noreferrer" class="branch-map-btn">
          <span>Consultar Sucursal</span>
          <span>💬</span>
        </a>
      </div>
    `;

    for (let i = 0; i < branchTabs.length; i++) {
      const tab = branchTabs[i];
      const isActive = tab.getAttribute('data-branch') === branchId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    }

    emitEvent(BARONE_EVENTS.BRANCH_CHANGED, { branchId });
  }

  /* ========================================================================
     3. CAMBIADOR DE ACABADO DE COLOR (NOGAL PROFUNDO #351703 / MARFIL)
     ======================================================================== */
  function setTheme(nextTheme) {
    if (nextTheme === domCache.theme) return;
    domCache.theme = nextTheme;
    state.theme = nextTheme;

    document.body.setAttribute('data-theme', nextTheme);

    if (themeSwitchLabel) {
      themeSwitchLabel.textContent = nextTheme === 'walnut' ? 'Nogal Profundo' : 'Modo Marfil';
    }

    try {
      localStorage.setItem('barone_theme_pref', nextTheme);
    } catch (_) {}

    emitEvent(BARONE_EVENTS.THEME_CHANGED, { theme: nextTheme });
  }

  function toggleTheme() {
    const next = state.theme === 'walnut' ? 'chalk' : 'walnut';
    setTheme(next);
  }

  /* ========================================================================
     4. FÍSICA DE RESORTE SUAVE (stepSpring de kin.js) EN TARJETAS
     ======================================================================== */
  function initSpringTiltCards() {
    // Solo se activa en dispositivos con puntero fino (Desktop/Laptop) para cuidar la batería móvil
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = Array.from(document.querySelectorAll(
      '.bento-tile, .motion-asset-card, .gallery-item-card, .btn-whatsapp-hero'
    ));

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
        // Inclinación máxima de 6 grados y traslación sutil de 4px
        targetX = px * 8.0;
        targetY = -py * 8.0;
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        isHovered = false;
        targetX = 0.0;
        targetY = 0.0;
      }, { passive: true });

      director.register({
        id: `tilt-card-${i}`,
        element: card,
        minIntervalMs: 0,
        onTick: (dt) => {
          if (!isHovered && Math.abs(springX.val) < 0.01 && Math.abs(springY.val) < 0.01) {
            if (card.style.transform !== '') card.style.transform = '';
            return;
          }
          const curX = stepSpring(springX, targetX, dt, { wn: 14.0, zeta: 0.75 });
          const curY = stepSpring(springY, targetY, dt, { wn: 14.0, zeta: 0.75 });
          card.style.transform = `perspective(900px) rotateY(${curX.toFixed(2)}deg) rotateX(${curY.toFixed(2)}deg) translateY(-2px)`;
        },
      });
    }
  }

  /* ========================================================================
     5. ENLACES Y EVENTOS
     ======================================================================== */
  function bindEvents() {
    themeSwitchBtn?.addEventListener('click', () => {
      toggleTheme();
      emitEvent(BARONE_EVENTS.UI_CLICK);
    });

    brandLogoTrigger?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      emitEvent(BARONE_EVENTS.UI_CLICK);
    });

    for (let i = 0; i < branchTabs.length; i++) {
      const tab = branchTabs[i];
      tab.addEventListener('click', () => {
        const branchId = tab.getAttribute('data-branch');
        if (branchId) renderBranch(branchId);
        emitEvent(BARONE_EVENTS.UI_CLICK);
      });
    }

    // Vibración háptica en teléfonos al tocar el botón de WhatsApp
    document.getElementById('heroWhatsAppBtn')?.addEventListener('click', () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(10); } catch (_) {}
      }
      emitEvent(BARONE_EVENTS.UI_CLICK);
    });

    // Actualiza el reloj de horarios cada 60 segundos
    setInterval(updateScheduleStatus, 60000);
  }

  // Inicialización de estado
  let savedTheme = 'walnut';
  try {
    const t = localStorage.getItem('barone_theme_pref');
    if (t === 'walnut' || t === 'chalk') savedTheme = t;
  } catch (_) {}

  setTheme(savedTheme);
  renderBranch('lomas');
  updateScheduleStatus();
  bindEvents();
  initSpringTiltCards();

  return {
    updateScheduleStatus,
    renderBranch,
    setTheme,
  };
}
