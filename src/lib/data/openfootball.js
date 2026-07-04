/**
 * Baseline fixtures from the public-domain openfootball/worldcup.json dataset.
 * Used as the schedule/group skeleton — ESPN data overlays live scores + events
 * on top. Lets the UI render sensibly even if ESPN is down or empty.
 *
 * Source: https://github.com/openfootball/worldcup.json — no key required.
 * Note: openfootball uses full team names ("Mexico", "Czech Republic"), not
 * FIFA 3-letter codes. We translate via NAME_TO_CODE below. Knockout slots
 * before the group stage resolves are placeholders like "1A" (winner of Group
 * A), "W73" (winner of match 73), "3A/B/C/D/F" (best-third). We pass these
 * through as-is — the bracket component renders them as labelled TBD slots.
 */
import { swr } from '../cache.js';

const URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// 1h — during the tournament results land same-day and this feed is now a
// results fallback (see fetchOpenFootball() below), not just a schedule
// skeleton, so it needs to refresh faster than the pre-tournament 6h TTL.
const TTL = 60 * 60 * 1000;

// Openfootball name → FIFA 3-letter code. Covers exactly the 48 teams that
// qualify for WC2026 plus the 'Ivory Coast' / 'Côte d'Ivoire' alias.
const NAME_TO_CODE = {
  Algeria: 'ALG',
  Argentina: 'ARG',
  Australia: 'AUS',
  Austria: 'AUT',
  Belgium: 'BEL',
  'Bosnia & Herzegovina': 'BIH',
  Brazil: 'BRA',
  Canada: 'CAN',
  'Cape Verde': 'CPV',
  Colombia: 'COL',
  Croatia: 'CRO',
  Curaçao: 'CUW',
  'Czech Republic': 'CZE',
  "Côte d'Ivoire": 'CIV',
  'DR Congo': 'COD',
  Ecuador: 'ECU',
  Egypt: 'EGY',
  England: 'ENG',
  France: 'FRA',
  Germany: 'GER',
  Ghana: 'GHA',
  Haiti: 'HAI',
  Iran: 'IRN',
  Iraq: 'IRQ',
  'Ivory Coast': 'CIV',
  Japan: 'JPN',
  Jordan: 'JOR',
  Mexico: 'MEX',
  Morocco: 'MAR',
  Netherlands: 'NED',
  'New Zealand': 'NZL',
  Norway: 'NOR',
  Panama: 'PAN',
  Paraguay: 'PAR',
  Portugal: 'POR',
  Qatar: 'QAT',
  'Saudi Arabia': 'KSA',
  Scotland: 'SCO',
  Senegal: 'SEN',
  'South Africa': 'RSA',
  'South Korea': 'KOR',
  Spain: 'ESP',
  Sweden: 'SWE',
  Switzerland: 'SUI',
  Tunisia: 'TUN',
  Turkey: 'TUR',
  USA: 'USA',
  Uruguay: 'URU',
  Uzbekistan: 'UZB',
};

function codeFor(name) {
  if (!name) return null;
  // Real team → FIFA code; otherwise pass through (placeholder like '1A',
  // 'W73', '3A/B/C/D/F', 'L101' — the bracket renders these as TBD hints).
  return NAME_TO_CODE[name] ?? name;
}

// True for a resolved FIFA code ('CAN', 'MAR', …), false for the knockout
// placeholders ('1A', 'W73', 'L101', …) which can't have scored — used to
// keep goal events defensive even though a `score` block should never
// appear on an unresolved slot in practice.
function isRealCode(code) {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code);
}

// goals1/goals2 → `{ type: 'goal', team, player, minute }` events for one
// side. `minute` strings look like "50", "82", "90+8" (stoppage time) —
// parseInt happily stops at the '+' and gives us the base minute.
// Own goals sit in the *benefiting* side's array with the opponent scorer's
// name and `owngoal: true` — keep the goal in the timeline but drop the
// player so topScorersFrom() can't credit it toward the golden boot.
function goalEvents(goals, teamCode) {
  if (!isRealCode(teamCode)) return [];
  return (goals ?? []).map((g) => ({
    type: 'goal',
    team: teamCode,
    player: g.owngoal ? null : g.name,
    minute: parseInt(g.minute, 10) || null,
  }));
}

// openfootball only ever publishes a `score` once the match is over (no
// live/minute concept), so any match with a score is 'final'. `et` is the
// final score when extra time was played; `p` is the shootout tally, only
// present when the tie went to penalties.
function resultFor(m, home, away) {
  const score = m.score;
  if (!score || (score.ft == null && score.et == null)) {
    return { homeGoals: null, awayGoals: null, status: 'scheduled', homeShootout: null, awayShootout: null, events: [], eventsSource: null };
  }
  const [homeGoals, awayGoals] = score.et ?? score.ft;
  const [homeShootout, awayShootout] = score.p ?? [null, null];
  return {
    homeGoals,
    awayGoals,
    status: 'final',
    homeShootout,
    awayShootout,
    events: [...goalEvents(m.goals1, home), ...goalEvents(m.goals2, away)],
    // Tells the adapter's backfillEvents() these are fallback goal lists (no
    // cards) — an ESPN summary, when reachable, should still replace them.
    eventsSource: 'baseline',
  };
}

function normaliseRound(round) {
  const r = String(round ?? '').toLowerCase();
  if (r.includes('round of 32')) return { stage: 'knockout', round: 'R32' };
  if (r.includes('round of 16')) return { stage: 'knockout', round: 'R16' };
  if (r.includes('quarter')) return { stage: 'knockout', round: 'QF' };
  if (r.includes('semi')) return { stage: 'knockout', round: 'SF' };
  if (r.includes('third')) return { stage: 'knockout', round: 'Third' };
  if (r === 'final' || r.startsWith('final')) return { stage: 'knockout', round: 'Final' };
  return { stage: 'group', round: null };
}

function normaliseGroup(group) {
  if (!group) return null;
  const m = /^group\s+([a-l])/i.exec(group);
  return m ? m[1].toUpperCase() : group;
}

function toUtc(date, time) {
  // openfootball stores times like "13:00 UTC-6" (local kickoff at UTC-6).
  // Convert to a real ISO timestamp.
  if (!date) return null;
  if (time) {
    const m = /^(\d{1,2}):(\d{2})\s*UTC\s*([+-]?\d{1,2})(?::(\d{2}))?$/.exec(time.trim());
    if (m) {
      const [, hh, mm, oh, om = '00'] = m;
      const sign = oh.startsWith('-') ? '-' : '+';
      const offHours = String(Math.abs(parseInt(oh, 10))).padStart(2, '0');
      return new Date(`${date}T${hh.padStart(2, '0')}:${mm}:00${sign}${offHours}:${om}`).toISOString();
    }
    if (/Z$/.test(time)) return new Date(`${date}T${time}`).toISOString();
  }
  return new Date(`${date}T12:00:00Z`).toISOString();
}

// Fixed FIFA World Cup 2026 knockout bracket layout: the top-to-bottom order of
// matches within each round so the Bracket component renders a real tree — every
// match sits directly between the two matches that feed it. We pin it here by
// FIFA match number rather than derive it from openfootball's "W74"/"W77" feeder
// references because that structure isn't sequential (R16 match 89 is fed by
// matches 74 & 77, not 73 & 74) AND openfootball rewrites a feeder reference to
// a team name the moment that match is decided, which would corrupt any
// derivation as the tournament progresses. The match numbers (73–104) are the
// stable FIFA identifiers and never change.
const BRACKET_ORDER = {
  R32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  R16: [89, 90, 93, 94, 91, 92, 95, 96],
  QF: [97, 98, 99, 100],
  SF: [101, 102],
  Third: [103],
  Final: [104],
};

// Display slot for a knockout match: its index in the bracket layout above. Any
// match whose number we don't recognise falls after the known ones (in feed
// order) so it still renders rather than colliding on slot 0.
function bracketSlot(round, num, fallbackIndex) {
  const order = BRACKET_ORDER[round] ?? [];
  const idx = num != null ? order.indexOf(Number(num)) : -1;
  return idx >= 0 ? idx + 1 : order.length + fallbackIndex + 1;
}

export async function fetchOpenFootball() {
  const { value, source, error } = await swr(
    'openfootball:2026',
    async () => {
      const res = await fetch(URL);
      if (!res.ok) throw new Error(`openfootball ${res.status}`);
      return res.json();
    },
    TTL,
  );
  if (!value) return { fixtures: [], knockoutMatches: [], groups: [], source, error };

  const fixtures = [];
  const knockoutMatches = [];
  const teamsByGroup = new Map();
  let knockoutFallback = 0;

  for (const m of value.matches ?? []) {
    const { stage, round } = normaliseRound(m.round);
    const utc = toUtc(m.date, m.time);
    const home = codeFor(m.team1?.code ?? m.team1);
    const away = codeFor(m.team2?.code ?? m.team2);
    const group = stage === 'group' ? normaliseGroup(m.group) : null;
    const result = resultFor(m, home, away);

    const base = {
      id: `of-${m.num ?? `${m.date}-${home}-${away}`}`,
      utc,
      home,
      away,
      ...result,
      minute: null,
      venue: m.ground ?? null,
    };

    if (stage === 'group') {
      fixtures.push({ ...base, group, stage: 'group' });
      // Build empty standings rows from real-team participants only
      if (group && home && NAME_TO_CODE[m.team1]) {
        if (!teamsByGroup.has(`${group}:${home}`)) teamsByGroup.set(`${group}:${home}`, { group, fifaCode: home });
      }
      if (group && away && NAME_TO_CODE[m.team2]) {
        if (!teamsByGroup.has(`${group}:${away}`)) teamsByGroup.set(`${group}:${away}`, { group, fifaCode: away });
      }
    } else {
      knockoutMatches.push({
        ...base,
        stage: 'knockout',
        round,
        num: m.num ?? null,
        slot: bracketSlot(round, m.num, knockoutFallback++),
      });
    }
  }

  // Build empty group standings (0 pts everywhere) so the Pool view has a
  // ladder to render before any match is played.
  const byGroupId = {};
  for (const { group, fifaCode } of teamsByGroup.values()) {
    byGroupId[group] ??= [];
    byGroupId[group].push({ fifaCode, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }
  const groups = Object.keys(byGroupId)
    .sort()
    .map((id) => ({ id, standings: byGroupId[id] }));

  return { fixtures, knockoutMatches, groups, source, error };
}

