/**
 * "While you were sleeping" — recap of everything that happened between two
 * visits. Pure derivations only; the visit bookkeeping (localStorage marker,
 * auto-open decision) lives in App.svelte.
 *
 * The window is capped at 48h: skip the weekend and Monday's recap covers
 * Saturday morning onwards, not the whole tournament.
 */
import { overallLeaderboard, teamOwner } from './prizes.js';
import { englandLines } from './banter.js';

export const RECAP_WINDOW_MS = 48 * 60 * 60 * 1000;
// Auto-recap only after a proper absence — nipping out for lunch doesn't count.
export const MIN_GAP_MS = 6 * 60 * 60 * 1000;

// A match that kicked off shortly before the window still counts: it likely
// finished (or was being watched) after the user left.
const MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000;

function allMatches(state) {
  return [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])];
}

export function clampSince(sinceMs, nowMs = Date.now()) {
  return Math.max(sinceMs, nowMs - RECAP_WINDOW_MS);
}

/** Tiny leaderboard snapshot stored with the visit marker for rank-movement diffs. */
export function rankSnapshot(state, employees) {
  return overallLeaderboard(state, employees).map((row, i) => ({
    id: row.employee.id,
    rank: i + 1,
    pts: row.pts,
  }));
}

export function recapSince(state, sinceMs, employees, prevRanks = null) {
  const since = clampSince(sinceMs);

  const results = allMatches(state)
    .filter(
      (m) =>
        m.status === 'final' &&
        m.utc &&
        m.homeGoals != null &&
        new Date(m.utc).getTime() + MATCH_DURATION_MS > since,
    )
    .sort((a, b) => new Date(a.utc) - new Date(b.utc));
  const live = allMatches(state).filter((m) => m.status === 'live');

  // Per-employee deltas across the window's finished games.
  const byId = new Map(
    employees.map((e) => [e.id, { employee: e, gf: 0, ga: 0, w: 0, d: 0, l: 0, cardPts: 0 }]),
  );
  for (const m of results) {
    for (const side of ['home', 'away']) {
      const owner = m[side] ? teamOwner(m[side], employees) : null;
      if (!owner) continue;
      const rec = byId.get(owner.id);
      const gf = (side === 'home' ? m.homeGoals : m.awayGoals) ?? 0;
      const ga = (side === 'home' ? m.awayGoals : m.homeGoals) ?? 0;
      rec.gf += gf;
      rec.ga += ga;
      if (gf > ga) rec.w += 1;
      else if (gf === ga) rec.d += 1;
      else rec.l += 1;
    }
    for (const ev of m.events ?? []) {
      if (ev.type !== 'yellow' && ev.type !== 'red') continue;
      const owner = ev.team ? teamOwner(ev.team, employees) : null;
      if (owner) byId.get(owner.id).cardPts += ev.type === 'red' ? 2 : 1;
    }
  }
  const ownerDeltas = [...byId.values()]
    .filter((r) => r.w + r.d + r.l + r.cardPts > 0)
    .sort((a, b) => b.gf - a.gf || b.w - a.w);

  // Scorers and cards from the window's games — live ones included, since
  // anything in a game that kicked off after the last visit was missed too.
  const windowMatches = [...results, ...live];
  const scorerTally = new Map();
  const cards = [];
  for (const m of windowMatches) {
    for (const ev of m.events ?? []) {
      if (ev.type === 'goal' && ev.player) {
        const key = `${ev.team}|${ev.player}`;
        const cur =
          scorerTally.get(key) ??
          { player: ev.player, team: ev.team, goals: 0, owner: teamOwner(ev.team, employees) };
        cur.goals += 1;
        scorerTally.set(key, cur);
      } else if (ev.type === 'yellow' || ev.type === 'red') {
        cards.push({ ...ev, match: m, owner: teamOwner(ev.team, employees) });
      }
    }
  }
  const scorers = [...scorerTally.values()].sort((a, b) => b.goals - a.goals);
  cards.sort(
    (a, b) => new Date(a.match.utc) - new Date(b.match.utc) || (a.minute ?? 0) - (b.minute ?? 0),
  );

  // Rank movement vs the snapshot stored at the previous visit.
  let movements = [];
  if (prevRanks?.length) {
    const prevById = new Map(prevRanks.map((r) => [r.id, r]));
    movements = rankSnapshot(state, employees)
      .map((cur) => ({ cur, prev: prevById.get(cur.id) }))
      .filter(({ cur, prev }) => prev && prev.rank !== cur.rank)
      .map(({ cur, prev }) => ({
        employee: employees.find((e) => e.id === cur.id),
        from: prev.rank,
        to: cur.rank,
      }))
      .sort((a, b) => a.to - b.to);
  }

  // England never escape the recap.
  const engResults = results.filter((m) => m.home === 'ENG' || m.away === 'ENG');
  const england = engResults.length ? englandLines({ fixtures: engResults }, employees)[0] : null;

  return { since, results, live, scorers, cards, ownerDeltas, movements, england };
}

export function recapHasContent(recap) {
  return recap.results.length > 0 || recap.live.length > 0;
}
