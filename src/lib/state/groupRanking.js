/**
 * FIFA World Cup group-stage ranking (FIFA 2026 competition regulations).
 * Pure functions — no I/O, no Svelte.
 *
 * Criteria, in order:
 *  1. points in all group matches
 *  2. goal difference in all group matches
 *  3. goals scored in all group matches
 *  4–6. the same three criteria, recomputed over only the matches between
 *       the teams still tied after 1–3
 *  7. fair play points across all group matches
 *     (yellow −1 · second yellow −3 · direct red −4 · yellow + direct red −5)
 *  8. drawing of lots
 *
 * Known approximations:
 *  - The event feed doesn't say whether a red was direct or a second yellow.
 *    A red preceded by ≥2 yellow events for the same player counts −3
 *    (second-yellow dismissal); a red after exactly one yellow counts −5;
 *    a red alone counts −4.
 *  - Drawing of lots can't be computed. Sorting is stable, so teams still
 *    tied after criterion 7 keep the upstream order (the official draw
 *    order) — deterministic, which is what matters for a stable table.
 */

/** Sort every group's standings by the FIFA criteria. */
export function rankGroups(groups, fixtures) {
  return (groups ?? []).map((g) => ({
    ...g,
    standings: rankGroup(g.standings ?? [], fixtures ?? []),
  }));
}

/** Sort one group's standings rows. `fixtures` = group-stage fixtures. */
export function rankGroup(standings, fixtures) {
  const sorted = [...standings].sort(byOverall);
  // Partition into runs tied on points/GD/GF, then break each run with the
  // head-to-head criteria (4–8).
  const out = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && byOverall(sorted[i], sorted[j]) === 0) j++;
    const bucket = sorted.slice(i, j);
    if (bucket.length > 1) breakTies(bucket, fixtures);
    out.push(...bucket);
    i = j;
  }
  return out;
}

function byOverall(a, b) {
  return (b.pts ?? 0) - (a.pts ?? 0) || (b.gd ?? 0) - (a.gd ?? 0) || (b.gf ?? 0) - (a.gf ?? 0);
}

// Played (or in-progress) matches with a usable score.
function playedMatches(fixtures) {
  return fixtures.filter(
    (m) => (m.status === 'final' || m.status === 'live') && m.homeGoals != null && m.awayGoals != null,
  );
}

function breakTies(bucket, fixtures) {
  const codes = new Set(bucket.map((r) => r.fifaCode));
  const h2h = new Map();
  for (const code of codes) h2h.set(code, { pts: 0, gd: 0, gf: 0 });

  for (const m of playedMatches(fixtures)) {
    if (!codes.has(m.home) || !codes.has(m.away)) continue;
    const home = h2h.get(m.home);
    const away = h2h.get(m.away);
    home.gf += m.homeGoals;
    home.gd += m.homeGoals - m.awayGoals;
    away.gf += m.awayGoals;
    away.gd += m.awayGoals - m.homeGoals;
    if (m.homeGoals > m.awayGoals) home.pts += 3;
    else if (m.awayGoals > m.homeGoals) away.pts += 3;
    else {
      home.pts += 1;
      away.pts += 1;
    }
  }

  const fairPlay = fairPlayPoints(fixtures, codes);
  bucket.sort((a, b) => {
    const A = h2h.get(a.fifaCode);
    const B = h2h.get(b.fifaCode);
    return (
      B.pts - A.pts ||
      B.gd - A.gd ||
      B.gf - A.gf ||
      (fairPlay.get(b.fifaCode) ?? 0) - (fairPlay.get(a.fifaCode) ?? 0)
    );
  });
}

/**
 * Fair play points per team across all their group matches (criterion 7).
 * Always ≤ 0 — higher (closer to zero) ranks better.
 */
export function fairPlayPoints(fixtures, codes) {
  const out = new Map();
  for (const code of codes) out.set(code, 0);
  let anon = 0;
  for (const m of fixtures) {
    // Card tally per player within this match, so multi-card sanctions
    // (second yellow, yellow + red) are scored per FIFA's scale rather
    // than as independent cards.
    const perPlayer = new Map();
    for (const ev of m.events ?? []) {
      if ((ev.type !== 'yellow' && ev.type !== 'red') || !codes.has(ev.team)) continue;
      const key = `${ev.team}|${ev.player ?? `anon-${anon++}`}`;
      const tally = perPlayer.get(key) ?? { team: ev.team, yellow: 0, red: 0 };
      tally[ev.type] += 1;
      perPlayer.set(key, tally);
    }
    for (const { team, yellow, red } of perPlayer.values()) {
      let penalty;
      if (red > 0) penalty = yellow >= 2 ? 3 : yellow === 1 ? 5 : 4;
      else penalty = yellow >= 2 ? 3 : yellow;
      out.set(team, out.get(team) - penalty);
    }
  }
  return out;
}
