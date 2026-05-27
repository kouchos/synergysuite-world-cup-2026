/**
 * Pure derivations for the 4 prize leaderboards. Input: normalised State + employees config.
 * No I/O, no Svelte. Easy to unit test later.
 *
 * Worst-team tie-break rule (confirmed): earliest exit → fewest pts → worst GD → fewest goals scored.
 * At group stage with everyone still alive, the rule degenerates to: fewest pts → worst GD → fewest GF.
 */

/**
 * Has anything actually happened yet? Used by Header to switch off the prize
 * tiles before the first ball is kicked — otherwise every employee ties at 0
 * pts and the tiles surface arbitrary tiebreaker picks.
 */
export function hasMatchActivity(state) {
  const anyPlayed = (state.groups ?? []).some((g) =>
    (g.standings ?? []).some((row) => (row.p ?? 0) > 0),
  );
  if (anyPlayed) return true;
  const liveOrFinal = [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])].some(
    (m) => m.status === 'live' || m.status === 'final',
  );
  return liveOrFinal || (state.topScorers?.length ?? 0) > 0;
}

function teamOwner(fifaCode, employees) {
  for (const emp of employees) {
    if (emp.teams.some((t) => t.fifaCode === fifaCode)) return emp;
  }
  return null;
}

function standingsByTeam(state) {
  const out = {};
  for (const g of state.groups ?? []) {
    for (const row of g.standings) out[row.fifaCode] = row;
  }
  return out;
}

export function overallLeaderboard(state, employees) {
  const byTeam = standingsByTeam(state);
  return employees
    .map((emp) => {
      const rows = emp.teams.map((t) => byTeam[t.fifaCode]).filter(Boolean);
      const pts = rows.reduce((s, r) => s + (r.pts ?? 0), 0);
      const gd = rows.reduce((s, r) => s + (r.gd ?? 0), 0);
      const gf = rows.reduce((s, r) => s + (r.gf ?? 0), 0);
      return { employee: emp, pts, gd, gf };
    })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

export function worstTeam(state, employees) {
  const byTeam = standingsByTeam(state);
  const ranked = Object.values(byTeam)
    .map((row) => ({
      row,
      owner: teamOwner(row.fifaCode, employees),
      eliminated: row.eliminated ?? false,
      exitRound: row.exitRound ?? null,
    }))
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? -1 : 1;
      if (a.exitRound && b.exitRound && a.exitRound !== b.exitRound) return a.exitRound - b.exitRound;
      return a.row.pts - b.row.pts || a.row.gd - b.row.gd || a.row.gf - b.row.gf;
    });
  return ranked[0] ?? null;
}

export function mostCardsLeaderboard(state, employees) {
  const cardsByTeam = {};
  for (const fx of state.fixtures ?? []) {
    for (const ev of fx.events ?? []) {
      if (ev.type === 'yellow' || ev.type === 'red') {
        cardsByTeam[ev.team] ??= { yellow: 0, red: 0 };
        cardsByTeam[ev.team][ev.type] += 1;
      }
    }
  }
  return employees
    .map((emp) => {
      let yellow = 0;
      let red = 0;
      for (const t of emp.teams) {
        const c = cardsByTeam[t.fifaCode];
        if (!c) continue;
        yellow += c.yellow;
        red += c.red;
      }
      return { employee: emp, yellow, red, points: yellow + red * 2 };
    })
    .sort((a, b) => b.points - a.points);
}

export function goldenBootLeader(state, employees) {
  const top = (state.topScorers ?? [])[0];
  if (!top) return null;
  return { ...top, owner: teamOwner(top.team, employees) };
}

export function tournamentWinner(state, employees) {
  const final = (state.knockoutMatches ?? []).find((m) => m.round === 'Final');
  if (!final || final.status !== 'final') return null;
  const winnerCode =
    final.homeGoals > final.awayGoals
      ? final.home
      : final.awayGoals > final.homeGoals
        ? final.away
        : null;
  if (!winnerCode) return null;
  return {
    team: winnerCode,
    owner: teamOwner(winnerCode, employees),
    score: `${final.homeGoals}–${final.awayGoals}`,
    opponent: winnerCode === final.home ? final.away : final.home,
    opponentOwner: teamOwner(winnerCode === final.home ? final.away : final.home, employees),
  };
}
