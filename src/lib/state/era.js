/**
 * ?era=1966 — easter egg. England's matches render in black-and-white,
 * because that's the last time they won anything and the footage proves it.
 * Read once at load; it's a novelty toggle, not app state.
 */
export const era1966 =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('era') === '1966';

/** Should this match render in glorious 1966 monochrome? */
export function inMonochrome(match) {
  return era1966 && (match?.home === 'ENG' || match?.away === 'ENG');
}
