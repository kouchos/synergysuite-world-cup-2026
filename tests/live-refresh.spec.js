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

function liveScoreboard() {
  return {
    events: [
      {
        id: '12345',
        date: new Date().toISOString(),
        competitions: [
          {
            status: { type: { name: 'STATUS_IN_PROGRESS' }, displayClock: "41'" },
            competitors: [
              { homeAway: 'home', score: '1', team: { id: '1', abbreviation: 'MEX' } },
              { homeAway: 'away', score: '0', team: { id: '2', abbreviation: 'IRQ' } },
            ],
            details: [],
          },
        ],
      },
    ],
  };
}

async function interceptData(page, scoreboard, counters) {
  await page.route('**/raw.githubusercontent.com/**', (route) =>
    route.fulfill({ json: { matches: [] } }),
  );
  await page.route('**/site.api.espn.com/**', (route) => {
    const url = route.request().url();
    if (url.includes('/scoreboard')) {
      counters.scoreboard += 1;
      return route.fulfill({ json: scoreboard });
    }
    if (url.includes('/standings')) return route.fulfill({ json: { children: [] } });
    return route.fulfill({ json: {} });
  });
}

test('regaining focus triggers an immediate refresh instead of waiting for the timer', async ({ page }) => {
  const counters = { scoreboard: 0 };
  await interceptData(page, { events: [] }, counters);
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
  await interceptData(page, liveScoreboard(), counters);
  await page.clock.install();

  await page.goto('/?nocache=1');
  await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  await expect.poll(() => counters.scoreboard).toBe(1);

  // A match is live → the store schedules a 60s tick and the scoreboard TTL
  // drops to 30s, so the tick must hit the network, not the cache.
  await page.clock.fastForward('01:05');
  await expect.poll(() => counters.scoreboard).toBe(2);
});
