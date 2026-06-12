export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isMobileViewport = () => window.innerWidth < 768;

export const hasFinePointer = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Resolves when fonts are ready or after `timeout` ms, whichever is first. */
export function fontsReady(timeout = 1500) {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const timer = new Promise((resolve) => setTimeout(resolve, timeout));
  return Promise.race([fonts, timer]);
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
