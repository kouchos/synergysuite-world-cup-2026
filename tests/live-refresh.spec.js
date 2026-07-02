// Live-mode refresh behaviour, exercised against an intercepted network and a
// fake clock — no real ESPN access needed.
//
// Covers the two PWA-staleness fixes:
//  1. regaining focus/visibility triggers an immediate refresh (installed
//     apps get resumed, not reloaded — their timers were throttled)
//  2. during a live match the 60s tick actually reaches the network (the
//     scoreboard TTL used to be keyed off the never-live openfootball
//     baseline, capping "live" freshness at 5 minutes)
import { test, expect } from '@playwright/test';

function liveScoreboard(home = '1') {
  return {
    events: [
      {
        id: '12345',
        date: new Date().toISOString(),
        competitions: [
          {
            status: { type: { name: 'STATUS_IN_PROGRESS' }, displayClock: "41'" },
            competitors: [
              { homeAway: 'home', score: home, team: { id: '1', abbreviation: 'MEX' } },
              { homeAway: 'away', score: '0', team: { id: '2', abbreviation: 'IRQ' } },
            ],
            details: [],
          },
        ],
      },
    ],
  };
}

// A match that finished in the past — used to model the app having been left
// open (or backgrounded) across a match whose score changed while we weren't
// polling. Past + final → the store sits in the 30-min idle cadence, so no
// timer fires on its own during a short fast-forward.
function finalScoreboard(home) {
  return {
    events: [
      {
        id: '67890',
        date: '2026-06-15T18:00:00Z',
        competitions: [
          {
            status: { type: { name: 'STATUS_FULL_TIME' } },
            competitors: [
              { homeAway: 'home', score: home, team: { id: '1', abbreviation: 'MEX' } },
              { homeAway: 'away', score: '0', team: { id: '2', abbreviation: 'IRQ' } },
            ],
            details: [],
          },
        ],
      },
    ],
  };
}

// `board` is a mutable holder ({ value, fail }) so a test can change the
// scoreboard payload mid-run and have the next refresh pick it up, or flip
// `fail` to simulate the scoreboard endpoint being unreachable (outage).
async function interceptData(page, board, counters) {
  await page.route('**/raw.githubusercontent.com/**', (route) =>
    route.fulfill({ json: { matches: [] } }),
  );
  await page.route('**/site.api.espn.com/**', (route) => {
    const url = route.request().url();
    if (url.includes('/scoreboard')) {
      counters.scoreboard += 1;
      if (board.fail) return route.abort('failed');
      return route.fulfill({ json: board.value });
    }
    if (url.includes('/standings')) return route.fulfill({ json: { children: [] } });
    return route.fulfill({ json: {} });
  });
}


test('regaining focus triggers an immediate refresh instead of waiting for the timer', async ({ page }) => {
  const counters = { scoreboard: 0 };
  await interceptData(page, { value: { events: [] } }, counters);
  await page.clock.install();

  await page.goto('/?nocache=1'); // live mode, cold cache
  await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  await expect.poll(() => counters.scoreboard).toBe(1);

  // Jump past the idle scoreboard TTL (5 min) but short of the 30-min idle
  // tick — nothing should have fired on its own.
  await page.clock.fastForward('06:00');
  expect(counters.scoreboard).toBe(1);

  // Simulate the installed app being brought back to the foreground.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => counters.scoreboard).toBe(2);
});

test('during a live match the 60s tick reaches the network', async ({ page }) => {
  const counters = { scoreboard: 0 };
  await interceptData(page, { value: liveScoreboard() }, counters);
  await page.clock.install();

  await page.goto('/?nocache=1');
  await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  await expect.poll(() => counters.scoreboard).toBe(1);

  // A match is live → the store schedules a 60s tick and the scoreboard TTL
  // drops to 30s, so the tick must hit the network, not the cache.
  await page.clock.fastForward('01:05');
  await expect.poll(() => counters.scoreboard).toBe(2);
});

test('a goal scored at the live 60s cadence flashes a celebration', async ({ page }) => {
  const counters = { scoreboard: 0 };
  const board = { value: liveScoreboard('1') };
  await interceptData(page, board, counters);
  await page.clock.install();

  await page.goto('/?nocache=1');
  await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  await expect.poll(() => counters.scoreboard).toBe(1); // baseline captured

  // MEX score 1 → 2 between two consecutive ~60s live ticks: a genuine "just
  // happened" goal, so the flash should fire.
  board.value = liveScoreboard('2');
  await page.clock.fastForward('01:05');
  await expect.poll(() => counters.scoreboard).toBe(2);

  await expect(page.getByText('GOAL!')).toBeVisible();
});

test('a goal scored while the app was idle/backgrounded does not flash on resume', async ({ page }) => {
  const counters = { scoreboard: 0 };
  const board = { value: finalScoreboard('1') };
  await interceptData(page, board, counters);
  // Pin "now" so the past-dated match keeps the store in the idle cadence
  // (no auto-tick while the clock is paused below).
  await page.clock.install({ time: new Date('2026-06-29T12:00:00Z') });

  await page.goto('/?nocache=1');
  await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  await expect.poll(() => counters.scoreboard).toBe(1); // stale baseline captured

  // The match's score changes while the app sits suspended for far longer than
  // the live cadence; pauseAt models the laptop lid reopening 6 minutes later
  // (timers frozen meanwhile — nothing polled on its own — and they stay frozen,
  // so a wrongly-fired flash can't quietly auto-dismiss before we assert).
  board.value = finalScoreboard('2');
  await page.clock.pauseAt(new Date('2026-06-29T12:06:00Z'));
  expect(counters.scoreboard).toBe(1); // nothing fired on its own

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => counters.scoreboard).toBe(2);

  // Give a stale flash a real beat to paint, then assert it never did: the
  // 6-min-old goal must not surface as if it just happened.
  await page.waitForTimeout(800);
  await expect(page.getByText('GOAL!')).toHaveCount(0);
});

test('reconnecting after an outage does not storm-celebrate replayed goals', async ({ page }) => {
  // `swr` (cache.js) never throws: while the scoreboard endpoint is
  // unreachable it silently serves stale cached data with source 'stale', so
  // every tick still "succeeds" from the store's point of view and lastSync
  // stays fresh. Without guarding on freshness, the tick that finally reaches
  // the network again would diff straight against that stale baseline and
  // flash every goal scored during the outage at once.
  // This test chains three fast-forwarded ticks (vs one for the other cases
  // in this file), each a real network round-trip, so give it more headroom
  // than the default 30s.
  test.setTimeout(60000);
  const counters = { scoreboard: 0 };
  const board = { value: liveScoreboard('1'), fail: false };
  await interceptData(page, board, counters);
  await page.clock.install();

  // The footer's source label (App.svelte's `sourceLabel`) doubles as a
  // reliable "this tick has fully landed" signal: it only updates once the
  // store has applied diagnostics for the *current* tick, which happens
  // synchronously right before `schedule()` queues the next timer. Waiting on
  // the raw request counter alone is a race — the counter increments the
  // instant the browser *issues* the request, well before the store finishes
  // processing the response and re-arms the timer that a subsequent
  // `page.clock.fastForward()` needs to already exist.
  const footer = page.locator('footer');

  // (a) first tick: live scoreboard served over the network — fresh baseline.
  await page.goto('/?nocache=1');
  await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  await expect.poll(() => counters.scoreboard).toBe(1);
  await expect(footer.getByText('ESPN unreachable')).not.toBeVisible();

  // (b) outage: the scoreboard route now fails every request. Fast-forward
  // past the live scoreboard TTL (30s) and the 60s live tick so a request is
  // attempted, fails, and swr falls back to the stale cached payload (source
  // 'stale').
  board.fail = true;
  await page.clock.fastForward('01:05');
  await expect.poll(() => counters.scoreboard, { timeout: 10000 }).toBe(2);
  await expect(footer.getByText('ESPN unreachable')).toBeVisible({ timeout: 10000 });

  // (c) reconnect: the route succeeds again with a bumped score. This is a
  // genuine goal versus the very first snapshot, but the previous applied
  // snapshot (from the stale tick) wasn't fresh, so the diff must be
  // suppressed rather than flashing the replayed goal.
  board.fail = false;
  board.value = liveScoreboard('2');
  await page.clock.fastForward('01:05');
  await expect.poll(() => counters.scoreboard, { timeout: 10000 }).toBe(3);
  await expect(footer.getByText('ESPN unreachable')).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);
  await expect(page.getByText('GOAL!')).toHaveCount(0);

  // (d) a further genuine goal at the normal live cadence, fresh-vs-fresh,
  // must still flash — the outage guard shouldn't wedge celebrations off
  // permanently.
  board.value = liveScoreboard('3');
  await page.clock.fastForward('01:05');
  await expect.poll(() => counters.scoreboard, { timeout: 10000 }).toBe(4);
  await expect(page.getByText('GOAL!')).toBeVisible();
});
