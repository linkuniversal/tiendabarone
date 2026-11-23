/**
 * js/engine/director.js
 * Bucle maestro de animación y monitoreo adaptativo (core.js de Pelican Campus Quest).
 * Centraliza requestAnimationFrame con cálculo exacto de deltaTime.
 * Pausa tareas de forma automática cuando no son visibles en pantalla.
 */

import { clamp } from './math.js';

export class EngineDirector {
  constructor() {
    this.tasks = [];
    this.rafId = null;
    this.lastTimeMs = 0;

    this.reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              let anyBecameVisible = false;
              for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                for (let j = 0; j < this.tasks.length; j++) {
                  const task = this.tasks[j];
                  if (task.element === entry.target) {
                    const wasVis = task.visible;
                    task.visible = entry.isIntersecting;
                    if (!wasVis && task.visible) {
                      anyBecameVisible = true;
                    }
                  }
                }
              }
              if (anyBecameVisible && this.rafId === null && !this.reducedMotion) {
                this.start();
              }
            },
            { rootMargin: '80px 0px' }
          )
        : null;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.lastTimeMs = 0;
          this.start();
        }
      });
    }
  }

  /**
   * Registra un ciclo o módulo al director.
   * @param {object} config { id, element, minIntervalMs, onTick, onResize }
   */
  register(config) {
    const task = {
      id: config.id || `task_${this.tasks.length}`,
      element: config.element || null,
      minIntervalMs: Number(config.minIntervalMs) || 0,
      lastDrawMs: -9999,
      visible: config.element ? true : true,
      onTick: typeof config.onTick === 'function' ? config.onTick : null,
      onResize: typeof config.onResize === 'function' ? config.onResize : null,
    };

    this.tasks.push(task);

    if (this._observer && task.element) {
      this._observer.observe(task.element);
    }

    if (task.onResize) {
      task.onResize();
    }

    if (this.reducedMotion && task.onTick) {
      task.onTick(0.016, 0.0);
    }

    return task;
  }

  start() {
    if (this.reducedMotion || this.rafId !== null) return;
    this.lastTimeMs = 0;

    const loop = (nowMs) => {
      if (typeof document !== 'undefined' && document.hidden) {
        this.rafId = null;
        return;
      }

      if (this.lastTimeMs === 0) {
        this.lastTimeMs = nowMs;
      }
      const rawDeltaMs = nowMs - this.lastTimeMs;
      this.lastTimeMs = nowMs;

      // dt protegido: entre 1ms y 50ms para evitar saltos en cambios de pestaña
      const dt = clamp(rawDeltaMs * 0.001, 0.001, 0.05);
      const timeSec = nowMs * 0.001;

      let anyVisible = false;
      for (let i = 0; i < this.tasks.length; i++) {
        const task = this.tasks[i];
        if (!task.visible) continue;
        anyVisible = true;

        if (task.minIntervalMs > 0 && nowMs - task.lastDrawMs < task.minIntervalMs) {
          continue;
        }
        task.lastDrawMs = nowMs;

        if (task.onTick) {
          task.onTick(dt, timeSec);
        }
      }

      if (anyVisible) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  triggerResizeAll() {
    for (let i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].onResize) {
        this.tasks[i].onResize();
      }
    }
  }
}
