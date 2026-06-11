/**
 * Central switch for JS-driven motion (Svelte transitions/animations).
 * CSS animations are gated by the prefers-reduced-motion media query in
 * app.css; this covers the inline-style transitions Svelte generates.
 */
export const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function dur(ms) {
  return reducedMotion ? 0 : ms;
}
