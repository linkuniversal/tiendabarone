/**
 * js/engine/math.js
 * Fórmulas matemáticas puras (extraídas de kin.js y world_nav_and_story.js).
 * Oscilador armónico de 2° orden amortiguado, suavizado exponencial y curvas C2.
 */

export const TWO_PI = Math.PI * 2.0;

export function clamp(val, min, max) {
  if (!Number.isFinite(val)) return min;
  return val < min ? min : val > max ? max : val;
}

export function lerp(a, b, u) {
  return a + (b - a) * u;
}

/**
 * Suavizado exponencial independiente de los FPS del monitor (core.js).
 */
export function expSmoothingAlpha(speed, dt) {
  return 1.0 - Math.exp(-speed * Math.max(0.0, dt));
}

/**
 * Curva Hermite C1.
 */
export function smoothstep01(u) {
  const t = clamp(u, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Curva Quíntica C2 con aceleración y velocidad continua (world_nav_and_story.js).
 * Evita cualquier tironazo visual en transiciones.
 */
export function smootherstep01(u) {
  const t = clamp(u, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

/**
 * Generador PRNG mulberry32 determinístico (kin.js).
 * Genera números aleatorios estables para el grano visual sin repetición obvia.
 */
export function createMulberry32(seed = 0x351703) {
  let a = (seed >>> 0) || 0x351703;
  return function nextRandom() {
    let t = (a = (a + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Estado y resolución física de resorte armónico amortiguado (stepBikeDynamicsSpring de kin.js).
 * Usado para las microinteracciones táctiles y la inclinación en cards.
 */
export function createSpringState(initialValue = 0.0) {
  return { val: initialValue, vel: 0.0 };
}

export function stepSpring(
  spring,
  target,
  dt,
  { wn = 12.0, zeta = 0.82, min = -Infinity, max = Infinity, subSteps = 2 } = {}
) {
  const h = clamp(dt, 0.0, 0.05);
  if (h <= 1e-7) return spring.val;

  const subDt = h / subSteps;
  const wn2 = wn * wn;
  const damp2 = 2.0 * zeta * wn;

  for (let i = 0; i < subSteps; i++) {
    const accel = wn2 * (target - spring.val) - damp2 * spring.vel;
    spring.vel += accel * subDt;
    spring.val = clamp(spring.val + spring.vel * subDt, min, max);
  }
  return spring.val;
}
