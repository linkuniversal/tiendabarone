/**
 * js/contract.js
 * Tienda Barone · Única fuente de verdad.
 * Textos 100% reales extraídos de canales oficiales y capturas.
 * LEY: Cero texto inventado.
 */

export const BARONE_EVENTS = Object.freeze({
  THEME_CHANGED: 'barone:theme-changed',
  BRANCH_CHANGED: 'barone:branch-changed',
  STATUS_TICK: 'barone:status-tick',
  UI_CLICK: 'barone:ui-click',
});

export const bus = new EventTarget();

export function emitEvent(eventName, detail = {}) {
  bus.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export const state = {
  theme: 'walnut', // 'walnut' (#351703) | 'chalk' (#FAF7F2)
  activeBranch: 'lomas', // 'lomas' | 'adrogue'
  isOpenNow: false,
};

export const BRAND_DATA = Object.freeze({
  name: 'Tienda Barone',
  subline: 'Sillones · Muebles de Diseño',
  tagline: 'Creamos espacios, creamos hogar 🏠',
  hashtag: '#tiendabarone Sillones',
  perk: '12 cuotas sin interés',
  quotes: Object.freeze({
    hero: 'No vendemos solo muebles, creamos espacios que enamoran.',
    manifesto: 'El diseño transforma ambientes. Los detalles los hacen únicos. Tu casa merece muebles que estén a la altura de tus sueños!!',
    advice: 'El error es elegir el color de la pared sin mirar el suelo y los muebles',
  }),
  contact: Object.freeze({
    phoneDisplay: '11 4673-1570',
    whatsappNumber: '5491146731570',
    whatsappMessage: '¡Hola Tienda Barone! 🛋️ Quisiera hacer una consulta por sus muebles de diseño y sillones.',
    instagramHandle: '@tiendabarone',
    instagramUrl: 'https://www.instagram.com/tiendabarone/',
    websiteUrl: 'http://www.tiendabarone.com.ar/',
  }),
  branches: Object.freeze({
    lomas: Object.freeze({
      id: 'lomas',
      name: 'Lomas de Zamora',
      addressShort: 'Yrigoyen 9039',
      addressFull: 'Hipólito Yrigoyen 9039, Lomas de Zamora, Buenos Aires',
      mapsUrl: 'https://maps.google.com/?q=Hipolito+Yrigoyen+9039,+Lomas+de+Zamora,+Buenos+Aires',
    }),
    adrogue: Object.freeze({
      id: 'adrogue',
      name: 'Adrogué',
      addressShort: 'Plaza Esteban Adrogué 48',
      addressFull: 'Plaza Esteban Adrogué 48, Adrogué, Buenos Aires',
      mapsUrl: 'https://maps.google.com/?q=Plaza+Esteban+Adrogue+48,+Adrogue,+Buenos+Aires',
    }),
  }),
  schedule: Object.freeze({
    weekdaysText: '10:30 a 13:30 hs / 14:30 a 18:30 hs',
    saturdayText: '10:00 a 15:00 hs',
    sundayText: 'Cerrado',
  }),
  assets: Object.freeze({
    videos: ['sillon.mp4', 'silla.mp4', 'silla2.mp4'],
    images: [
      'sillon.webp',
      'sillon2.webp',
      'silla.webp',
      'mesa.webp',
      'mesa2.webp',
      'mesa3.webp',
    ],
  }),
});

/**
 * Validador horario oficial en tiempo real para Argentina (UTC-3).
 * Lunes a Viernes: 10:30 a 13:30 hs y 14:30 a 18:30 hs
 * Sábados: 10:00 a 15:00 hs
 * Domingos: Cerrado
 */
export function evaluateStoreOpenStatus(dateInput = new Date()) {
  const now = dateInput;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const argTime = new Date(utcMs - 3600000 * 3);

  const day = argTime.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const hours = argTime.getHours();
  const minutes = argTime.getMinutes();
  const timeVal = hours + minutes / 60.0;

  let isOpen = false;
  let scheduleTodayText = '';

  if (day >= 1 && day <= 5) {
    scheduleTodayText = 'Lun a Vie: 10:30 a 13:30 hs y 14:30 a 18:30 hs';
    if ((timeVal >= 10.5 && timeVal < 13.5) || (timeVal >= 14.5 && timeVal < 18.5)) {
      isOpen = true;
    }
  } else if (day === 6) {
    scheduleTodayText = 'Sábados: 10:00 a 15:00 hs';
    if (timeVal >= 10.0 && timeVal < 15.0) {
      isOpen = true;
    }
  } else {
    scheduleTodayText = 'Domingos: Cerrado';
    isOpen = false;
  }

  return {
    isOpen,
    day,
    scheduleTodayText,
    badgeText: isOpen ? 'Abierto Ahora' : 'Cerrado Ahora',
    isSaturday: day === 6,
    isWeekday: day >= 1 && day <= 5,
  };
}
