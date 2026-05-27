/**
 * Thin wrappers around ESPN's public (undocumented) soccer endpoints for the
 * FIFA World Cup. No API key, CORS works from the browser.
 *
 * If these endpoints ever stop responding the way we expect, switch the store's
 * adapter to API-Football Pro — the swap point is `lib/data/adapter.js`.
 */
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';

// Tournament window: 11 June – 19 July 2026, with a couple of days' padding
// either side so the warm-up and any rescheduled finals still fall inside.
export const TOURNAMENT_DATES = '20260609-20260721';

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`ESPN ${res.status} ${url}`);
  return res.json();
}

export function fetchScoreboard(dates = TOURNAMENT_DATES) {
  return getJson(`${BASE}/scoreboard?dates=${dates}&limit=200`);
}

export function fetchSummary(eventId) {
  return getJson(`${BASE}/summary?event=${eventId}`);
}

export function fetchStandings() {
  return getJson(STANDINGS);
}
