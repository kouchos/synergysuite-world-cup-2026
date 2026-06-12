// "While you were sleeping" recap — unit tests for the pure derivation plus
// UI tests for the visit-marker auto-open, the manual button and the opt-out.
import { test, expect } from '@playwright/test';
import {
  recapSince,
  recapHasContent,
  clampSince,
  rankSnapshot,
  RECAP_WINDOW_MS,
} from '../src/lib/state/recap.js';
import { MOCK_STATE } from '../src/lib/data/mock.js';
import employeesConfig from '../config/employees.json' with { type: 'json' };

const employees = employeesConfig.employees;
const LONG_AGO = new Date('2026-01-01T00:00:00Z').getTime();

test.describe('recapSince', () => {
  test('clamps the window to 48 hours', () => {
    const now = Date.now();
    expect(clampSince(LONG_AGO, now)).toBe(now - RECAP_WINDOW_MS);
    expect(clampSince(now - 1000, now)).toBe(now - 1000);
  });

  test('collects finished results, live games and per-owner deltas', () => {
    const recap = recapSince(MOCK_STATE, Date.now() - 1000, employees);
    // Mock finals are future-dated relative to the test run, so they all land in-window
    expect(recap.results.length).toBeGreaterThan(5);
    expect(recap.results.map((m) => m.id)).toContain('mock-esp-swe');
    expect(recap.live.map((m) => m.id)).toContain('mock-mex-irq');
    // Tom's teams collected 7 card pts in the window (SWE 4 + AUT 3)
    const tom = recap.ownerDeltas.find((d) => d.employee.id === 'tom');
    expect(tom.cardPts).toBe(7);
    expect(recapHasContent(recap)).toBe(true);
  });

  test('England get their recap footnote, negative as ever', () => {
    const recap = recapSince(MOCK_STATE, Date.now() - 1000, employees);
    expect(recap.england).toMatch(/England beat Japan 2–1 — sixty years of hurt/);
  });

  test('diffs rank movements against the stored snapshot', () => {
    const prevRanks = rankSnapshot(MOCK_STATE, employees).map((r) =>
      r.id === 'hazel' ? { ...r, rank: 5 } : r,
    );
    const recap = recapSince(MOCK_STATE, Date.now() - 1000, employees, prevRanks);
    const hazel = recap.movements.find((m) => m.employee.id === 'hazel');
    expect(hazel).toEqual(expect.objectContaining({ from: 5, to: 1 }));
  });

  test('an empty window has no content', () => {
    const quiet = { fixtures: [], knockoutMatches: [], groups: [], topScorers: [] };
    expect(recapHasContent(recapSince(quiet, Date.now(), employees))).toBe(false);
  });
});

test.describe('Recap UI', () => {
  test('footer button opens a 48h recap on demand', async ({ page }) => {
    await page.goto('/?mock=1');
    await page.locator('footer').getByRole('button', { name: /recap of the last 48 hours/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'While you were sleeping' })).toBeVisible();
    await expect(dialog.getByText('Results', { exact: false }).first()).toBeVisible();
    await expect(dialog.getByText('Germany').first()).toBeVisible();
    // The auto-recap toggle flips
    const toggle = dialog.getByRole('button', { name: /Auto-recap/ });
    await expect(toggle).toHaveText(/on/);
    await toggle.click();
    await expect(toggle).toHaveText(/off/);
  });

  test('returning after an absence auto-opens the recap with race movers', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'synergysweep:last-visit',
        JSON.stringify({
          ts: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ranks: [{ id: 'hazel', rank: 2, pts: 9 }],
        }),
      );
      localStorage.setItem('synergysweep:disable-recap', '0');
    });
    await page.goto('/?mock=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'While you were sleeping' })).toBeVisible();
    // Hazel moved 2nd → 1st vs the stored snapshot
    await expect(dialog.getByText('Race movers')).toBeVisible();
    await expect(dialog.getByText('1st')).toBeVisible();
  });

  test('no auto-recap when disabled or on a first visit', async ({ page }) => {
    // First visit: no marker stored → nothing to recap
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Returning, but with recaps disabled
    await page.addInitScript(() => {
      localStorage.setItem(
        'synergysweep:last-visit',
        JSON.stringify({ ts: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), ranks: [] }),
      );
      localStorage.setItem('synergysweep:disable-recap', '1');
    });
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
