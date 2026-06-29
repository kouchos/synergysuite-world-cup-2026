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

// `board` is a mutable holder ({ value }) so a test can change the scoreboard
// payload mid-run and have the next refresh pick it up.
async function interceptData(page, board, counters) {
  await page.route('**/raw.githubusercontent.com/**', (route) =>
    route.fulfill({ json: { matches: [] } }),
  );
  await page.route('**/site.api.espn.com/**', (route) => {
    const url = route.request().url();
    if (url.includes('/scoreboard')) {
      counters.scoreboard += 1;
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
