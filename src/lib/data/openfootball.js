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

const TTL = 6 * 60 * 60 * 1000; // 6h — fixtures barely change

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

let knockoutSlotCounters;
function resetSlotCounters() {
  knockoutSlotCounters = { R32: 0, R16: 0, QF: 0, SF: 0, Third: 0, Final: 0 };
}
function nextSlot(round) {
  knockoutSlotCounters[round] = (knockoutSlotCounters[round] ?? 0) + 1;
  return knockoutSlotCounters[round];
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
  resetSlotCounters();

  for (const m of value.matches ?? []) {
    const { stage, round } = normaliseRound(m.round);
    const utc = toUtc(m.date, m.time);
    const home = codeFor(m.team1?.code ?? m.team1);
    const away = codeFor(m.team2?.code ?? m.team2);
    const group = stage === 'group' ? normaliseGroup(m.group) : null;

    const base = {
      id: `of-${m.num ?? `${m.date}-${home}-${away}`}`,
      utc,
      home,
      away,
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: m.ground ?? null,
      events: [],
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
      knockoutMatches.push({ ...base, stage: 'knockout', round, slot: nextSlot(round) });
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

