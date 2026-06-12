/**
 * ESPN payloads → internal State shape. The only file that knows ESPN field names.
 * If we ever swap to API-Football, this is the file to rewrite.
 *
 * State shape (also produced by mock.js):
 *   {
 *     phase: 'group' | 'knockout' | 'winners',
 *     lastUpdated: ISO string,
 *     groups: [{ id, standings: [{ fifaCode, p, w, d, l, gf, ga, gd, pts }] }],
 *     fixtures: [{ id, utc, group, stage, home, away, homeGoals, awayGoals,
 *                  status, minute, venue, events }],
 *     knockoutMatches: [{ id, round, slot, utc, home, away, homeGoals,
 *                        awayGoals, status, minute }],
 *     topScorers: [{ player, team, goals }],
 *   }
 */
import { swr } from '../cache.js';
import { fetchScoreboard, fetchStandings, fetchSummary } from './espn.js';
import { fetchOpenFootball } from './openfootball.js';
import { rankGroups } from '../state/groupRanking.js';

// ── TTLs ─────────────────────────────────────────────────────────────────────
// scoreboard/standings/summary refresh cadence — short during live play, long
// when nothing's happening. The store calls swr() per-endpoint so a single
// refresh tick can use cached values for some and re-fetch others.
const TTL = {
  scoreboardLive: 30 * 1000,
  scoreboardIdle: 5 * 60 * 1000,
  standingsLive: 60 * 1000,
  standingsIdle: 10 * 60 * 1000,
  summaryLive: 30 * 1000,
  summaryFinal: 24 * 60 * 60 * 1000, // a final match's events never change
};

// ── ESPN status → internal status ─────────────────────────────────────────────
function statusOf(competition) {
  const name = competition?.status?.type?.name ?? '';
  if (/IN_PROGRESS|HALFTIME|FIRST_HALF|SECOND_HALF|EXTRA_TIME|SHOOTOUT/.test(name)) return 'live';
  if (/FINAL|FULL_TIME|END/.test(name)) return 'final';
  return 'scheduled';
}

function minuteOf(competition, status) {
  if (status !== 'live') return null;
  const clock = competition?.status?.displayClock ?? '';
  const m = parseInt(clock, 10);
  return Number.isFinite(m) ? m : null;
}

// ── Event detail extraction ──────────────────────────────────────────────────
function teamCodeFromCompetitor(c) {
  return c?.team?.abbreviation?.toUpperCase() ?? null;
}

function eventsFromDetails(competition) {
  const out = [];
  // ESPN puts scoring plays in `details` and cards too in some payloads. Both
  // shapes seen in the wild — type.text or type.id.
  for (const d of competition?.details ?? []) {
    const text = (d?.type?.text ?? '').toLowerCase();
    let kind = null;
    if (text.includes('goal') && !text.includes('saved')) kind = 'goal';
    else if (text.includes('yellow')) kind = 'yellow';
    else if (text.includes('red')) kind = 'red';
    if (!kind) continue;
    const teamId = d?.team?.id;
    const team = competition.competitors?.find((c) => c.team?.id === teamId);
    out.push({
      type: kind,
      team: teamCodeFromCompetitor(team),
      player: d.athletesInvolved?.[0]?.displayName ?? d.athletesInvolved?.[0]?.shortName ?? null,
      minute: parseInt(d?.clock?.displayValue, 10) || null,
    });
  }
  return out;
}

function eventsFromSummary(summary, abbrByTeamId) {
  const out = [];
  for (const e of summary?.keyEvents ?? []) {
    const text = (e?.type?.text ?? '').toLowerCase();
    let kind = null;
    if (text.includes('goal') && !text.includes('saved')) kind = 'goal';
    else if (text.includes('yellow')) kind = 'yellow';
    else if (text.includes('red')) kind = 'red';
    if (!kind) continue;
    out.push({
      type: kind,
      team: abbrByTeamId.get(e?.team?.id) ?? null,
      player: e.athletesInvolved?.[0]?.displayName ?? null,
      minute: parseInt(e?.clock?.displayValue, 10) || null,
    });
  }
  return out;
}

// ── Round / stage detection ──────────────────────────────────────────────────
const KNOCKOUT_PATTERNS = [
  { regex: /round\s*of\s*32|r32/i, round: 'R32' },
  { regex: /round\s*of\s*16|r16/i, round: 'R16' },
  { regex: /quarter|qf/i, round: 'QF' },
  { regex: /semi|sf/i, round: 'SF' },
  { regex: /third|3rd|bronze/i, round: 'Third' },
  { regex: /final/i, round: 'Final' }, // 'Final' last so 'Semi-final' doesn't match it first
];

function roundFromNotes(event) {
  const sources = [
    event?.competitions?.[0]?.notes?.[0]?.headline,
    event?.competitions?.[0]?.notes?.[0]?.text,
    event?.season?.type?.name,
    event?.name,
  ];
  for (const s of sources) {
    if (!s) continue;
    for (const p of KNOCKOUT_PATTERNS) {
      if (p.regex.test(s)) return p.round;
    }
  }
  return null;
}

function groupFromNotes(event) {
  const sources = [
    event?.competitions?.[0]?.notes?.[0]?.headline,
    event?.competitions?.[0]?.notes?.[0]?.text,
  ];
  for (const s of sources) {
    if (!s) continue;
    const m = /group\s+([a-l])/i.exec(s);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function stageFromDate(utc) {
  // Hard-coded fallback: group stage is 11–27 June 2026, knockouts start 28 June.
  // Used only when ESPN doesn't tag the event with a stage.
  if (!utc) return 'group';
  return new Date(utc) >= new Date('2026-06-27T22:00:00Z') ? 'knockout' : 'group';
}

// ── Scoreboard → fixtures + knockoutMatches ───────────────────────────────────
function partitionEvents(scoreboard) {
  const fixtures = [];
  const knockoutMatches = [];
  let slotCounters = { R32: 0, R16: 0, QF: 0, SF: 0, Third: 0, Final: 0 };

  for (const event of scoreboard?.events ?? []) {
    const comp = event?.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === 'home');
    const away = comp.competitors?.find((c) => c.homeAway === 'away');
    const homeCode = teamCodeFromCompetitor(home);
    const awayCode = teamCodeFromCompetitor(away);
    const status = statusOf(comp);
    const round = roundFromNotes(event);
    const stage = round ? 'knockout' : stageFromDate(event.date);
    const group = groupFromNotes(event);

    const base = {
      id: event.id,
      utc: event.date,
      home: homeCode,
      away: awayCode,
      homeGoals: status === 'scheduled' ? null : parseInt(home?.score, 10),
      awayGoals: status === 'scheduled' ? null : parseInt(away?.score, 10),
      status,
      minute: minuteOf(comp, status),
      venue: comp?.venue?.fullName ?? null,
      events: eventsFromDetails(comp),
    };

    if (stage === 'group') {
      fixtures.push({ ...base, group, stage: 'group' });
    } else {
      const r = round ?? 'R32';
      slotCounters[r] = (slotCounters[r] ?? 0) + 1;
      knockoutMatches.push({ ...base, round: r, slot: slotCounters[r] });
    }
  }

  return { fixtures, knockoutMatches };
}

// ── Standings → groups ────────────────────────────────────────────────────────
function statValue(entry, names) {
  for (const n of names) {
    const found = entry?.stats?.find((s) => s?.name === n);
    if (found && Number.isFinite(+found.value)) return +found.value;
  }
  return 0;
}

function normaliseStandings(payload) {
  // ESPN's WC standings nest groups under `children`. Some endpoints expose
  // them under `groups` instead — handle both.
  const containers = payload?.children ?? payload?.groups ?? [];
  return containers
    .map((g) => {
      const id =
        g?.abbreviation?.toUpperCase() ??
        (g?.name?.match(/group\s+([a-l])/i)?.[1]?.toUpperCase()) ??
        g?.id;
      const entries = g?.standings?.entries ?? g?.entries ?? [];
      const standings = entries
        .map((e) => {
          const w = statValue(e, ['wins']);
          const d = statValue(e, ['ties', 'draws']);
          const gf = statValue(e, ['pointsFor', 'goalsFor']);
          const ga = statValue(e, ['pointsAgainst', 'goalsAgainst']);
          return {
            fifaCode: e?.team?.abbreviation?.toUpperCase() ?? null,
            p: statValue(e, ['gamesPlayed']),
            w,
            d,
            l: statValue(e, ['losses']),
            gf,
            ga,
            // ESPN's differential stat name varies across payloads; GF−GA is
            // definitionally right whenever GF/GA came through.
            gd: gf || ga ? gf - ga : statValue(e, ['pointsDifferential', 'goalDifferential']),
            pts: statValue(e, ['points', 'totalPoints']) || w * 3 + d,
          };
        })
        .filter((s) => s.fifaCode);
      return { id, standings };
    })
    .filter((g) => g.id && g.standings.length);
}

// ── Top scorers — aggregate goals across all fixtures ─────────────────────────
function topScorersFrom(fixtures) {
  const tally = new Map();
  for (const fx of fixtures) {
    for (const ev of fx.events ?? []) {
      if (ev.type !== 'goal' || !ev.player) continue;
      const key = `${ev.team}|${ev.player}`;
      const cur = tally.get(key) ?? { player: ev.player, team: ev.team, goals: 0 };
      cur.goals += 1;
      tally.set(key, cur);
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals).slice(0, 12);
}

// ── Phase detection ───────────────────────────────────────────────────────────
function detectPhase({ fixtures, knockoutMatches }) {
  const final = knockoutMatches.find((m) => m.round === 'Final');
  if (final && final.status === 'final') return 'winners';
  if (knockoutMatches.some((m) => m.status === 'live' || m.status === 'final')) return 'knockout';
  return 'group';
}

// ── Team metadata extraction (for modals) ─────────────────────────────────────
// Walk the scoreboard once and pull out ESPN team IDs + brand info per
// abbreviation. This is what the team modal needs to fetch /teams/{id} for
// roster / stats / schedule.
function extractTeamRefs(scoreboard) {
  const refs = {};
  for (const event of scoreboard?.events ?? []) {
    for (const c of event?.competitions?.[0]?.competitors ?? []) {
      const code = c?.team?.abbreviation?.toUpperCase();
      if (!code || refs[code]) continue;
      refs[code] = {
        espnId: c.team.id ?? null,
        name: c.team.displayName ?? c.team.name ?? code,
        shortName: c.team.shortDisplayName ?? c.team.name ?? code,
        logoUrl: c.team.logos?.[0]?.href ?? null,
        color: c.team.color ? `#${c.team.color}` : null,
        alternateColor: c.team.alternateColor ? `#${c.team.alternateColor}` : null,
      };
    }
  }
  return refs;
}

// ── Public entry point — orchestrates everything ──────────────────────────────
export async function fetchLiveState() {
  // 1. baseline schedule from openfootball (skeleton groups + fixtures with no scores)
  const baseline = await fetchOpenFootball();

  // 2. ESPN scoreboard (covers the whole tournament window in one call)
  const anyLive = (existing) =>
    (existing?.fixtures ?? []).some((f) => f.status === 'live') ||
    (existing?.knockoutMatches ?? []).some((m) => m.status === 'live');
  const scoreboardTtl = anyLive(baseline) ? TTL.scoreboardLive : TTL.scoreboardIdle;
  const sb = await swr('espn:scoreboard', () => fetchScoreboard(), scoreboardTtl);

  // 3. ESPN standings
  const standingsTtl = anyLive(baseline) ? TTL.standingsLive : TTL.standingsIdle;
  const st = await swr('espn:standings', () => fetchStandings(), standingsTtl);

  let fixtures = baseline.fixtures;
  let knockoutMatches = baseline.knockoutMatches ?? [];

  // Gate: only accept ESPN's resolved knockout-team assignments once the
  // group stage's last match has kicked off — otherwise ESPN's pre-tournament
  // bracket previews leak host-seeded R32 matchups into the bracket before
  // they're actually decided. Up to that point we keep the openfootball
  // placeholders ('1A', 'W74', '3A/B/C/D/F').
  const lastGroupKickoff = Math.max(
    0,
    ...(baseline.fixtures ?? [])
      .filter((f) => f.stage === 'group' && f.utc)
      .map((f) => new Date(f.utc).getTime()),
  );
  const knockoutPhaseStarted = lastGroupKickoff > 0 && Date.now() >= lastGroupKickoff;

  if (sb.value) {
    const partitioned = partitionEvents(sb.value);
    fixtures = mergeFixtures(baseline.fixtures, partitioned.fixtures);
    if (partitioned.knockoutMatches.length) {
      knockoutMatches = mergeKnockouts(knockoutMatches, partitioned.knockoutMatches, {
        acceptTeams: knockoutPhaseStarted,
      });
    }
  }

  // openfootball baseline owns the *structure* — group IDs (A-L) and which
  // teams sit in each group. ESPN owns the *stats* (P/W/D/L/GF/GA/Pts/GD).
  // We merge stat rows in by fifaCode rather than letting ESPN's payload
  // replace the group structure wholesale — ESPN's group IDs are internal
  // numeric ids that don't match the FIFA letter scheme.
  const espnGroups = st.value ? normaliseStandings(st.value) : [];
  // openfootball's baseline lists teams in draw order — re-rank each group by
  // the FIFA tie-break rules once real stats are merged in.
  const groups = rankGroups(mergeGroupStats(baseline.groups ?? [], espnGroups), fixtures);
  const topScorers = topScorersFrom([...fixtures, ...knockoutMatches]);
  const phase = detectPhase({ fixtures, knockoutMatches });
  const teamsRef = sb.value ? extractTeamRefs(sb.value) : {};

  return {
    phase,
    lastUpdated: new Date().toISOString(),
    groups,
    fixtures,
    knockoutMatches,
    topScorers,
    teamsRef,
    _diagnostics: {
      sources: { scoreboard: sb.source, standings: st.source, baseline: baseline.source },
      errors: [sb.error, st.error, baseline.error].filter(Boolean).map(String),
    },
  };
}

function mergeGroupStats(baseline, espn) {
  if (!espn.length) return baseline;
  // Flatten ESPN's standings into a fifaCode → stats lookup. Ignores ESPN's
  // own group IDs (which may be numeric internal ids, not 'A'/'B'/etc.) and
  // trusts the openfootball baseline for group structure.
  const statsByTeam = {};
  for (const g of espn) {
    for (const row of g.standings ?? []) {
      if (row.fifaCode) statsByTeam[row.fifaCode] = row;
    }
  }
  return baseline.map((g) => ({
    ...g,
    standings: g.standings.map((row) => {
      const live = statsByTeam[row.fifaCode];
      return live ? { ...row, ...live } : row;
    }),
  }));
}

function mergeKnockouts(baseline, espn, { acceptTeams = true } = {}) {
  // Match by (round, slot). Pre-knockout-phase (`acceptTeams: false`) keeps
  // baseline placeholders even when ESPN supplies real codes — ESPN sometimes
  // publishes tentative R32 matchups for host seeds before the group stage
  // resolves. After the last group match has kicked off we trust ESPN.
  const byKey = new Map();
  for (const b of baseline) byKey.set(`${b.round}|${b.slot}`, b);
  const out = [...baseline];
  for (const e of espn) {
    const k = `${e.round}|${e.slot}`;
    const existing = byKey.get(k);
    if (existing) {
      const espnHasRealTeams = isRealCode(e.home) && isRealCode(e.away);
      const baselineIsPlaceholder = !isRealCode(existing.home) || !isRealCode(existing.away);
      if (baselineIsPlaceholder && espnHasRealTeams && acceptTeams) {
        // accept ESPN's resolved teams + everything else
        Object.assign(existing, e);
      } else {
        // either gate is closed, or baseline already had real teams. Either
        // way, keep baseline's home/away and just take ESPN's scores/status/etc.
        Object.assign(existing, e, { home: existing.home, away: existing.away });
      }
    } else if (acceptTeams || !isRealCode(e.home)) {
      // new entry — only append if either we're past the gate, or this entry
      // has placeholder teams (in which case it's just structural)
      out.push(e);
    }
  }
  return out;
}

function isRealCode(code) {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code);
}

function mergeFixtures(baseline, espn) {
  // For each ESPN fixture, find the matching baseline entry by home+away+date;
  // overlay scores, status, events. Baseline entries with no ESPN counterpart
  // stay as scheduled. Any ESPN fixture that doesn't match baseline is appended.
  const byKey = new Map();
  for (const f of baseline) {
    const day = (f.utc ?? '').slice(0, 10);
    byKey.set(`${day}|${f.home}|${f.away}`, f);
  }
  const out = [...baseline];
  for (const f of espn) {
    const day = (f.utc ?? '').slice(0, 10);
    const key = `${day}|${f.home}|${f.away}`;
    const existing = byKey.get(key);
    if (existing) {
      Object.assign(existing, f);
    } else {
      out.push(f);
    }
  }
  return out;
}

/**
 * Optional follow-up fetch — pulls richer event detail (scoring plays + cards)
 * from the per-match /summary endpoint for any live or recently-finished match
 * that the scoreboard didn't already include events for. Cache is permanent
 * for finals, short for live.
 *
 * Called separately from fetchLiveState() so the initial paint is fast and
 * event detail backfills in the next tick.
 */
export async function backfillEvents(state) {
  const updates = [];
  for (const match of [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])]) {
    if (match.status === 'scheduled') continue;
    if ((match.events ?? []).length > 0) continue;
    const ttl = match.status === 'live' ? TTL.summaryLive : TTL.summaryFinal;
    const res = await swr(`espn:summary:${match.id}`, () => fetchSummary(match.id), ttl);
    if (!res.value) continue;

    const abbrByTeamId = new Map();
    const comp = res.value?.header?.competitions?.[0] ?? res.value?.gamepackageJSON?.header?.competitions?.[0];
    for (const c of comp?.competitors ?? []) {
      if (c?.team?.id && c?.team?.abbreviation) {
        abbrByTeamId.set(c.team.id, c.team.abbreviation.toUpperCase());
      }
    }
    updates.push({ id: match.id, events: eventsFromSummary(res.value, abbrByTeamId) });
  }
  if (!updates.length) return state;

  // Apply updates
  const byId = new Map(updates.map((u) => [u.id, u.events]));
  const mapper = (m) => (byId.has(m.id) ? { ...m, events: byId.get(m.id) } : m);
  const next = {
    ...state,
    fixtures: state.fixtures.map(mapper),
    knockoutMatches: state.knockoutMatches.map(mapper),
  };
  next.topScorers = topScorersFrom([...next.fixtures, ...next.knockoutMatches]);
  return next;
}
