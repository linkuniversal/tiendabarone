/**
 * js/engine/math.js
 * Utilidades matemáticas y física de resorte armónico amortiguado.
 */

export function clamp(val, min, max) {
  if (!Number.isFinite(val)) return min;
  return val < min ? min : val > max ? max : val;
}

export function lerp(a, b, u) {
  return a + (b - a) * u;
}

export function createSpringState(initialValue = 0.0) {
  return { val: initialValue, vel: 0.0 };
}

export function stepSpring(
  spring,
  target,
  dt,
  { wn = 14.0, zeta = 0.78, min = -Infinity, max = Infinity, subSteps = 2 } = {}
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
