/**
 * Compare two state snapshots and list the goals scored between them.
 * Pure — the celebrations store turns these into on-screen flashes.
 *
 * Score *decreases* (VAR overturns, feed corrections) are deliberately
 * ignored, as are matches with no baseline in the previous snapshot.
 */
export function detectGoals(prev, next) {
  const out = [];
  const prevById = new Map(
    [...(prev?.fixtures ?? []), ...(prev?.knockoutMatches ?? [])].map((m) => [m.id, m]),
  );
  for (const m of [...(next?.fixtures ?? []), ...(next?.knockoutMatches ?? [])]) {
    if (m.status !== 'live' && m.status !== 'final') continue;
    const p = prevById.get(m.id);
    if (!p) continue;
    const dHome = (m.homeGoals ?? 0) - (p.homeGoals ?? 0);
    const dAway = (m.awayGoals ?? 0) - (p.awayGoals ?? 0);
    if (dHome > 0) out.push({ match: m, team: m.home, count: dHome });
    if (dAway > 0) out.push({ match: m, team: m.away, count: dAway });
  }
  return out;
}
