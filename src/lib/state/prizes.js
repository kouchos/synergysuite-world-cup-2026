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

export function teamOwner(fifaCode, employees) {
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
      const gp = rows.reduce((s, r) => s + (r.p ?? 0), 0);
      return { employee: emp, pts, gd, gf, gp };
    })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

export function worstTeamRanking(state, employees) {
  const byTeam = standingsByTeam(state);
  return Object.values(byTeam)
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
}

export function worstTeam(state, employees) {
  return worstTeamRanking(state, employees)[0] ?? null;
}

export function mostCardsLeaderboard(state, employees) {
  const cardsByTeam = {};
  for (const fx of [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])]) {
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

export function goldenBootTable(state, employees) {
  return (state.topScorers ?? []).map((s) => ({ ...s, owner: teamOwner(s.team, employees) }));
}

export function goldenBootLeader(state, employees) {
  return goldenBootTable(state, employees)[0] ?? null;
}

// ── Drill-down timelines ──────────────────────────────────────────────────────
// Flatten match events with their parent match, ordered by kickoff then minute.
function chronologicalEvents(matches) {
  const out = [];
  for (const match of matches) {
    for (const ev of match.events ?? []) out.push({ ...ev, match });
  }
  return out.sort(
    (a, b) => new Date(a.match.utc) - new Date(b.match.utc) || (a.minute ?? 0) - (b.minute ?? 0),
  );
}

/**
 * Every card earned by one employee's teams, chronological, with a running
 * points balance. Scans the same source as mostCardsLeaderboard (group +
 * knockout matches) so the final running total always matches the leaderboard.
 */
export function cardTimeline(state, employee) {
  const owned = new Set(employee.teams.map((t) => t.fifaCode));
  let running = 0;
  return chronologicalEvents([...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])])
    .filter((ev) => (ev.type === 'yellow' || ev.type === 'red') && owned.has(ev.team))
    .map((ev) => {
      const points = ev.type === 'red' ? 2 : 1;
      running += points;
      return { ...ev, points, running };
    });
}

/** Goals by one player, chronological, with a running tally. */
export function goalTimeline(state, player, team) {
  let running = 0;
  return chronologicalEvents([...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])])
    .filter((ev) => ev.type === 'goal' && ev.player === player && ev.team === team)
    .map((ev) => {
      running += 1;
      return { ...ev, running };
    });
}

/**
 * Completed group-stage results for one employee's teams with a running
 * sweepstake-points balance (win 3 / draw 1 / loss 0 — same currency as
 * overallLeaderboard, which sums group standings pts).
 */
export function pointsTimeline(state, employee) {
  const owned = new Set(employee.teams.map((t) => t.fifaCode));
  let running = 0;
  const rows = [];
  const finals = (state.fixtures ?? [])
    .filter((f) => f.status === 'final' && (owned.has(f.home) || owned.has(f.away)))
    .sort((a, b) => new Date(a.utc) - new Date(b.utc));
  for (const match of finals) {
    for (const side of ['home', 'away']) {
      if (!owned.has(match[side])) continue;
      const gf = side === 'home' ? match.homeGoals : match.awayGoals;
      const ga = side === 'home' ? match.awayGoals : match.homeGoals;
      const points = gf > ga ? 3 : gf === ga ? 1 : 0;
      running += points;
      rows.push({
        match,
        team: match[side],
        opponent: side === 'home' ? match.away : match.home,
        gf,
        ga,
        result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
        points,
        running,
      });
    }
  }
  return rows;
}

/**
 * One team's completed matches (group + knockout), chronological, with a
 * running group-points balance. Knockout games carry no group points but are
 * included so the worst-team story is complete.
 */
export function teamResults(state, fifaCode) {
  let running = 0;
  return [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])]
    .filter((m) => (m.home === fifaCode || m.away === fifaCode) && m.status === 'final')
    .sort((a, b) => new Date(a.utc) - new Date(b.utc))
    .map((match) => {
      const home = match.home === fifaCode;
      const gf = home ? match.homeGoals : match.awayGoals;
      const ga = home ? match.awayGoals : match.homeGoals;
      const isGroup = match.stage === 'group' || (!match.round && match.group);
      const points = isGroup ? (gf > ga ? 3 : gf === ga ? 1 : 0) : null;
      if (points != null) running += points;
      return {
        match,
        opponent: home ? match.away : match.home,
        gf,
        ga,
        result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
        points,
        running,
        round: match.round ?? null,
      };
    });
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
