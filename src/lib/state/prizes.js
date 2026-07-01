/**
 * Pure derivations for the 4 prize leaderboards. Input: normalised State + employees config.
 * No I/O, no Svelte. Easy to unit test later.
 *
 * Worst-team tie-break rule (confirmed): earliest exit → fewest pts → worst GD → fewest goals scored.
 * At group stage with everyone still alive, the rule degenerates to: fewest pts → worst GD → fewest GF.
 */
import { teamFor, TEAMS } from '../data/teams.js';

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

// ── Teams still in the competition ────────────────────────────────────────────
const isRealTeam = (code) => typeof code === 'string' && !!TEAMS[code];

// Loser of a decided knockout tie (null while undecided). A tie level on goals is
// settled on the penalty shootout — mirrors the bracket + adapter logic.
function tieLoser(m) {
  if (m?.status !== 'final' || m.homeGoals == null || m.awayGoals == null) return null;
  if (m.homeGoals > m.awayGoals) return m.away;
  if (m.awayGoals > m.homeGoals) return m.home;
  if (m.homeShootout != null && m.awayShootout != null && m.homeShootout !== m.awayShootout) {
    return m.homeShootout > m.awayShootout ? m.away : m.home;
  }
  return null;
}

// Group-stage exits are only counted once every Round-of-32 slot has a real
// team, so we never flag a team as out while the bracket is still filling in.
function r32Qualifiers(state) {
  const r32 = (state.knockoutMatches ?? []).filter((m) => m.round === 'R32');
  const drawn = r32.length > 0 && r32.every((m) => isRealTeam(m.home) && isRealTeam(m.away));
  if (!drawn) return null;
  const q = new Set();
  for (const m of r32) {
    q.add(m.home);
    q.add(m.away);
  }
  return q;
}

/**
 * FIFA codes of every team out of the tournament: knockout losers, plus
 * group-stage teams that missed the Round of 32 once the bracket is drawn.
 */
export function eliminatedTeams(state) {
  const out = new Set();
  for (const m of state.knockoutMatches ?? []) {
    const loser = tieLoser(m);
    if (isRealTeam(loser)) out.add(loser);
  }
  const qualified = r32Qualifiers(state);
  if (qualified) {
    for (const g of state.groups ?? []) {
      for (const row of g.standings ?? []) {
        if (isRealTeam(row.fifaCode) && !qualified.has(row.fifaCode)) out.add(row.fifaCode);
      }
    }
  }
  return out;
}

/** Employees ranked by how many of their teams are still in the competition. */
export function survivorsLeaderboard(state, employees) {
  const out = eliminatedTeams(state);
  return employees
    .map((emp) => {
      const teams = emp.teams.map((t) => ({ code: t.fifaCode, alive: !out.has(t.fifaCode) }));
      const alive = teams.filter((t) => t.alive).length;
      return { employee: emp, alive, total: emp.teams.length, teams };
    })
    .sort((a, b) => b.alive - a.alive || a.employee.name.localeCompare(b.employee.name));
}

export function survivorsLeader(state, employees) {
  return survivorsLeaderboard(state, employees)[0] ?? null;
}

// Whether the knockout stage has started — used to hide the "still in" prize
// until it means something (in the group stage everyone still has all six).
export function knockoutsUnderway(state) {
  return (
    (state.knockoutMatches ?? []).some((m) => m.status === 'live' || m.status === 'final') ||
    r32Qualifiers(state) != null
  );
}

/** Per-team breakdown for one employee: alive/out, and where each went out. */
export function survivorBreakdown(state, employee) {
  const out = eliminatedTeams(state);
  const km = state.knockoutMatches ?? [];
  return employee.teams.map((t) => {
    const code = t.fifaCode;
    if (!out.has(code)) return { code, alive: true, exit: null };
    const lost = km.find((m) => tieLoser(m) === code);
    return {
      code,
      alive: false,
      exit: lost ? { type: 'knockout', round: lost.round, match: lost } : { type: 'group' },
    };
  });
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

// ── Position-over-time race (animated bump chart) ─────────────────────────────
// Reconstructs each leaderboard game-by-game so a chart can replay how every
// player's table position moved as the tournament unfolded. Pure + deterministic:
// replays completed matches in kickoff order, recomputing the ranking after each
// game that actually shifted a tracked line.
//
// Output shape (consumed by PositionChart.svelte):
//   {
//     category,
//     frames:  [{ key, label }],          // x-axis, one entry per game that moved the table
//     lines:   [{ id, label, flag?, color, ranks: number[] }],  // ranks aligned to frames, 1 = top
//     rankCount,                          // how many lines are ranked (y-axis scale)
//     gameCount,                          // frames.length — 0 means "nothing to chart yet"
//   }

// Neutral grey for ranked entities nobody in the sweepstake owns (rare — every
// group team is picked, but knockout scorers can slip through).
const RACE_NEUTRAL = '#64748b';
// Cap lines on the team/player races so the chart stays legible. The two
// employee races (overall, cards) always show all 8 and ignore this.
const RACE_MAX_LINES = 8;

function raceDayLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Dublin',
  });
}

// Completed matches with a usable score, oldest first (id breaks utc ties).
function completedInOrder(matches) {
  return matches
    .filter((m) => m.status === 'final' && m.homeGoals != null && m.awayGoals != null)
    .sort(
      (a, b) =>
        new Date(a.utc) - new Date(b.utc) || String(a.id ?? '').localeCompare(String(b.id ?? '')),
    );
}

function addGroupResult(totals, code, gf, ga) {
  const t = (totals[code] ??= { pts: 0, gd: 0, gf: 0 });
  t.gf += gf;
  t.gd += gf - ga;
  t.pts += gf > ga ? 3 : gf === ga ? 1 : 0;
}

// 1-based ranks for `entries` ordered by `cmp`. Stable, so ties keep input order
// and never collapse two lines onto the same row.
function ranksByOrder(entries, cmp) {
  const order = [...entries].sort(cmp);
  const out = new Map();
  order.forEach((e, i) => out.set(e.id, i + 1));
  return out;
}

// The reconstructed timeline sums per-game scores, while the live leaderboards
// read the official standings snapshot — the two can drift mid-tournament (and
// in the hand-authored mocks). Land the chart's final point exactly on the table
// the user is looking at by appending an authoritative "Now" frame, but only when
// it would actually move something (so live, fully-synced data shows no extra tick).
function appendAuthoritativeFrame(frames, ranksById, ids, orderedIds) {
  if (!frames.length) return;
  const rank = new Map();
  orderedIds.filter((id) => ranksById.has(id)).forEach((id, i) => rank.set(id, i + 1));
  const last = frames.length - 1;
  const differs = ids.some((id) => {
    const r = rank.get(id);
    return r != null && r !== ranksById.get(id)[last];
  });
  if (!differs) return;
  frames.push({ key: 'now', label: 'Now' });
  for (const id of ids) {
    const arr = ranksById.get(id);
    arr.push(rank.get(id) ?? arr[last]);
  }
}

function finalizeRace(category, frames, lines, ranksById, rankCount) {
  return {
    category,
    frames,
    lines: lines.map((l) => ({ ...l, ranks: ranksById.get(l.id) ?? [] })),
    rankCount,
    gameCount: frames.length,
  };
}

function emptyRace(category) {
  return { category, frames: [], lines: [], rankCount: 0, gameCount: 0 };
}

// Overall race — one line per employee, summed group points across their teams.
function overallRace(state, employees) {
  const owned = employees.map((e) => ({ id: e.id, codes: e.teams.map((t) => t.fifaCode) }));
  const ids = employees.map((e) => e.id);
  const totals = {};
  const ranksById = new Map(ids.map((id) => [id, []]));
  const frames = [];

  for (const m of completedInOrder(state.fixtures ?? [])) {
    addGroupResult(totals, m.home, m.homeGoals, m.awayGoals);
    addGroupResult(totals, m.away, m.awayGoals, m.homeGoals);
    const metrics = owned.map(({ id, codes }) => {
      let pts = 0,
        gd = 0,
        gf = 0;
      for (const c of codes) {
        const t = totals[c];
        if (t) {
          pts += t.pts;
          gd += t.gd;
          gf += t.gf;
        }
      }
      return { id, pts, gd, gf };
    });
    const rank = ranksByOrder(metrics, (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    frames.push({ key: m.id, label: raceDayLabel(m.utc) });
    for (const id of ids) ranksById.get(id).push(rank.get(id));
  }

  appendAuthoritativeFrame(
    frames,
    ranksById,
    ids,
    overallLeaderboard(state, employees).map((r) => r.employee.id),
  );
  const lines = employees.map((e) => ({ id: e.id, label: e.name, color: e.color }));
  return finalizeRace('overall', frames, lines, ranksById, employees.length);
}

// Cards race — one line per employee, summed card points (🟨 1 · 🟥 2). Only games
// that actually showed a card to a tracked team produce a frame.
function cardsRace(state, employees) {
  const ownerByCode = {};
  for (const e of employees) for (const t of e.teams) ownerByCode[t.fifaCode] = e.id;
  const ids = employees.map((e) => e.id);
  const points = Object.fromEntries(ids.map((id) => [id, 0]));
  const ranksById = new Map(ids.map((id) => [id, []]));
  const frames = [];

  for (const m of completedInOrder([...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])])) {
    let changed = false;
    for (const ev of m.events ?? []) {
      if (ev.type !== 'yellow' && ev.type !== 'red') continue;
      const owner = ownerByCode[ev.team];
      if (owner == null) continue;
      points[owner] += ev.type === 'red' ? 2 : 1;
      changed = true;
    }
    if (!changed) continue;
    const rank = ranksByOrder(
      ids.map((id) => ({ id, v: points[id] })),
      (a, b) => b.v - a.v,
    );
    frames.push({ key: m.id, label: raceDayLabel(m.utc) });
    for (const id of ids) ranksById.get(id).push(rank.get(id));
  }

  appendAuthoritativeFrame(
    frames,
    ranksById,
    ids,
    mostCardsLeaderboard(state, employees).map((r) => r.employee.id),
  );
  const lines = employees.map((e) => ({ id: e.id, label: e.name, color: e.color }));
  return finalizeRace('cards', frames, lines, ranksById, employees.length);
}

// Worst-team race — the current spoon contenders raced among themselves on group
// points (rank 1 = worst, matching the table). Coloured by owning employee.
function worstRace(state, employees, maxLines) {
  const tracked = worstTeamRanking(state, employees).slice(0, maxLines);
  if (!tracked.length) return emptyRace('worst');
  const ids = tracked.map((r) => r.row.fifaCode);
  const idSet = new Set(ids);
  const totals = {};
  const ranksById = new Map(ids.map((id) => [id, []]));
  const frames = [];

  for (const m of completedInOrder(state.fixtures ?? [])) {
    const touches = idSet.has(m.home) || idSet.has(m.away);
    if (idSet.has(m.home)) addGroupResult(totals, m.home, m.homeGoals, m.awayGoals);
    if (idSet.has(m.away)) addGroupResult(totals, m.away, m.awayGoals, m.homeGoals);
    if (!touches) continue;
    const rank = ranksByOrder(
      ids.map((id) => ({ id, ...(totals[id] ?? { pts: 0, gd: 0, gf: 0 }) })),
      (a, b) => a.pts - b.pts || a.gd - b.gd || a.gf - b.gf,
    );
    frames.push({ key: m.id, label: raceDayLabel(m.utc) });
    for (const id of ids) ranksById.get(id).push(rank.get(id));
  }

  // `ids` is already in worstTeamRanking order, so it is the authoritative order.
  appendAuthoritativeFrame(frames, ranksById, ids, ids);
  const lines = tracked.map((r) => {
    const t = teamFor(r.row.fifaCode);
    return { id: r.row.fifaCode, label: t.name, flag: t.flag, color: r.owner?.color ?? RACE_NEUTRAL };
  });
  return finalizeRace('worst', frames, lines, ranksById, tracked.length);
}

// Golden-boot race — the current top scorers raced on cumulative goals (rank 1 =
// most). Coloured by the owner of the scorer's team.
function bootRace(state, employees, maxLines) {
  const tracked = goldenBootTable(state, employees).slice(0, maxLines);
  if (!tracked.length) return emptyRace('boot');
  const ids = tracked.map((r) => `${r.player}|${r.team}`);
  const idSet = new Set(ids);
  const goals = Object.fromEntries(ids.map((id) => [id, 0]));
  const ranksById = new Map(ids.map((id) => [id, []]));
  const frames = [];

  for (const m of completedInOrder([...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])])) {
    let changed = false;
    for (const ev of m.events ?? []) {
      if (ev.type !== 'goal' || !ev.player) continue;
      const id = `${ev.player}|${ev.team}`;
      if (!idSet.has(id)) continue;
      goals[id] += 1;
      changed = true;
    }
    if (!changed) continue;
    const rank = ranksByOrder(
      ids.map((id) => ({ id, v: goals[id] })),
      (a, b) => b.v - a.v,
    );
    frames.push({ key: m.id, label: raceDayLabel(m.utc) });
    for (const id of ids) ranksById.get(id).push(rank.get(id));
  }

  // `ids` follows goldenBootTable order, so it is the authoritative order.
  appendAuthoritativeFrame(frames, ranksById, ids, ids);
  const lines = tracked.map((r) => {
    const t = teamFor(r.team);
    return { id: `${r.player}|${r.team}`, label: r.player, flag: t.flag, color: r.owner?.color ?? RACE_NEUTRAL };
  });
  return finalizeRace('boot', frames, lines, ranksById, tracked.length);
}

// Survivors race — one line per employee, ranked by how many of their teams are
// still alive (rank 1 = most). A frame lands each time an owned team is knocked
// out: knockout losers at their match time, group non-qualifiers at the group
// stage close.
function survivorsRace(state, employees) {
  const ids = employees.map((e) => e.id);
  const ownerByCode = {};
  for (const e of employees) for (const t of e.teams) ownerByCode[t.fifaCode] = e.id;

  const elim = new Map();
  for (const m of state.knockoutMatches ?? []) {
    const loser = tieLoser(m);
    if (isRealTeam(loser) && m.utc) elim.set(loser, new Date(m.utc).getTime());
  }
  const qualified = r32Qualifiers(state);
  if (qualified) {
    const lastGroup = Math.max(
      0,
      ...(state.fixtures ?? [])
        .filter((f) => f.status === 'final' && f.utc)
        .map((f) => new Date(f.utc).getTime()),
    );
    if (lastGroup > 0) {
      for (const g of state.groups ?? []) {
        for (const row of g.standings ?? []) {
          if (isRealTeam(row.fifaCode) && !qualified.has(row.fifaCode) && !elim.has(row.fifaCode)) {
            elim.set(row.fifaCode, lastGroup);
          }
        }
      }
    }
  }

  const events = [];
  for (const [code, ms] of elim) {
    if (ownerByCode[code] != null && Number.isFinite(ms)) events.push({ ms, code });
  }
  events.sort((a, b) => a.ms - b.ms);

  const alive = Object.fromEntries(employees.map((e) => [e.id, e.teams.length]));
  const ranksById = new Map(ids.map((id) => [id, []]));
  const frames = [];
  for (let i = 0; i < events.length; ) {
    const ms = events[i].ms;
    while (i < events.length && events[i].ms === ms) {
      alive[ownerByCode[events[i].code]] -= 1;
      i++;
    }
    const rank = ranksByOrder(
      ids.map((id) => ({ id, v: alive[id] })),
      (a, b) => b.v - a.v,
    );
    frames.push({ key: `t${ms}`, label: raceDayLabel(new Date(ms).toISOString()) });
    for (const id of ids) ranksById.get(id).push(rank.get(id));
  }

  appendAuthoritativeFrame(
    frames,
    ranksById,
    ids,
    survivorsLeaderboard(state, employees).map((r) => r.employee.id),
  );
  // `alive` now holds each player's current teams-remaining count — surface it in
  // the line label so the chart reads e.g. "Eoin (4)".
  const lines = employees.map((e) => ({ id: e.id, label: `${e.name} (${alive[e.id]})`, color: e.color }));
  return finalizeRace('survivors', frames, lines, ranksById, employees.length);
}

/**
 * Build the position-over-time race for one leaderboard category.
 * @param {'overall'|'cards'|'worst'|'boot'|'survivors'} category
 */
export function positionRace(category, state, employees, { maxLines = RACE_MAX_LINES } = {}) {
  if (category === 'overall') return overallRace(state, employees);
  if (category === 'cards') return cardsRace(state, employees);
  if (category === 'worst') return worstRace(state, employees, maxLines);
  if (category === 'boot') return bootRace(state, employees, maxLines);
  if (category === 'survivors') return survivorsRace(state, employees);
  return emptyRace(category);
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
