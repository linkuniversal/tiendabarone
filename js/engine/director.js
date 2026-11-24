/**
 * js/engine/director.js
 * Bucle maestro bajo demanda (Wake-on-Interaction / Idle-Sleep).
 */

import { clamp } from './math.js?v=3';

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
              let shouldWake = false;
              for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                for (let j = 0; j < this.tasks.length; j++) {
                  const task = this.tasks[j];
                  if (task.element === entry.target) {
                    const wasVis = task.visible;
                    task.visible = entry.isIntersecting;
                    if (!wasVis && task.visible) {
                      shouldWake = true;
                    }
                  }
                }
              }
              if (shouldWake) this.requestWake();
            },
            { rootMargin: '80px 0px' }
          )
        : null;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.requestWake();
        }
      });
    }
  }

  register(config) {
    const task = {
      id: config.id || `task_${this.tasks.length}`,
      element: config.element || null,
      visible: true,
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

    return task;
  }

  requestWake() {
    if (this.reducedMotion || this.rafId !== null || (typeof document !== 'undefined' && document.hidden)) {
      return;
    }
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

      const dt = clamp(rawDeltaMs * 0.001, 0.001, 0.05);
      const timeSec = nowMs * 0.001;

      let hasActiveWork = false;
      for (let i = 0; i < this.tasks.length; i++) {
        const task = this.tasks[i];
        if (!task.visible || !task.onTick) continue;
        if (task.onTick(dt, timeSec) === true) {
          hasActiveWork = true;
        }
      }

      if (hasActiveWork) {
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
