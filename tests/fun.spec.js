// The fun stuff: Banter Banner, derby detection, goal celebrations.
// Unit tests run node-side against the pure modules; UI tests use mocks.
import { test, expect } from '@playwright/test';
import { banterLines, englandLines } from '../src/lib/state/banter.js';
import { detectGoals } from '../src/lib/state/goalDiff.js';
import { MOCK_STATE } from '../src/lib/data/mock.js';
import employeesConfig from '../config/employees.json' with { type: 'json' };

const employees = employeesConfig.employees;

test.describe('banterLines', () => {
  test('generates lines from the mock state', () => {
    const lines = banterLines(MOCK_STATE, employees);
    expect(lines.length).toBeGreaterThan(3);
    for (const l of lines) expect(typeof l).toBe('string');
  });

  test('covers the prize races and the derby alert', () => {
    const lines = banterLines(MOCK_STATE, employees).join('\n');
    expect(lines).toContain('Tom tops the cards table');
    // Hazel (4 pts) needs 2 reds to overtake Tom (7 pts)
    expect(lines).toContain('Hazel only needs 2 more reds to take the cards lead');
    expect(lines).toMatch(/Curaçao are holding the wooden spoon 🥄 — Jeff/);
    // Earliest scheduled derby in the mock: Eoin's Canada vs Joy's DR Congo
    expect(lines).toMatch(/Derby alert ⚔️ Eoin's Canada meet Joy's DR Congo/);
  });

  test('England get singled out, twice per rotation', () => {
    const lines = banterLines(MOCK_STATE, employees);
    // Latest England result in the mock is a 2–1 win over Japan — still negative
    expect(lines.join('\n')).toMatch(/England beat Japan 2–1 — sixty years of hurt/);
    expect(lines.join('\n')).toContain("it's not coming home");
    // Every England line appears twice in the rotation
    const engCount = lines.filter((l) => /England|coming home/.test(l)).length;
    expect(engCount).toBeGreaterThanOrEqual(4);
    // And the rotation opens with an England dig
    expect(lines[0]).toMatch(/England|coming home/);
  });

  test('England stay insulted even after a thrashing, and a loss is celebrated', () => {
    const win = {
      fixtures: [
        { id: 'x', home: 'ENG', away: 'PAN', homeGoals: 5, awayGoals: 0, status: 'final', utc: '2026-06-20T18:00:00Z' },
      ],
    };
    expect(englandLines(win, employees).join('\n')).toMatch(/still not coming home/i);

    const loss = {
      fixtures: [
        { id: 'y', home: 'FRA', away: 'ENG', homeGoals: 2, awayGoals: 0, status: 'final', utc: '2026-06-20T18:00:00Z' },
      ],
    };
    expect(englandLines(loss, employees).join('\n')).toMatch(/Irish office cheers/);
  });

  test('without match activity only fixture-based lines remain', () => {
    const quiet = {
      ...MOCK_STATE,
      groups: MOCK_STATE.groups.map((g) => ({
        ...g,
        standings: g.standings.map((r) => ({ ...r, p: 0, pts: 0 })),
      })),
      topScorers: [],
      fixtures: MOCK_STATE.fixtures.map((f) => ({ ...f, status: 'scheduled', events: [] })),
      knockoutMatches: [],
    };
    const lines = banterLines(quiet, employees);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).toMatch(/Derby alert/);
    expect(lines.join('\n')).not.toMatch(/cards table/);
    // The England fallback never sleeps
    expect(lines.join('\n')).toContain("it's not coming home");
  });
});

test.describe('detectGoals', () => {
  const live = (id, home, away, hg, ag, status = 'live') => ({
    id,
    home,
    away,
    homeGoals: hg,
    awayGoals: ag,
    status,
  });

  test('detects home and away goals between snapshots', () => {
    const prev = { fixtures: [live('m1', 'MEX', 'IRQ', 1, 0)] };
    const next = { fixtures: [live('m1', 'MEX', 'IRQ', 2, 1)] };
    const goals = detectGoals(prev, next);
    expect(goals).toHaveLength(2);
    expect(goals.map((g) => g.team)).toEqual(['MEX', 'IRQ']);
  });

  test('counts a scheduled→live transition with a score as a goal', () => {
    const prev = { fixtures: [live('m1', 'ESP', 'ARG', null, null, 'scheduled')] };
    const next = { fixtures: [live('m1', 'ESP', 'ARG', 1, 0)] };
    expect(detectGoals(prev, next)).toEqual([
      expect.objectContaining({ team: 'ESP', count: 1 }),
    ]);
  });

  test('ignores unchanged scores, corrections and unmatched games', () => {
    const prev = { fixtures: [live('m1', 'MEX', 'IRQ', 2, 1)] };
    const next = {
      fixtures: [
        live('m1', 'MEX', 'IRQ', 2, 0), // VAR took one away — no celebration
        live('m2', 'GER', 'CUW', 3, 0), // no baseline — skip
      ],
      knockoutMatches: [live('m3', 'NED', 'SUI', null, null, 'scheduled')],
    };
    expect(detectGoals(prev, next)).toEqual([]);
  });

  test('spots goals in knockout matches too', () => {
    const prev = { knockoutMatches: [live('r16', 'ESP', 'ARG', 1, 1)] };
    const next = { knockoutMatches: [live('r16', 'ESP', 'ARG', 1, 2)] };
    expect(detectGoals(prev, next)).toEqual([
      expect.objectContaining({ team: 'ARG', count: 1 }),
    ]);
  });
});

test.describe('Banter Banner UI', () => {
  test('shows rotating banter, hides via ×, persists, and returns via the footer', async ({ page }) => {
    await page.goto('/?mock=1');
    const banner = page.getByText('Banter Banner', { exact: true });
    await expect(banner).toBeVisible();

    await page.getByRole('button', { name: 'Hide the Banter Banner' }).click();
    await expect(banner).not.toBeVisible();

    // Preference survives a reload
    await page.reload();
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
    await expect(page.getByText('Banter Banner', { exact: true })).not.toBeVisible();

    // Footer toggle brings it back
    await page.getByRole('button', { name: 'Show Banter Banner' }).click();
    await expect(page.getByText('Banter Banner', { exact: true })).toBeVisible();
  });
});

test.describe('Derby detection UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('match cards flag derbies between two owners but not same-owner games', async ({ page }) => {
    // Spain (Eoin) vs Sweden (Tom) → derby
    const derbyCard = page.locator('aside div.card').filter({ hasText: 'Spain' }).filter({ hasText: 'Sweden' });
    await expect(derbyCard.getByText('derby')).toBeVisible();
    // Mexico vs Iraq are both Hazel's teams → no derby
    const sameOwnerCard = page.locator('aside div.card').filter({ hasText: 'Mexico' }).filter({ hasText: 'Iraq' });
    await expect(sameOwnerCard.getByText('derby')).not.toBeVisible();
  });

  test('game modal shows the sweepstake derby strip with both owners', async ({ page }) => {
    // Spain 4–1 Sweden in recent results
    await page.locator('aside').getByRole('button', { name: /4.+1/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Sweepstake derby')).toBeVisible();
    await expect(dialog.getByText('Eoin', { exact: true }).first()).toBeVisible();
    await expect(dialog.getByText('Tom', { exact: true }).first()).toBeVisible();
  });
});

test.describe('Goal horn mute', () => {
  test('footer toggle mutes the horn and the choice survives a reload', async ({ page }) => {
    await page.goto('/?mock=1');
    const toggle = page.locator('footer').getByRole('button', { name: /goal horn/i });
    await expect(toggle).toHaveText(/🔊 horn on/);
    await toggle.click();
    await expect(toggle).toHaveText(/🔇 horn off/);
    await page.reload();
    await expect(page.locator('footer').getByRole('button', { name: /goal horn/i })).toHaveText(/🔇 horn off/);
  });

  test('the flash overlay has a mute button that does not dismiss the celebration', async ({ page }) => {
    await page.goto('/?mock=1&demo=goal');
    const overlay = page.getByRole('button', { name: 'Dismiss goal celebration' });
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await overlay.getByRole('button', { name: 'Mute goal horn' }).click();
    // Mute toggled, celebration still on screen
    await expect(overlay.getByRole('button', { name: 'Unmute goal horn' })).toBeVisible();
    await expect(overlay.getByText('GOAL!')).toBeVisible();
  });
});

test.describe('Goal celebration', () => {
  test('demo goal flashes the overlay and click dismisses it', async ({ page }) => {
    await page.goto('/?mock=1&demo=goal');
    const overlay = page.getByRole('button', { name: 'Dismiss goal celebration' });
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await expect(overlay.getByText('GOAL!')).toBeVisible();
    await expect(overlay.getByText('Mexico')).toBeVisible(); // demo uses the live MEX fixture
    await expect(overlay.getByText('Hazel')).toBeVisible(); // owner badge
    await overlay.click();
    await expect(overlay).not.toBeVisible();
  });
});
