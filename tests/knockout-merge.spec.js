// Regression tests for the 4 July 2026 incident: Canada v Morocco (R16, match
// 90) showed no live score because an unlabeled/mislabeled ESPN knockout
// event, or an ESPN team-code divergence (MOR vs FIFA's MAR), silently missed
// the openfootball↔ESPN join in mergeKnockouts() and got dropped with zero
// diagnostics. See docs/PLAN-knockout-live-scores.md and
// scripts/repro-knockout-merge.mjs (this file ports that repro into specs and
// adds the fallback/anti-clobber/diagnostics coverage from Tasks 2-4).
//
// Pure Node, no browser — pattern matches tests/activity.spec.js: stub
// `globalThis.fetch` and import the real adapter functions directly.
//
// Module-state caveat: adapter.js/cache.js could hold per-import state, so
// (like the repro script) every test imports a fresh module instance via a
// `?v=` cache-busting query string on the import URL.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Frozen copy of openfootball's 2026 feed as it stood on 4 July 2026 — CAN v
// MAR (match 90) already final 0-3, AUS v EGY (match 88) decided on penalties
// 2-4. Frozen so this spec can't drift as the live feed updates.
const OPENFOOTBALL_FIXTURE = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures', 'openfootball-2026-07-04.json'), 'utf8'),
);

let importCounter = 0;
async function loadAdapter() {
  importCounter += 1;
  const url = new URL('../src/lib/data/adapter.js', import.meta.url).href + `?v=${importCounter}`;
  return import(url);
}

function findKnockout(state, num) {
  return state.knockoutMatches.find((m) => Number(m.num) === num);
}

// Builds an ESPN scoreboard event shaped like the repro's Canada v Morocco
// payload, with the round label, team codes, score, and status all
// parameterised so each scenario can vary exactly one thing.
function espnEvent({
  id = '740090',
  date = '2026-07-04T17:00:00Z',
  notes = [{ type: 'event', headline: 'Round of 16' }],
  homeAbbr = 'CAN',
  awayAbbr = 'MAR',
  homeScore = '0',
  awayScore = '2',
  statusName = 'STATUS_IN_PROGRESS',
  completed = false,
  displayClock = "63'",
  details = [],
} = {}) {
  return {
    id,
    date,
    name: `${homeAbbr} vs ${awayAbbr}`,
    competitions: [
      {
        notes,
        status: { type: { name: statusName, completed }, displayClock },
        venue: { fullName: 'NRG Stadium' },
        competitors: [
          { homeAway: 'home', score: homeScore, team: { id: '1', abbreviation: homeAbbr } },
          { homeAway: 'away', score: awayScore, team: { id: '2', abbreviation: awayAbbr } },
        ],
        details,
      },
    ],
  };
}

// Stubs `globalThis.fetch` for the three endpoints fetchLiveState() calls:
// openfootball (baseline), ESPN scoreboard, ESPN standings. Any of the ESPN
// legs can be made to throw to simulate "network down".
function makeFetchStub({
  scoreboardEvents = [],
  standings = { children: [] },
  scoreboardThrows = false,
  standingsThrows = false,
} = {}) {
  return async (url) => {
    const u = String(url);
    if (u.includes('worldcup.json')) {
      return { ok: true, json: async () => OPENFOOTBALL_FIXTURE };
    }
    if (u.includes('scoreboard')) {
      if (scoreboardThrows) throw new Error('ESPN scoreboard unreachable');
      return { ok: true, json: async () => ({ events: scoreboardEvents }) };
    }
    if (u.includes('standings')) {
      if (standingsThrows) throw new Error('ESPN standings unreachable');
      return { ok: true, json: async () => standings };
    }
    throw new Error('unexpected fetch ' + u);
  };
}

// Runs fetchLiveState() with a single CAN-v-MAR ESPN event built from the
// given overrides, and returns both the full state and the match-90 cell.
async function fetchCanMarCell(overrides = {}) {
  const { fetchLiveState } = await loadAdapter();
  globalThis.fetch = makeFetchStub({ scoreboardEvents: [espnEvent(overrides)] });
  const state = await fetchLiveState({ live: true });
  return { state, cell: findKnockout(state, 90) };
}

test.describe('mergeKnockouts — round labeling and team-code robustness (Tasks 1-2)', () => {
  test('a: notes say "Round of 16" → live score lands on match 90', async () => {
    const { cell } = await fetchCanMarCell({ notes: [{ headline: 'Round of 16' }] });
    expect(cell?.status).toBe('live');
    expect(cell?.homeGoals).toBe(0);
    expect(cell?.awayGoals).toBe(2);
    expect(cell?.minute).toBe(63);
  });

  test('b: notes empty → still lands via date-window round inference', async () => {
    const { cell } = await fetchCanMarCell({ notes: [] });
    expect(cell?.status).toBe('live');
    expect(cell?.homeGoals).toBe(0);
    expect(cell?.awayGoals).toBe(2);
  });

  test('c: notes generic ("Knockout Stage") → still lands', async () => {
    const { cell } = await fetchCanMarCell({ notes: [{ headline: 'Knockout Stage' }] });
    expect(cell?.status).toBe('live');
    expect(cell?.homeGoals).toBe(0);
    expect(cell?.awayGoals).toBe(2);
  });

  test('d: notes correct, Morocco abbreviated MOR → still lands, teamsRef keys on MAR not MOR', async () => {
    const { state, cell } = await fetchCanMarCell({
      notes: [{ headline: 'Round of 16' }],
      awayAbbr: 'MOR',
    });
    expect(cell?.status).toBe('live');
    expect(cell?.homeGoals).toBe(0);
    expect(cell?.awayGoals).toBe(2);
    expect(state.teamsRef).toHaveProperty('MAR');
    expect(state.teamsRef).not.toHaveProperty('MOR');
  });

  test('e: wrong round label (mislabeled "Quarterfinal") AND MOR together → still lands via pair-only join + alias', async () => {
    // A real round-word match ("Quarterfinal") that resolves to the WRONG
    // round (QF, not R16) — this defeats the round|pair join (Join 1) and
    // the date-window fallback (both would land on R16), forcing the merge
    // to fall through to the pair-only join (Join 2) to recover the match.
    const { cell } = await fetchCanMarCell({
      notes: [{ headline: 'Quarterfinal' }],
      awayAbbr: 'MOR',
    });
    expect(cell?.status).toBe('live');
    expect(cell?.homeGoals).toBe(0);
    expect(cell?.awayGoals).toBe(2);
  });
});

test.describe('openfootball fallback when ESPN is fully unreachable (Task 3)', () => {
  test('f: ESPN scoreboard + standings both down → openfootball final results + shootout carry through', async () => {
    const { fetchLiveState } = await loadAdapter();
    globalThis.fetch = makeFetchStub({ scoreboardThrows: true, standingsThrows: true });
    const state = await fetchLiveState({ live: true });

    const cell90 = findKnockout(state, 90);
    expect(cell90?.status).toBe('final');
    expect(cell90?.homeGoals).toBe(0);
    expect(cell90?.awayGoals).toBe(3);
    expect(cell90?.events.filter((e) => e.type === 'goal' && e.team === 'MAR')).toHaveLength(3);

    const cell88 = findKnockout(state, 88);
    expect(cell88?.homeShootout).toBe(2);
    expect(cell88?.awayShootout).toBe(4);

    expect(state.phase).toBe('knockout');
  });
});

test.describe('anti-clobber guard (Task 2.4)', () => {
  test('g: a later ESPN poll reverting to scheduled/null must not blank an existing final result', async () => {
    const { fetchLiveState } = await loadAdapter();
    let tick = 0;
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('worldcup.json')) return { ok: true, json: async () => OPENFOOTBALL_FIXTURE };
      if (u.includes('scoreboard')) {
        tick += 1;
        const ev =
          tick === 1
            ? espnEvent({
                notes: [{ headline: 'Round of 16' }],
                homeScore: '0',
                awayScore: '3',
                statusName: 'STATUS_FINAL',
                completed: true,
                displayClock: '',
              })
            : espnEvent({
                notes: [{ headline: 'Round of 16' }],
                homeScore: null,
                awayScore: null,
                statusName: 'STATUS_SCHEDULED',
                completed: false,
                displayClock: '',
              });
        return { ok: true, json: async () => ({ events: [ev] }) };
      }
      if (u.includes('standings')) return { ok: true, json: async () => ({ children: [] }) };
      throw new Error('unexpected fetch ' + u);
    };

    const state1 = await fetchLiveState({ live: true });
    const cell1 = findKnockout(state1, 90);
    expect(cell1?.status).toBe('final');
    expect(cell1?.homeGoals).toBe(0);
    expect(cell1?.awayGoals).toBe(3);

    // Second tick: ESPN now claims the match is merely scheduled with no
    // score. localStorage doesn't exist in Node, so swr() always re-fetches
    // here — that's fine, it's the anti-clobber guard in overlayLive(), not
    // caching, that this test exercises.
    const state2 = await fetchLiveState({ live: true });
    const cell2 = findKnockout(state2, 90);
    expect(cell2?.status).toBe('final');
    expect(cell2?.homeGoals).toBe(0);
    expect(cell2?.awayGoals).toBe(3);
  });
});

test.describe('observability — dropped events and unknown codes (Task 4)', () => {
  test('h: an unmatchable event is dropped (not appended) with a reason, and an unknown code surfaces in diagnostics', async () => {
    const { fetchLiveState } = await loadAdapter();
    // QAT v NZL, correctly tagged R16, real FIFA codes — but no such pairing
    // exists anywhere in the knockout bracket (both were eliminated in the
    // group stage in this fixture), so no join can ever place it.
    const unmatchable = espnEvent({
      id: '999001',
      date: '2026-07-04T20:00:00Z',
      notes: [{ headline: 'Round of 16' }],
      homeAbbr: 'QAT',
      awayAbbr: 'NZL',
      homeScore: '1',
      awayScore: '0',
    });
    // A genuinely unknown abbreviation (not a real team, not an alias target)
    // paired with a real code — also unmatchable, and should surface XYZ in
    // unknownCodes rather than just vanishing.
    const unknownCodeEvent = espnEvent({
      id: '999002',
      date: '2026-07-04T21:00:00Z',
      notes: [{ headline: 'Round of 16' }],
      homeAbbr: 'XYZ',
      awayAbbr: 'CAN',
      homeScore: '1',
      awayScore: '1',
    });
    globalThis.fetch = makeFetchStub({ scoreboardEvents: [unmatchable, unknownCodeEvent] });
    const state = await fetchLiveState({ live: true });

    const pairs = state.knockoutMatches.map((m) => [m.home, m.away].sort().join('-'));
    expect(pairs).not.toContain('NZL-QAT');

    const dropped = state._diagnostics.droppedKnockoutEvents;
    const qatNzlDrop = dropped.find((d) => [d.home, d.away].sort().join('-') === 'NZL-QAT');
    expect(qatNzlDrop).toBeTruthy();
    expect(qatNzlDrop.reason).toEqual(expect.any(String));
    expect(qatNzlDrop.reason.length).toBeGreaterThan(0);

    expect(state._diagnostics.unknownCodes).toContain('XYZ');
  });
});

test.describe('backfillEvents — summary events replace baseline goal lists (Task 3 interaction)', () => {
  test('i: a summary with a goal + a card replaces baseline events, aliases codes, and flips eventsSource to summary', async () => {
    const { backfillEvents } = await loadAdapter();
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('summary')) {
        return {
          ok: true,
          json: async () => ({
            header: {
              competitions: [
                {
                  competitors: [
                    { team: { id: '1', abbreviation: 'CAN' } },
                    { team: { id: '2', abbreviation: 'MOR' } },
                  ],
                },
              ],
            },
            keyEvents: [
              {
                type: { text: 'Goal' },
                team: { id: '2' },
                athletesInvolved: [{ displayName: 'Azzedine Ounahi' }],
                clock: { displayValue: '50' },
              },
              {
                type: { text: 'Yellow Card' },
                team: { id: '2' },
                athletesInvolved: [{ displayName: 'Someone Else' }],
                clock: { displayValue: '60' },
              },
            ],
          }),
        };
      }
      throw new Error('unexpected fetch ' + u);
    };

    const baselineMatch = {
      id: '740090', // numeric-looking ESPN id (already merged once) — backfillEvents
      // only summaries matches whose id looks like a real ESPN event id.
      home: 'CAN',
      away: 'MAR',
      status: 'final',
      events: [{ type: 'goal', team: 'MAR', player: 'Azzedine Ounahi', minute: 50 }],
      eventsSource: 'baseline',
    };
    const state = { fixtures: [], knockoutMatches: [baselineMatch] };
    const next = await backfillEvents(state);
    const updated = next.knockoutMatches[0];

    expect(updated.eventsSource).toBe('summary');
    expect(updated.events).toHaveLength(2);
    expect(updated.events.some((e) => e.type === 'goal' && e.team === 'MAR')).toBe(true);
    expect(updated.events.some((e) => e.type === 'yellow' && e.team === 'MAR')).toBe(true);
    // The summary's raw abbreviation was MOR — must have been aliased to MAR
    // everywhere, never leaking the ESPN-ism into event data.
    expect(updated.events.every((e) => e.team !== 'MOR')).toBe(true);
  });

  test('i (no keyEvents): a summary with no extractable events keeps the baseline events', async () => {
    const { backfillEvents } = await loadAdapter();
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('summary')) {
        return {
          ok: true,
          json: async () => ({
            header: { competitions: [{ competitors: [] }] },
            keyEvents: [],
          }),
        };
      }
      throw new Error('unexpected fetch ' + u);
    };

    const baselineMatch = {
      id: '740090',
      home: 'CAN',
      away: 'MAR',
      status: 'final',
      events: [{ type: 'goal', team: 'MAR', player: 'Azzedine Ounahi', minute: 50 }],
      eventsSource: 'baseline',
    };
    const state = { fixtures: [], knockoutMatches: [baselineMatch] };
    const next = await backfillEvents(state);
    const updated = next.knockoutMatches[0];

    expect(updated.eventsSource).toBe('baseline');
    expect(updated.events).toEqual(baselineMatch.events);
  });
});
