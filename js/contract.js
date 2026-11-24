/**
 * js/contract.js
 * Tienda Barone · Única fuente de verdad.
 * 100% datos reales oficiales.
 */

export const BARONE_EVENTS = Object.freeze({
  BRANCH_CHANGED: 'barone:branch-changed',
  STATUS_TICK: 'barone:status-tick',
  UI_CLICK: 'barone:ui-click',
});

export const bus = new EventTarget();

export function emitEvent(eventName, detail = {}) {
  bus.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export const state = {
  activeBranch: 'lomas',
  isOpenNow: false,
};

export const BRAND_DATA = Object.freeze({
  name: 'Tienda Barone',
  subline: 'Sillones · Muebles de Diseño',
  contact: Object.freeze({
    phoneDisplay: '11 4673-1570',
    whatsappNumber: '5491146731570',
    instagramHandle: '@tiendabarone',
    instagramUrl: 'https://www.instagram.com/tiendabarone/',
    websiteUrl: 'http://www.tiendabarone.com.ar/',
  }),
  branches: Object.freeze({
    lomas: Object.freeze({
      id: 'lomas',
      name: 'Lomas de Zamora',
      shortLabel: 'Lomas',
      addressFull: 'Hipólito Yrigoyen 9039, Lomas de Zamora, Buenos Aires',
      mapsUrl: 'https://maps.google.com/?q=Hipolito+Yrigoyen+9039,+Lomas+de+Zamora,+Buenos+Aires',
      embedUrl: 'https://maps.google.com/maps?q=Hipolito+Yrigoyen+9039,+Lomas+de+Zamora,+Provincia+de+Buenos+Aires,+Argentina&t=&z=16&ie=UTF8&iwloc=&output=embed',
    }),
    adrogue: Object.freeze({
      id: 'adrogue',
      name: 'Adrogué',
      shortLabel: 'Adrogué',
      addressFull: 'Plaza Esteban Adrogué 48, Adrogué, Buenos Aires',
      mapsUrl: 'https://maps.google.com/?q=Plaza+Esteban+Adrogue+48,+Adrogue,+Buenos+Aires',
      embedUrl: 'https://maps.google.com/maps?q=Plaza+Esteban+Adrogue+48,+Adrogue,+Provincia+de+Buenos+Aires,+Argentina&t=&z=16&ie=UTF8&iwloc=&output=embed',
    }),
  }),
  lightboxMedia: Object.freeze({
    photos: Object.freeze([
      Object.freeze({
        type: 'image',
        src: './mesa.webp',
        tag: 'Comedor',
        title: 'Mesa Principal',
        subtitle: 'Fabricación propia',
      }),
      Object.freeze({
        type: 'image',
        src: './mesa2.webp',
        tag: 'Living',
        title: 'Mesas de Centro',
        subtitle: 'Creamos espacios, creamos hogar',
      }),
      Object.freeze({
        type: 'image',
        src: './mesa3.webp',
        tag: 'Diseño',
        title: 'Acabados en Madera',
        subtitle: 'A la altura de tus sueños',
      }),
      Object.freeze({
        type: 'image',
        src: './sillon2.webp',
        tag: 'Sillones',
        title: 'Espacios de Living',
        subtitle: '12 cuotas sin interés',
      }),
    ]),
    videos: Object.freeze([
      Object.freeze({
        type: 'video',
        src: './sillon.mp4',
        poster: './sillon.webp',
        tag: 'Sillones',
        title: 'Línea Sillones',
        subtitle: 'Confort y tapicería seleccionada',
      }),
      Object.freeze({
        type: 'video',
        src: './silla.mp4',
        poster: './silla.webp',
        tag: 'Sillas',
        title: 'Mix de Sillas',
        subtitle: 'Diseño para comedor diario',
      }),
      Object.freeze({
        type: 'video',
        src: './silla2.mp4',
        poster: './silla.webp',
        tag: 'Detalles',
        title: 'Terminaciones Nobles',
        subtitle: 'Los detalles los hacen únicos',
      }),
    ]),
  }),
});

/**
 * Evaluador horario oficial en tiempo real (Argentina UTC-3).
 * Nunca muestra "Cerrado ahora"; siempre orienta cuándo abre.
 * Lunes a Viernes: 10:30 a 13:30 hs / 14:30 a 18:30 hs
 * Sábados: 10:00 a 15:00 hs
 * Domingos: Cerrado
 */
export function evaluateStoreOpenStatus(dateInput = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateInput);
  const map = Object.create(null);
  for (let i = 0; i < parts.length; i++) {
    map[parts[i].type] = parts[i].value;
  }

  const weekdayStr = map.weekday || 'Mon';
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute) || 0;
  const timeVal = hour + minute / 60.0;

  const isSunday = weekdayStr === 'Sun';
  const isSaturday = weekdayStr === 'Sat';
  const isFriday = weekdayStr === 'Fri';
  const isWeekday = !isSunday && !isSaturday;

  let isOpen = false;
  let showroomScheduleText = '';

  if (isWeekday) {
    if (timeVal >= 10.5 && timeVal < 13.5) {
      isOpen = true;
      showroomScheduleText = 'Abierto hoy hasta 13:30 hs · Luego 14:30 a 18:30 hs';
    } else if (timeVal >= 13.5 && timeVal < 14.5) {
      isOpen = false;
      showroomScheduleText = 'Reabrimos hoy de 14:30 a 18:30 hs';
    } else if (timeVal >= 14.5 && timeVal < 18.5) {
      isOpen = true;
      showroomScheduleText = 'Abierto hoy hasta las 18:30 hs';
    } else if (timeVal < 10.5) {
      isOpen = false;
      showroomScheduleText = 'Hoy abrimos 10:30–13:30 y 14:30–18:30 hs';
    } else if (isFriday) {
      isOpen = false;
      showroomScheduleText = 'Mañana Sáb abrimos 10:00 a 15:00 hs · Lun–Vie 10:30–18:30';
    } else {
      isOpen = false;
      showroomScheduleText = 'Abrimos Lun a Vie 10:30–13:30 / 14:30–18:30 · Sáb 10–15';
    }
  } else if (isSaturday) {
    if (timeVal < 10.0) {
      isOpen = false;
      showroomScheduleText = 'Hoy Sábado abrimos de 10:00 a 15:00 hs';
    } else if (timeVal < 15.0) {
      isOpen = true;
      showroomScheduleText = 'Abierto hoy Sábado hasta las 15:00 hs';
    } else {
      isOpen = false;
      showroomScheduleText = 'Abrimos Lun a Vie 10:30–13:30 / 14:30–18:30 · Sáb 10–15';
    }
  } else {
    isOpen = false;
    showroomScheduleText = 'Abrimos Lun a Vie 10:30–13:30 / 14:30–18:30 · Sáb 10–15';
  }

  return {
    isOpen,
    isWeekday,
    isSaturday,
    isSunday,
    showroomScheduleText,
  };
}
