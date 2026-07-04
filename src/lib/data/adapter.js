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
import { TEAMS } from './teams.js';

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
  const type = competition?.status?.type ?? {};
  const name = type.name ?? '';
  // `completed` is ESPN's definitive "the game is over" flag — trust it first so
  // a knockout tie decided on penalties (whose status name can read SHOOTOUT)
  // settles to final instead of looking perpetually live.
  if (type.completed === true) return 'final';
  if (/IN_PROGRESS|HALFTIME|FIRST_HALF|SECOND_HALF|EXTRA_TIME|SHOOTOUT|PENALT/.test(name)) return 'live';
  if (/FINAL|FULL_TIME|END/.test(name)) return 'final';
  return 'scheduled';
}

// Penalty-shootout tally for a competitor, when the tie went to spot-kicks.
// ESPN exposes it as `shootoutScore`; absent for games settled in normal time.
function shootoutOf(competitor) {
  const v = competitor?.shootoutScore;
  return v == null || v === '' || !Number.isFinite(+v) ? null : parseInt(v, 10);
}

function minuteOf(competition, status) {
  if (status !== 'live') return null;
  const clock = competition?.status?.displayClock ?? '';
  const m = parseInt(clock, 10);
  return Number.isFinite(m) ? m : null;
}

// ── Team-code aliasing ────────────────────────────────────────────────────────
// ESPN's `team.abbreviation` sometimes diverges from the FIFA code this app
// treats as canonical (the keys of TEAMS in teams.js) — almost always because
// ESPN uses the ISO-3166 alpha-3 country code where FIFA's own code differs.
// This was the third of three independent ways a knockout event could fail to
// join the openfootball baseline and get silently dropped (see
// docs/PLAN-knockout-live-scores.md) — a `MOR` event keyed against a baseline
// cell that only knows `MAR` and never matched. Keyed by ESPN's abbreviation,
// valued by the FIFA code used everywhere else in the app.
const ESPN_CODE_ALIASES = {
  MOR: 'MAR', // Morocco — ESPN's English-name abbreviation vs FIFA's MAR
  DZA: 'ALG', // Algeria — ISO alpha-3 vs FIFA code
  SAU: 'KSA', // Saudi Arabia — ESPN abbreviation vs FIFA's KSA
  IRI: 'IRN', // Iran — ESPN abbreviation vs FIFA's IRN
  CHE: 'SUI', // Switzerland — ISO alpha-3 (Confoederatio Helvetica) vs FIFA SUI
  SWI: 'SUI', // Switzerland — alternate ESPN abbreviation seen for SUI
  HTI: 'HAI', // Haiti — ISO alpha-3 vs FIFA HAI
  CUR: 'CUW', // Curaçao — ESPN abbreviation vs FIFA CUW
  PRY: 'PAR', // Paraguay — ISO alpha-3 vs FIFA PAR
  URY: 'URU', // Uruguay — ISO alpha-3 vs FIFA URU
  DEU: 'GER', // Germany — ISO alpha-3 (Deutschland) vs FIFA GER
  NLD: 'NED', // Netherlands — ISO alpha-3 vs FIFA NED
  PRT: 'POR', // Portugal — ISO alpha-3 vs FIFA POR
  HRV: 'CRO', // Croatia — ISO alpha-3 (Hrvatska) vs FIFA CRO
  ZAF: 'RSA', // South Africa — ISO alpha-3 vs FIFA RSA
  SAF: 'RSA', // South Africa — alternate ESPN abbreviation seen for RSA
};

// Apply the alias map, and — when handed a collector — record any code that,
// even after aliasing, still isn't one of our 48 known teams (Task 4
// diagnostics). That's how a *fourth*, as-yet-unseen abbreviation divergence
// would surface on the footer instead of silently dropping its match the way
// MOR did.
function aliasCode(raw, unknownCodes) {
  if (!raw) return null;
  const up = raw.toUpperCase();
  const mapped = ESPN_CODE_ALIASES[up] ?? up;
  if (unknownCodes && !TEAMS[mapped]) unknownCodes.add(mapped);
  return mapped;
}

// ── Event detail extraction ──────────────────────────────────────────────────
function teamCodeFromCompetitor(c, unknownCodes) {
  return aliasCode(c?.team?.abbreviation, unknownCodes);
}

// Classify an ESPN scoring/disciplinary play (by its `type.text`) into our event
// kinds. Cards are detected via the word "card" so that a naive substring check
// can't misfire — notably `includes('red')` matched "Penalty - Sco**red**" and
// turned penalty goals into red cards (a player "sent off" who then "scored").
function classifyEvent(rawText) {
  const text = (rawText ?? '').toLowerCase();
  if (text.includes('card')) {
    // A second yellow ("Yellow Red Card") is a sending-off, so red wins.
    if (text.includes('red')) return 'red';
    if (text.includes('yellow')) return 'yellow';
    return null;
  }
  // A penalty only counts as a goal when it was actually scored.
  if (text.includes('saved') || text.includes('missed') || text.includes('disallow')) return null;
  if (text.includes('goal') || text.includes('scored')) return 'goal';
  return null;
}

function eventsFromDetails(competition) {
  const out = [];
  // ESPN puts scoring plays in `details` and cards too in some payloads.
  for (const d of competition?.details ?? []) {
    const kind = classifyEvent(d?.type?.text);
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
    const kind = classifyEvent(e?.type?.text);
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
// `[\s-]*` (rather than `\s*`) between words so "Round-of-32"/"Round of 32"
// both match — ESPN's notes hyphenate inconsistently across payloads. Plain
// substring checks like `quarter`/`semi` already catch "Quarterfinals" and
// "Semifinals" with no separator at all.
const KNOCKOUT_PATTERNS = [
  { regex: /round[\s-]*of[\s-]*32|\br[\s-]*32\b/i, round: 'R32' },
  { regex: /round[\s-]*of[\s-]*16|\br[\s-]*16\b/i, round: 'R16' },
  { regex: /quarter|qf/i, round: 'QF' },
  { regex: /semi|sf/i, round: 'SF' },
  { regex: /third|3rd|bronze/i, round: 'Third' },
  { regex: /final/i, round: 'Final' }, // 'Final' last so 'Semi-final' doesn't match it first
];

function roundFromNotes(event) {
  // Scan every notes entry (ESPN sometimes puts the round label on notes[1]
  // or later, or only in `.text` rather than `.headline`) before falling back
  // to the season/event name sources. A single unrecognised notes[0] used to
  // be enough to lose the round label entirely.
  const notes = event?.competitions?.[0]?.notes ?? [];
  const sources = [
    ...notes.flatMap((n) => [n?.headline, n?.text]),
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

// Fixed FIFA World Cup 2026 knockout calendar (UTC kickoff dates) — the last
// resort when ESPN's notes carry no recognisable round label at all (this was
// trigger (a) of the 4 July incident: an unlabeled event defaulted to 'R32'
// via `round ?? 'R32'`, which was only right by coincidence during the actual
// Round of 32). Deliberately returns null on the "travel days" between rounds
// (8/12/13/16/17 July) rather than guessing — a rescheduled or gap-day match
// is caught by notes, or by mergeKnockouts()'s pair-only join, not by date.
const ROUND_DATE_WINDOWS = [
  { round: 'R32', start: '2026-06-28', end: '2026-07-03' },
  { round: 'R16', start: '2026-07-04', end: '2026-07-07' },
  { round: 'QF', start: '2026-07-09', end: '2026-07-11' },
  { round: 'SF', start: '2026-07-14', end: '2026-07-15' },
  { round: 'Third', start: '2026-07-18', end: '2026-07-18' },
  { round: 'Final', start: '2026-07-19', end: '2026-07-19' },
];

export function roundFromDate(utc) {
  if (!utc) return null;
  // Compare on the UTC calendar date only — `utc` is an ISO instant (e.g.
  // '2026-07-04T17:00:00Z'), and a plain string slice/compare against
  // YYYY-MM-DD window bounds is exact for that without a Date/timezone detour.
  const day = String(utc).slice(0, 10);
  for (const w of ROUND_DATE_WINDOWS) {
    if (day >= w.start && day <= w.end) return w.round;
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
function partitionEvents(scoreboard, unknownCodes) {
  const fixtures = [];
  const knockoutMatches = [];
  let slotCounters = { R32: 0, R16: 0, QF: 0, SF: 0, Third: 0, Final: 0 };

  for (const event of scoreboard?.events ?? []) {
    const comp = event?.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === 'home');
    const away = comp.competitors?.find((c) => c.homeAway === 'away');
    const homeCode = teamCodeFromCompetitor(home, unknownCodes);
    const awayCode = teamCodeFromCompetitor(away, unknownCodes);
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
      homeShootout: status === 'scheduled' ? null : shootoutOf(home),
      awayShootout: status === 'scheduled' ? null : shootoutOf(away),
      status,
      minute: minuteOf(comp, status),
      venue: comp?.venue?.fullName ?? null,
      events: eventsFromDetails(comp),
      // Provenance for backfillEvents(): 'espn' details are already the real
      // thing; 'baseline' (openfootball) goal lists lack cards and still want
      // a summary fetch; 'summary' is the terminal, richest form.
      eventsSource: 'espn',
    };

    if (stage === 'group') {
      fixtures.push({ ...base, group, stage: 'group' });
    } else {
      // Notes label wins; failing that, infer from the fixed 2026 calendar;
      // only fall back to the (usually-wrong) R32 default if neither source
      // has an answer (e.g. an event on a gap day with unrecognisable notes).
      const r = round ?? roundFromDate(event.date) ?? 'R32';
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

function normaliseStandings(payload, unknownCodes) {
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
            fifaCode: aliasCode(e?.team?.abbreviation, unknownCodes),
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
export function topScorersFrom(fixtures) {
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
  return [...tally.values()]
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player))
    .slice(0, 12);
}

// ── News ──────────────────────────────────────────────────────────────────────
// ESPN /news payload → flat article list for the dialogs' News tabs. The feed
// carries no body text — every article is a headline + blurb linking out to
// espn.com, so the UI opens them in a new tab.
export function normaliseNews(payload) {
  return (payload?.articles ?? [])
    .map((a) => ({
      id: a?.dataSourceIdentifier ?? a?.links?.web?.href ?? a?.headline,
      headline: a?.headline ?? null,
      description: a?.description ?? null,
      published: a?.published ?? a?.lastModified ?? null,
      byline: a?.byline ?? null,
      url: a?.links?.web?.href ?? a?.links?.mobile?.href ?? null,
      image: a?.images?.[0]?.url ?? null,
    }))
    .filter((a) => a.headline && a.url);
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
      // Key by the aliased FIFA code, not ESPN's raw abbreviation — TeamModal
      // and GameModal look this up as `teamsRef[fifaCode]` using the same
      // codes the rest of the app uses (e.g. 'MAR'), so an unaliased 'MOR' key
      // here would leave Morocco's team modal unable to find its ESPN id.
      const code = teamCodeFromCompetitor(c);
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
// `live` comes from the store's view of the *current* snapshot — it shortens
// the scoreboard/standings cache TTLs during a match so 60-second ticks
// actually reach the network. (It used to be inferred from the openfootball
// baseline, whose fixtures are always 'scheduled', so it was never true and
// live polling silently degraded to 5-minute freshness.)
export async function fetchLiveState({ live = false } = {}) {
  // 1. baseline schedule from openfootball (skeleton groups + fixtures with no scores)
  const baseline = await fetchOpenFootball();

  // 2. ESPN scoreboard (covers the whole tournament window in one call)
  const scoreboardTtl = live ? TTL.scoreboardLive : TTL.scoreboardIdle;
  const sb = await swr('espn:scoreboard', () => fetchScoreboard(), scoreboardTtl);

  // 3. ESPN standings
  const standingsTtl = live ? TTL.standingsLive : TTL.standingsIdle;
  const st = await swr('espn:standings', () => fetchStandings(), standingsTtl);

  let fixtures = baseline.fixtures;
  let knockoutMatches = baseline.knockoutMatches ?? [];

  // Collected across the whole call (Task 4 diagnostics): any competitor code
  // that's still not a known team after aliasing, and any ESPN knockout event
  // that never found a home in the bracket. Both used to fail completely
  // silently — see docs/PLAN-knockout-live-scores.md.
  const unknownCodes = new Set();
  let droppedKnockoutEvents = [];

  if (sb.value) {
    const partitioned = partitionEvents(sb.value, unknownCodes);
    fixtures = mergeFixtures(baseline.fixtures, partitioned.fixtures);
    if (partitioned.knockoutMatches.length) {
      // Alternate two steps until the bracket stops changing:
      //   1. merge ESPN results in (joined by real team pairing, so ESPN's
      //      pre-tournament previews can't leak into placeholder cells)
      //   2. resolve "W74"/"L101" feeder placeholders into the actual winners
      // Each round carries results one rung up the bracket (R32 → R16 → …), and
      // re-merging lets ESPN's own scores attach to a tie once we've filled in
      // its teams. Only the FINAL pass's drop list is kept — earlier passes can
      // list an event as unmatched purely because a placeholder hadn't
      // resolved yet, and every pass re-merges the same ESPN events, so
      // collecting from all passes would just duplicate the same diagnostic.
      for (let pass = 0; pass < 5; pass++) {
        const result = mergeKnockouts(knockoutMatches, partitioned.knockoutMatches);
        knockoutMatches = result.matches;
        droppedKnockoutEvents = result.dropped;
        if (!resolveBracketProgression(knockoutMatches)) break;
      }
    }
  }

  // openfootball baseline owns the *structure* — group IDs (A-L) and which
  // teams sit in each group. ESPN owns the *stats* (P/W/D/L/GF/GA/Pts/GD).
  // We merge stat rows in by fifaCode rather than letting ESPN's payload
  // replace the group structure wholesale — ESPN's group IDs are internal
  // numeric ids that don't match the FIFA letter scheme.
  const espnGroups = st.value ? normaliseStandings(st.value, unknownCodes) : [];
  // openfootball's baseline lists teams in draw order — re-rank each group by
  // the FIFA tie-break rules once real stats are merged in.
  const groups = rankGroups(mergeGroupStats(baseline.groups ?? [], espnGroups), fixtures);
  const topScorers = topScorersFrom([...fixtures, ...knockoutMatches]);
  const phase = detectPhase({ fixtures, knockoutMatches });
  const teamsRef = sb.value ? extractTeamRefs(sb.value) : {};

  const unknownCodesList = [...unknownCodes];
  // One console.warn per fetchLiveState call (not per render/poll-tick
  // renderer) so a regression shows up in the console the moment it recurs,
  // without spamming on every Svelte re-render of the footer.
  if (droppedKnockoutEvents.length || unknownCodesList.length) {
    console.warn('[adapter] knockout merge diagnostics', {
      droppedKnockoutEvents,
      unknownCodes: unknownCodesList,
    });
  }

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
      droppedKnockoutEvents,
      unknownCodes: unknownCodesList,
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

// Unordered pair key of two real team codes — the part of the join key that's
// actually unique across a whole knockout tournament (two teams play each
// other in a given knockout stage exactly once, ever). Returns null unless
// BOTH teams are resolved to real 3-letter codes; bracket-placeholder cells
// ("W74", "1A", "3A/B/C/D/F") deliberately never produce a key so nothing
// joins onto them before they're resolved.
function pairOnlyKey(home, away) {
  if (!isRealCode(home) || !isRealCode(away)) return null;
  const [a, b] = [home, away].sort();
  return `${a}|${b}`;
}

// Join key for a knockout fixture: its round plus the unordered pair of real
// team codes.
function knockoutPairKey(round, home, away) {
  const pair = pairOnlyKey(home, away);
  return pair ? `${round}|${pair}` : null;
}

function isRealCode(code) {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code);
}

// True once an entry (fixture or knockout match) carries an actual result —
// i.e. it's no longer just a scheduled placeholder. Used by the anti-clobber
// guard below: a `scheduled` ESPN event must never blank out a result we
// already have, whether that came from an earlier ESPN poll or (once the
// openfootball fallback carries results) the baseline itself.
function hasResult(entry) {
  return entry.status !== 'scheduled' || entry.homeGoals != null || entry.awayGoals != null;
}

// Overlay `incoming` (an ESPN-sourced fixture/knockout entry) onto `existing`
// (a baseline or previously-merged entry), plus any `extra` fields the caller
// wants to force afterwards (e.g. preserving the baseline's round/slot/num).
// Guards against the "stale rescan" clobber: ESPN's scoreboard call spans the
// whole tournament, so a later poll can hand us the SAME event back still
// tagged `scheduled` (a transient ESPN glitch, a mid-write payload, or simply
// a slow-to-update mirror) after we've already recorded its final score. In
// that case we keep the existing score/status/minute/events and only refresh
// `id` — ESPN's id can change between "preview" and "final" objects for the
// same match, and the game modal needs the current one to fetch /summary.
function overlayLive(existing, incoming, extra) {
  if (incoming.status === 'scheduled' && hasResult(existing)) {
    Object.assign(existing, { id: incoming.id }, extra);
    return existing;
  }
  // ESPN's scoreboard often carries no `details` at all, so `incoming.events`
  // can be empty even for a played match. Don't let that blank out events we
  // already have (openfootball's goalscorer list, or an earlier summary
  // backfill) — an empty list is never better than a populated one.
  const keepEvents =
    (incoming.events ?? []).length === 0 && (existing.events ?? []).length > 0
      ? { events: existing.events, eventsSource: existing.eventsSource }
      : null;
  Object.assign(existing, incoming, extra);
  if (keepEvents) Object.assign(existing, keepEvents);
  return existing;
}

function mergeKnockouts(baseline, espn) {
  // Overlay ESPN's live data (score, status, id, events, minute) onto the
  // openfootball bracket by matching the actual TEAM PAIRING — never by array
  // position, kickoff time, or chronological rank. Those all assume the two
  // feeds agree on which fixture sits where, and they don't: positional/time
  // joins repeatedly dropped a played game's score and details onto an
  // unrelated, unplayed cell (e.g. Germany v Paraguay showing Austria v
  // Algeria's 3-3 and key events). Matching on the unordered pair of real team
  // codes is unambiguous — a result only lands on the cell whose two teams are
  // exactly that game's teams.
  //
  // Three joins are tried, in order of confidence, before giving up:
  //   1. round|pair  — ESPN tagged the right round AND the right codes.
  //   2. pair only   — ESPN mis-tagged the round (trigger (a)/(b) of the 4 July
  //      incident) but the pair of real codes is unique tournament-wide, so we
  //      trust the baseline's round/slot/num and just take ESPN's live fields.
  //   3. same UTC day + same round, exactly one still-unmatched baseline cell
  //      with an unresolved team that day — conservative last resort for when
  //      one/both codes can't be paired at all (still-placeholder cell, or an
  //      alias we don't know about yet).
  // Anything that survives all three is either appended (no baseline structure
  // exists for that round at all) or recorded as a dropped diagnostic — never
  // silently discarded.
  const byPair = new Map();
  const byPairOnly = new Map();
  const baselineRoundCounts = {};
  for (const b of baseline) {
    baselineRoundCounts[b.round] = (baselineRoundCounts[b.round] ?? 0) + 1;
    const k = knockoutPairKey(b.round, b.home, b.away);
    if (k) byPair.set(k, b);
    const pk = pairOnlyKey(b.home, b.away);
    if (pk) byPairOnly.set(pk, b);
  }

  const out = [...baseline];
  const dropped = [];
  const matched = new Set(); // baseline entries already overlaid this pass
  const deferred = []; // espn events that missed joins 1 & 2 — try join 3

  for (const e of espn) {
    const existing1 = byPair.get(knockoutPairKey(e.round, e.home, e.away));
    if (existing1) {
      overlayLive(existing1, e, { round: existing1.round, slot: existing1.slot, num: existing1.num });
      matched.add(existing1);
      continue;
    }
    const existing2 = byPairOnly.get(pairOnlyKey(e.home, e.away));
    if (existing2) {
      // Join 2: same two teams, different round than ESPN claimed. openfootball's
      // bracket structure doesn't mislabel rounds; ESPN's notes/date guess did —
      // so keep the baseline's round, slot, AND num, only taking ESPN's live
      // fields (score/status/minute/events/id).
      overlayLive(existing2, e, { round: existing2.round, slot: existing2.slot, num: existing2.num });
      matched.add(existing2);
      continue;
    }
    deferred.push(e);
  }

  // Join 3: same-day + same-round heuristic, only when unambiguous. This is
  // for events where the pair itself didn't resolve — usually because a
  // baseline cell's teams are still bracket placeholders ("W74") and ESPN
  // already knows the real teams. If more than one baseline cell in that
  // round that day is still unmatched, we can't tell which one ESPN means, so
  // we leave it for the drop diagnostic rather than guess wrong.
  for (const e of deferred) {
    const day = (e.utc ?? '').slice(0, 10);
    const candidates = baseline.filter(
      (b) =>
        !matched.has(b) &&
        b.round === e.round &&
        (b.utc ?? '').slice(0, 10) === day &&
        (!isRealCode(b.home) || !isRealCode(b.away)),
    );
    if (candidates.length === 1) {
      const target = candidates[0];
      overlayLive(target, e, { round: target.round, slot: target.slot, num: target.num });
      matched.add(target);
      continue;
    }
    if (!baselineRoundCounts[e.round]) {
      // Only fall back to ESPN's own entry when openfootball provides no
      // structure for this round at all (e.g. it's unreachable). Otherwise an
      // unmatched ESPN event is an extra — a different/mis-tagged fixture —
      // and appending it would pollute or duplicate the bracket.
      out.push(e);
    } else {
      dropped.push({
        id: e.id,
        name: `${e.home ?? '?'} v ${e.away ?? '?'}`,
        round: e.round,
        home: e.home,
        away: e.away,
        reason:
          candidates.length > 1
            ? 'ambiguous same-day match — multiple unresolved baseline cells that round'
            : 'no baseline pairing (round|pair, pair-only, and same-day joins all missed)',
      });
    }
  }

  return { matches: out, dropped };
}

// Winner / loser codes of a decided knockout tie (null while undecided). Handles
// penalty shootouts — a level tie is settled on the shootout tally.
function decideTie(m) {
  if (m?.status !== 'final' || m.homeGoals == null || m.awayGoals == null) return { w: null, l: null };
  if (m.homeGoals > m.awayGoals) return { w: m.home, l: m.away };
  if (m.awayGoals > m.homeGoals) return { w: m.away, l: m.home };
  if (m.homeShootout != null && m.awayShootout != null && m.homeShootout !== m.awayShootout) {
    return m.homeShootout > m.awayShootout ? { w: m.home, l: m.away } : { w: m.away, l: m.home };
  }
  return { w: null, l: null };
}

// Fill knockout bracket progression: openfootball seeds later rounds with feeder
// references like "W74" (winner of match 74) or "L101" (loser of 101). Once we
// know a tie's result we can resolve those into the real team codes ourselves,
// so the Round of 16+ shows who advanced without waiting for the feed to publish
// the next-round draw. Iterates so a resolved R16 winner feeds the QF, and so on.
// Returns true if it changed anything.
function resolveBracketProgression(knockoutMatches) {
  const byNum = new Map();
  for (const m of knockoutMatches) if (m.num != null) byNum.set(String(m.num), m);
  const resolve = (code) => {
    const ref = /^([WL])(\d+)$/.exec(String(code ?? ''));
    if (!ref) return null; // already a real team (or an unknown placeholder)
    const src = byNum.get(ref[2]);
    if (!src) return null;
    const decided = decideTie(src);
    const team = ref[1] === 'W' ? decided.w : decided.l;
    return isRealCode(team) ? team : null;
  };
  let changedEver = false;
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const m of knockoutMatches) {
      const h = resolve(m.home);
      if (h && h !== m.home) { m.home = h; changed = true; }
      const a = resolve(m.away);
      if (a && a !== m.away) { m.away = a; changed = true; }
    }
    changedEver ||= changed;
    if (!changed) break;
  }
  return changedEver;
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
      // Same anti-clobber guard as mergeKnockouts(): a scheduled ESPN re-poll
      // must not blank out a result we already recorded.
      overlayLive(existing, f);
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
    // openfootball's goal events are a fallback, not the real thing — they
    // carry no cards, and cards feed the most-cards prize. So baseline-sourced
    // events don't count as "already have events": the summary still gets
    // fetched and, when it delivers, replaces them.
    if ((match.events ?? []).length > 0 && match.eventsSource !== 'baseline') continue;
    // Only ESPN event ids can be summaried — a match that never merged with
    // ESPN still has its openfootball id ('of-90') and would just burn a
    // failing request every tick (swr doesn't cache failures).
    if (!/^\d+$/.test(String(match.id))) continue;
    const ttl = match.status === 'live' ? TTL.summaryLive : TTL.summaryFinal;
    const res = await swr(`espn:summary:${match.id}`, () => fetchSummary(match.id), ttl);
    if (!res.value) continue;

    const abbrByTeamId = new Map();
    const comp = res.value?.header?.competitions?.[0] ?? res.value?.gamepackageJSON?.header?.competitions?.[0];
    for (const c of comp?.competitors ?? []) {
      if (c?.team?.id && c?.team?.abbreviation) {
        abbrByTeamId.set(c.team.id, aliasCode(c.team.abbreviation));
      }
    }
    const events = eventsFromSummary(res.value, abbrByTeamId);
    // A summary with no extractable events must not blank out the baseline's
    // goalscorers — keep what we have and try again next tick.
    if (!events.length && (match.events ?? []).length > 0) continue;
    updates.push({ id: match.id, events });
  }
  if (!updates.length) return state;

  // Apply updates
  const byId = new Map(updates.map((u) => [u.id, u.events]));
  const mapper = (m) => (byId.has(m.id) ? { ...m, events: byId.get(m.id), eventsSource: 'summary' } : m);
  const next = {
    ...state,
    fixtures: state.fixtures.map(mapper),
    knockoutMatches: state.knockoutMatches.map(mapper),
  };
  next.topScorers = topScorersFrom([...next.fixtures, ...next.knockoutMatches]);
  return next;
}
