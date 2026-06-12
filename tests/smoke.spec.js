// Smoke tests — run entirely against the bundled mock fixtures so they pass
// without internet access. Verify the three views render, prize derivations
// produce expected outputs, view transitions work, and the URL flag swap
// between mid-tournament and post-final mocks behaves.
//
// Run: npm run test:smoke
import { test, expect } from '@playwright/test';

test.describe('Mid-tournament mock (?mock=1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    // Wait for the first paint to settle (state initialised, no syncing).
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('header shows all 4 prize tiles with expected leaders', async ({ page }) => {
    // Each tile is now a clickable card (role=button) named after its prize.
    // Overall leader = Hazel (her 6 teams accumulate the most points in the mock)
    const overall = page.locator('header').getByRole('button', { name: 'Open the full overall standings' });
    await expect(overall).toContainText('Hazel');
    await expect(overall).toContainText('15 pts');

    // Worst team = Curaçao (Jeff) — 0 pts, GD -5, GF 0
    const worst = page.locator('header').getByRole('button', { name: 'Open the full worst-team table' });
    await expect(worst).toContainText('Curaçao');
    await expect(worst).toContainText('Jeff');

    // Most cards = Tom (SWE + AUT yellow + red events = 7 weighted pts)
    const cards = page.locator('header').getByRole('button', { name: 'Open the full most-cards standings' });
    await expect(cards).toContainText('Tom');
    await expect(cards).toContainText('7 pts');

    // Golden boot = Lautaro Martínez (3 goals in the mock) → Tim
    const boot = page.locator('header').getByRole('button', { name: 'Open the full golden boot standings' });
    await expect(boot).toContainText('Lautaro Martínez');
    await expect(boot).toContainText('Tim');
  });

  test('Pool stage tab is auto-selected with the AUTO badge', async ({ page }) => {
    const tab = page.getByRole('button', { name: /Pool stage/ });
    await expect(tab).toHaveClass(/bg-volt/);
    await expect(tab).toContainText(/auto/i);
  });

  test('Group A standings show the expected mock teams', async ({ page }) => {
    const groupA = page.locator('[data-group="A"]');
    await expect(groupA).toContainText('Mexico');
    await expect(groupA).toContainText('Canada');
    await expect(groupA).toContainText('DR Congo');
    await expect(groupA).toContainText('Iraq');
  });

  test('Live banner shows the running Mexico–Iraq match at 67 minutes', async ({ page }) => {
    // Countdown component flips into LIVE mode when a match is in progress.
    const banner = page.locator('text=LIVE').first().locator('xpath=ancestor::div[1]');
    await expect(banner).toContainText('Mexico');
    await expect(banner).toContainText('Iraq');
    await expect(banner).toContainText("67'");
  });

  test('Knockout view renders the bracket with R32 results and the live ESP–ARG tie', async ({ page }) => {
    await page.getByRole('button', { name: 'Knockout ladder' }).click();
    // Wait for the bracket to actually appear (covers the 180ms fade-in too)
    await expect(page.locator('.bracket-cell').first()).toBeVisible();
    await expect(page.getByText('ROUND OF 32')).toBeVisible();
    await expect(page.getByText('ROUND OF 16')).toBeVisible();
    await expect(page.getByText('QUARTER-FINALS')).toBeVisible();
    await expect(page.getByText('SEMI-FINALS')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Final', exact: true })).toBeVisible();
    // Spain–Argentina is the live R16 match — pick the one cell that
    // contains both team codes and has the rose live-ring.
    const liveCell = page.locator('.bracket-cell[data-live]');
    await expect(liveCell).toHaveCount(1);
    await expect(liveCell).toContainText('ESP');
    await expect(liveCell).toContainText('ARG');
    await expect(liveCell).toContainText("67'");
  });

  test('Winners view shows the pre-final placeholder', async ({ page }) => {
    await page.getByRole('button', { name: 'Winners' }).click();
    await expect(page.getByText('Tournament still in progress')).toBeVisible();
  });

  test('view tabs transition without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.getByRole('button', { name: 'Knockout ladder' }).click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: 'Winners' }).click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: /Pool stage/ }).click();
    await page.waitForTimeout(250);

    expect(errors).toEqual([]);
  });

  test('footer reports the mock data source', async ({ page }) => {
    await expect(page.locator('footer')).toContainText(/mock data/);
  });
});

test.describe('Post-final mock (?mock=final)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=final');
    await expect(page.getByRole('button', { name: /Winners/ })).toBeVisible();
  });

  test('Winners tab is auto-selected with phase=winners', async ({ page }) => {
    const tab = page.getByRole('button', { name: /Winners/ });
    await expect(tab).toHaveClass(/bg-volt/);
    await expect(tab).toContainText(/auto/i);
  });

  test('champion hero names France and Niall, runner-up Argentina/Tim', async ({ page }) => {
    const hero = page.locator('section', { hasText: 'World Cup 2026 — Champions' });
    await expect(hero).toContainText('France');
    await expect(hero).toContainText('Niall');
    await expect(hero).toContainText('Argentina');
    await expect(hero).toContainText('Tim');
    await expect(hero).toContainText('2–1');
  });

  test('three secondary prize cards render with end-state stats', async ({ page }) => {
    // The prize cards are clickable (role=button) and named after their prize.
    // Scope to <main> — the header renders equally-named tiles.
    const main = page.locator('main');
    const worstCard = main.getByRole('button', { name: 'Open the full worst-team table' });
    const cardsCard = main.getByRole('button', { name: 'Open the full most-cards standings' });
    const bootCard = main.getByRole('button', { name: 'Open the full golden boot standings' });
    await expect(worstCard).toContainText('Curaçao');
    await expect(cardsCard).toContainText('Tom');
    await expect(cardsCard).toContainText('7 pts');
    await expect(bootCard).toContainText('Lautaro Martínez');
    await expect(bootCard).toContainText('7 goals');
  });

  test('Knockout view shows the fully resolved bracket with FRA in the Final', async ({ page }) => {
    await page.getByRole('button', { name: 'Knockout ladder' }).click();
    // h3 exact "Final" — otherwise the "Quarter-finals" / "Semi-finals" sections match too
    const finalCol = page.locator('section', {
      has: page.getByRole('heading', { name: 'Final', exact: true }),
    });
    await expect(finalCol).toContainText('FRA');
    await expect(finalCol).toContainText('ARG');
    // Third-place card is rendered below the Final column
    await expect(finalCol).toContainText('Third place');
  });

  test('live banner is hidden because the tournament has ended', async ({ page }) => {
    await expect(page.getByText('LIVE', { exact: false })).toHaveCount(0);
  });

  test('footer reports the mock (final state) data source', async ({ page }) => {
    await expect(page.locator('footer')).toContainText(/mock \(final state\)/);
  });
});
