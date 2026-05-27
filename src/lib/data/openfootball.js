/**
 * Baseline fixtures from the public-domain openfootball/worldcup.json dataset.
 * Used as the schedule/group skeleton — ESPN data overlays live scores + events
 * on top. Lets the UI render sensibly even if ESPN is down or empty.
 *
 * Source: https://github.com/openfootball/worldcup.json — no key required.
 */
import { swr } from '../cache.js';

const URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const TTL = 6 * 60 * 60 * 1000; // 6h — fixtures barely change

function normaliseRound(round) {
  // openfootball uses 'Matchday 1' / 'Round of 32' / 'Quarter-final' / 'Final'
  const r = String(round ?? '').toLowerCase();
  if (r.includes('round of 32')) return { stage: 'knockout', round: 'R32' };
  if (r.includes('round of 16')) return { stage: 'knockout', round: 'R16' };
  if (r.includes('quarter')) return { stage: 'knockout', round: 'QF' };
  if (r.includes('semi')) return { stage: 'knockout', round: 'SF' };
  if (r.includes('third')) return { stage: 'knockout', round: 'Third' };
  if (r.includes('final')) return { stage: 'knockout', round: 'Final' };
  return { stage: 'group', round: null };
}

function toUtc(date, time) {
  // openfootball stores naive "2026-06-11" + "20:00 ET" style. Some entries are
  // already TZ-suffixed. Fall back to "T-noon-UTC" if parsing fails.
  if (!date) return null;
  if (time && time.includes('Z')) return new Date(`${date}T${time}`).toISOString();
  if (time) return new Date(`${date}T${time}:00Z`).toISOString();
  return new Date(`${date}T12:00:00Z`).toISOString();
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
  if (!value) return { fixtures: [], groups: [], source, error };

  const fixtures = [];
  const groupMap = new Map();

  for (const m of value.matches ?? []) {
    const { stage, round } = normaliseRound(m.round);
    const utc = toUtc(m.date, m.time);
    const home = m.team1?.code ?? m.team1;
    const away = m.team2?.code ?? m.team2;
    const fixture = {
      id: `of-${m.num ?? `${m.date}-${home}-${away}`}`,
      utc,
      stage,
      round: stage === 'knockout' ? round : null,
      group: m.group ?? null,
      home,
      away,
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: m.ground ?? null,
      events: [],
    };
    fixtures.push(fixture);
    if (m.group && home && !groupMap.has(`${m.group}:${home}`)) {
      groupMap.set(`${m.group}:${home}`, { groupId: m.group, fifaCode: home });
    }
    if (m.group && away && !groupMap.has(`${m.group}:${away}`)) {
      groupMap.set(`${m.group}:${away}`, { groupId: m.group, fifaCode: away });
    }
  }

  // Build empty group standings from openfootball's group → teams mapping
  const groupsByteam = {};
  for (const { groupId, fifaCode } of groupMap.values()) {
    groupsByteam[groupId] ??= [];
    groupsByteam[groupId].push({
      fifaCode,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    });
  }
  const groups = Object.keys(groupsByteam)
    .sort()
    .map((id) => ({ id, standings: groupsByteam[id] }));

  return { fixtures, groups, source, error };
}
