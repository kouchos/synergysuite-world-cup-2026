// Live network tests — run against the default (live) mode where the app
// fetches openfootball + ESPN at runtime. ESPN-specific assertions auto-skip
// when ESPN isn't reachable (e.g. corporate proxy blocking, or ESPN's slug
// changed) so the suite still passes when the openfootball baseline alone is
// serving data.
//
// Run: npm run test:network
import { test, expect, request } from '@playwright/test';

const ESPN_PROBE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611&limit=1';
const OF_PROBE =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

let espnReachable = false;
let openfootballReachable = false;

test.beforeAll(async () => {
  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  // Probe both endpoints in parallel with a 6s budget — keeps the suite fast.
  const probe = async (url) => {
    try {
      const res = await ctx.get(url, { timeout: 6000 });
      return res.ok();
    } catch {
      return false;
    }
  };
  [openfootballReachable, espnReachable] = await Promise.all([probe(OF_PROBE), probe(ESPN_PROBE)]);
  await ctx.dispose();
  console.log(`  probe: openfootball=${openfootballReachable ? 'OK' : 'BLOCKED'}  ESPN=${espnReachable ? 'OK' : 'BLOCKED'}`);
});

test.describe('Live data — openfootball baseline', () => {
  test.beforeEach(async ({ page }) => {
    // Visit live mode. Give the first refresh up to 8s to complete.
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('openfootball baseline reaches the page', async ({ page }) => {
    test.skip(!openfootballReachable, 'openfootball not reachable from this network');
    // Either we see prize tiles (something happened) or the pre-tournament
    // hero. Both are valid; what we're asserting is that the openfootball
    // fixture data made it through — visible by the source label in footer.
    await expect(page.locator('footer')).toContainText(/openfootball/i, { timeout: 8000 });
  });

  test('pre-tournament hero shows the first real-team kickoff', async ({ page }) => {
    test.skip(!openfootballReachable, 'openfootball not reachable');
    // Today is well before 11 Jun 2026 — the hero should show.
    await expect(page.getByText(/Kicks off/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/First match/i).first()).toBeVisible();
  });

  test('all 12 real World Cup groups appear in the Pool view', async ({ page }) => {
    test.skip(!openfootballReachable, 'openfootball not reachable');
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      await expect(page.getByText(`Group ${letter}`, { exact: true })).toBeVisible();
    }
  });

  test('a sample of real qualified teams renders in the standings', async ({ page }) => {
    test.skip(!openfootballReachable, 'openfootball not reachable');
    // Pick teams across multiple groups so a single-group bug doesn't pass.
    for (const team of ['Mexico', 'Brazil', 'France', 'England', 'Argentina', 'Germany']) {
      await expect(page.getByText(team, { exact: true }).first()).toBeVisible();
    }
  });

  test('knockout view shows the FIFA bracket structure with placeholder slots', async ({ page }) => {
    test.skip(!openfootballReachable, 'openfootball not reachable');
    await page.getByRole('button', { name: 'Knockout ladder' }).click();
    await expect(page.getByText('ROUND OF 32')).toBeVisible();
    // 32 knockout matches × 2 team slots = 64 placeholders pre-tournament.
    // Tolerate small variations (some test runs may execute moments after
    // matches start) but catch the regression where ESPN's pre-tournament
    // host-seed previews leak through and replace ~8 placeholders with real
    // codes. Anything above 50 means the gate's working.
    const placeholderCount = await page.locator('text=/^(1[A-L]|2[A-L]|3[A-LJ\\/]+|W\\d+|L\\d+)$/').count();
    expect(placeholderCount).toBeGreaterThan(50);
  });

  test('no JavaScript errors during live page load', async ({ page }) => {
    test.skip(!openfootballReachable, 'openfootball not reachable');
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // Filter out the expected ESPN cert/CORS failures when ESPN is blocked —
    // they show up as console errors, not pageerrors. pageerror = uncaught JS.
    expect(errors).toEqual([]);
  });
});

test.describe('ESPN integration', () => {
  test('footer reports ESPN as a source when reachable', async ({ page }) => {
    test.skip(!espnReachable, 'ESPN not reachable from this network');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Adapter may take a beat after networkidle to roll the diagnostics in.
    await expect(page.locator('footer')).toContainText(/ESPN/i, { timeout: 10_000 });
  });

  test('ESPN scoreboard endpoint returns valid JSON', async ({ page }) => {
    test.skip(!espnReachable, 'ESPN not reachable');
    // Intercept the actual fetch the app makes.
    const espnResponse = page.waitForResponse((res) =>
      res.url().includes('site.api.espn.com') && res.url().includes('scoreboard'),
      { timeout: 10_000 },
    );
    await page.goto('/');
    const res = await espnResponse;
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // ESPN's scoreboard shape — defensive: at minimum should have a leagues
    // or events array.
    expect(body).toHaveProperty(body.events ? 'events' : 'leagues');
  });

  test('ESPN standings endpoint returns valid JSON', async ({ page }) => {
    test.skip(!espnReachable, 'ESPN not reachable');
    const espnResponse = page.waitForResponse((res) =>
      res.url().includes('site.api.espn.com') && res.url().includes('standings'),
      { timeout: 10_000 },
    );
    await page.goto('/');
    const res = await espnResponse;
    expect(res.ok()).toBeTruthy();
    // Standings either nests groups under children or groups — either is fine.
    const body = await res.json();
    expect(Array.isArray(body.children) || Array.isArray(body.groups)).toBeTruthy();
  });

  test('ESPN unreachable: footer still surfaces the openfootball baseline', async ({ page }) => {
    test.skip(espnReachable, 'this assertion only meaningful when ESPN is BLOCKED');
    test.skip(!openfootballReachable, 'no baseline to fall back on');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('footer')).toContainText(/openfootball/i, { timeout: 10_000 });
    await expect(page.locator('footer')).toContainText(/unreachable|using cached/i);
  });
});

test.describe('Mock-mode toggles work in live mode', () => {
  test('?mock=1 overrides live mode and loads the mid-tournament fixture', async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.locator('footer')).toContainText(/mock data/);
    // Confirm we're actually seeing mock content, not live
    await expect(page.locator('header').getByText('Hazel')).toBeVisible();
  });

  test('?mock=final overrides live mode and loads the post-final fixture', async ({ page }) => {
    await page.goto('/?mock=final');
    await expect(page.locator('footer')).toContainText(/mock \(final state\)/);
    await expect(page.getByText('France', { exact: true }).first()).toBeVisible();
  });
});
