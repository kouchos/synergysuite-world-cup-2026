// Reproduction for the 4 July 2026 incident: Canada v Morocco (R16, match 90)
// showed no live score. Runs the real fetchLiveState() in Node with fetch
// stubbed — real openfootball 2026 baseline, simulated ESPN scoreboard
// carrying the live CAN–MAR event under different labeling/abbreviation
// scenarios. See docs/PLAN-knockout-live-scores.md.
//
// Usage: node scripts/repro-knockout-merge.mjs [path/to/openfootball.json]
// Without an argument it downloads the live openfootball 2026 JSON.
import { readFileSync } from 'node:fs';

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const openfootball = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
  : await (await fetch(OPENFOOTBALL_URL)).json();

function espnEvent({ notes, homeAbbr = 'CAN', awayAbbr = 'MAR' }) {
  return {
    id: '740090',
    date: '2026-07-04T17:00:00Z',
    name: 'Canada vs Morocco',
    competitions: [{
      notes,
      status: { type: { name: 'STATUS_IN_PROGRESS', completed: false }, displayClock: "63'" },
      venue: { fullName: 'NRG Stadium' },
      competitors: [
        { homeAway: 'home', score: '0', team: { id: '1', abbreviation: homeAbbr } },
        { homeAway: 'away', score: '2', team: { id: '2', abbreviation: awayAbbr } },
      ],
      details: [],
    }],
  };
}

let failures = 0;

async function run(label, scenario) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('openfootball') || u.includes('worldcup.json'))
      return { ok: true, json: async () => openfootball };
    if (u.includes('scoreboard'))
      return { ok: true, json: async () => ({ events: [espnEvent(scenario)] }) };
    if (u.includes('standings')) return { ok: true, json: async () => ({ children: [] }) };
    throw new Error('unexpected fetch ' + u);
  };
  // fresh module instance per scenario (query-string cache-bust) so nothing leaks
  const { fetchLiveState } = await import(
    new URL('../src/lib/data/adapter.js', import.meta.url).href + '?v=' + encodeURIComponent(label)
  );
  const state = await fetchLiveState({ live: true });
  const cell = state.knockoutMatches.find(
    (m) => [m.home, m.away].sort().join('-') === 'CAN-MAR' || String(m.num) === '90'
  );
  const ok = cell?.status === 'live' && cell.homeGoals === 0 && cell.awayGoals === 2;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  console.log('      cell:', cell && {
    id: cell.id, round: cell.round, num: cell.num, home: cell.home, away: cell.away,
    status: cell.status, score: `${cell.homeGoals}-${cell.awayGoals}`, minute: cell.minute,
  });
}

await run('A: ESPN notes say "Round of 16"', { notes: [{ type: 'event', headline: 'Round of 16' }] });
await run('B: ESPN notes missing/empty', { notes: [] });
await run('C: ESPN notes generic ("Knockout Stage")', { notes: [{ type: 'event', headline: 'Knockout Stage' }] });
await run('D: correct notes, Morocco abbreviated MOR', { notes: [{ type: 'event', headline: 'Round of 16' }], awayAbbr: 'MOR' });

console.log(failures ? `\n${failures} scenario(s) still drop the live score.` : '\nAll scenarios merge correctly.');
process.exit(failures ? 1 : 0)
