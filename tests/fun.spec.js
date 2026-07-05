// The fun stuff: Banter Banner, derby detection, goal celebrations.
// Unit tests run node-side against the pure modules; UI tests use mocks.
import { test, expect } from '@playwright/test';
import {
  banterLines,
  englandLines,
  injectEnglandSnark,
  englandGoalQuip,
  englandLostMatch,
  englandExitRoast,
  englandPenaltyWatch,
} from '../src/lib/state/banter.js';
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
    // Mexico vs Iraq are both Hazel's — the only true derby, and it's live
    expect(lines).toMatch(/Derby LIVE: Hazel's Mexico 3–1 Hazel's Iraq — Hazel wins either way/);
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

test.describe('England commentary snark', () => {
  // A fake ESPN-style feed, newest first: sequences n..1.
  const feed = (n) =>
    Array.from({ length: n }, (_, i) => ({
      sequence: n - i,
      clock: `${n - i}'`,
      text: `Real comment ${n - i}`,
      kind: null,
    }));

  test('injects one snarky entry per 5–8 real comments', () => {
    const out = injectEnglandSnark(feed(40), 'r16-2');
    const snark = out.filter((c) => c.kind === 'snark');
    expect(snark.length).toBeGreaterThanOrEqual(Math.floor(40 / 8));
    expect(snark.length).toBeLessThanOrEqual(Math.floor(40 / 5));
    // Every gap between snark entries is 5–8 real comments (oldest first).
    const gaps = [];
    let run = 0;
    for (const c of [...out].reverse()) {
      if (c.kind === 'snark') {
        gaps.push(run);
        run = 0;
      } else run += 1;
    }
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(5);
      expect(g).toBeLessThanOrEqual(8);
    }
    // Real commentary all survives, in order.
    expect(out.filter((c) => c.kind !== 'snark').map((c) => c.text)).toEqual(
      feed(40).map((c) => c.text),
    );
  });

  test('placement is stable as a live feed grows from the top', () => {
    const early = injectEnglandSnark(feed(20), 'r16-2');
    const later = injectEnglandSnark(feed(33), 'r16-2');
    // The oldest stretch of the bigger feed is identical to the smaller run —
    // snark never reshuffles under the reader mid-match.
    expect(later.slice(-early.length).map((c) => c.text)).toEqual(early.map((c) => c.text));
  });

  test('goal quips are deterministic per goal', () => {
    const kane = { type: 'goal', team: 'ENG', player: 'Harry Kane', minute: 55 };
    const quip = englandGoalQuip(kane, 'r16-2');
    expect(quip.length).toBeGreaterThan(0);
    expect(englandGoalQuip(kane, 'r16-2')).toBe(quip);
    // A different goal can (and here does) draw a different quip
    const jude = { type: 'goal', team: 'ENG', player: 'Jude Bellingham', minute: 78 };
    expect(englandGoalQuip(jude, 'r16-2')).not.toBe(quip);
  });
});

test.describe('England penalty watch', () => {
  const tie = (overrides = {}) => ({
    id: 'qf-1',
    round: 'QF',
    status: 'live',
    home: 'ENG',
    away: 'GER',
    homeGoals: 1,
    awayGoals: 1,
    minute: 85,
    ...overrides,
  });

  test('sounds the klaxon for a level England knockout tie from 80 minutes', () => {
    const line = englandPenaltyWatch({ knockoutMatches: [tie()] });
    expect(line).toMatch(/SHOOTOUT WATCH/);
    expect(line).toMatch(/level with Germany at 85'/);
    expect(line).toMatch(/survival probability: historical/);
  });

  test('stays quiet before the 80th, when England lead or trail, and in group games', () => {
    expect(englandPenaltyWatch({ knockoutMatches: [tie({ minute: 70 })] })).toBeNull();
    expect(englandPenaltyWatch({ knockoutMatches: [tie({ homeGoals: 2 })] })).toBeNull();
    expect(englandPenaltyWatch({ knockoutMatches: [tie({ status: 'final' })] })).toBeNull();
    // A level group game at 85' is just a draw, not a shootout
    expect(englandPenaltyWatch({ fixtures: [tie({ id: 'g-1' })], knockoutMatches: [] })).toBeNull();
  });

  test('the klaxon dominates the banter rotation while active', () => {
    const state = { ...MOCK_STATE, knockoutMatches: [...MOCK_STATE.knockoutMatches, tie({ id: 'qf-watch' })] };
    const lines = banterLines(state, employees);
    expect(lines[0]).toMatch(/SHOOTOUT WATCH/);
    // Every other line is the klaxon — it appears at least a third of the time
    const klaxons = lines.filter((l) => /SHOOTOUT WATCH/.test(l)).length;
    expect(klaxons).toBeGreaterThanOrEqual(Math.floor(lines.length / 3));
  });
});

test.describe('England knocked out', () => {
  const qfLoss = {
    id: 'qf-1',
    round: 'QF',
    utc: '2026-07-10T20:00:00Z',
    home: 'NED',
    away: 'ENG',
    homeGoals: 2,
    awayGoals: 1,
    status: 'final',
  };

  test('englandLostMatch spots regulation and shootout defeats, not wins or draws', () => {
    expect(englandLostMatch(qfLoss)).toBe(true);
    expect(englandLostMatch({ ...qfLoss, homeGoals: 0, awayGoals: 1 })).toBe(false);
    // The classic: level after extra time, out on pens
    expect(
      englandLostMatch({ ...qfLoss, homeGoals: 1, awayGoals: 1, homeShootout: 4, awayShootout: 3 }),
    ).toBe(true);
    expect(
      englandLostMatch({ ...qfLoss, homeGoals: 1, awayGoals: 1, homeShootout: 2, awayShootout: 4 }),
    ).toBe(false);
    // Still live / not England → no verdict
    expect(englandLostMatch({ ...qfLoss, status: 'live' })).toBe(false);
    expect(englandLostMatch({ ...qfLoss, away: 'GER' })).toBe(false);
  });

  test('the exit roast sings them onto the plane', () => {
    const roast = englandExitRoast(qfLoss, employees);
    expect(roast.headline).toBe("They're going home, they're going home, England's going home!");
    const all = roast.lines.join('\n');
    expect(all).toMatch(/years of hurt/);
    expect(all).toMatch(/Sweet Caroline/);
    expect(all).toMatch(/Nessun Dorma/);
    expect(all).toMatch(/quarter-final/);
    // England's owner gets their condolences
    expect(all).toMatch(/Condolences to/);
  });

  test('a shootout exit gets the penalties treatment, a win gets nothing', () => {
    const pens = { ...qfLoss, homeGoals: 1, awayGoals: 1, homeShootout: 4, awayShootout: 3 };
    expect(englandExitRoast(pens, employees).lines[0]).toMatch(/penalties.*traditions/i);
    expect(englandExitRoast({ ...qfLoss, homeGoals: 0, awayGoals: 3 }, employees)).toBeNull();
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
  // Played games live on the Fixtures tab now, so derby checks run there.
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await page.getByRole('button', { name: 'Fixtures', exact: true }).click();
    await expect(page.getByRole('button', { name: /Results/ })).toBeVisible();
  });

  test('match cards flag same-owner derbies, not ordinary owner-vs-owner games', async ({ page }) => {
    // Mexico vs Iraq are both Hazel's teams → derby (she wins either way)
    const derbyCard = page.locator('div.card').filter({ hasText: 'Mexico' }).filter({ hasText: 'Iraq' });
    await expect(derbyCard.getByText('derby')).toBeVisible();
    // Spain (Eoin) vs Sweden (Tom) is just a normal match — every team is owned
    await page.getByRole('button', { name: /Results/ }).click();
    const normalCard = page.locator('div.card').filter({ hasText: 'Spain' }).filter({ hasText: 'Sweden' });
    await expect(normalCard).toBeVisible();
    await expect(normalCard.getByText('derby')).not.toBeVisible();
  });

  test('game modal shows the derby strip only for same-owner games', async ({ page }) => {
    // Mexico 3–1 Iraq (live) — both Hazel's
    const derbyCard = page.locator('div.card').filter({ hasText: 'Mexico' }).filter({ hasText: 'Iraq' });
    await derbyCard.getByRole('button', { name: /3.+1/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Sweepstake derby')).toBeVisible();
    await expect(dialog.getByText('wins either way')).toBeVisible();
    await expect(dialog.getByText('Hazel', { exact: true }).first()).toBeVisible();
    await page.keyboard.press('Escape');

    // Spain 4–1 Sweden (Eoin vs Tom) — no derby strip
    await page.getByRole('button', { name: /Results/ }).click();
    const normalCard = page.locator('div.card').filter({ hasText: 'Spain' }).filter({ hasText: 'Sweden' });
    await normalCard.getByRole('button', { name: /4.+1/ }).click();
    await expect(page.getByRole('dialog').getByText('Sweepstake derby')).not.toBeVisible();
  });
});

test.describe('England key-moment digs UI', () => {
  test("the game modal appends a bracketed dig to England goals only", async ({ page }) => {
    // Pin the clock to just after the mock's Japan–England R16 game so the
    // recap route to the game modal stays open regardless of the real date.
    await page.clock.setFixedTime(new Date('2026-07-06T12:00:00Z'));
    await page.goto('/?mock=1');
    // Reach the Japan–England R16 game via the recap feed
    await page.locator('footer').getByRole('button', { name: /recap of the last 48 hours/i }).click();
    await page
      .getByRole('dialog')
      .locator('button')
      .filter({ hasText: 'Japan' })
      .filter({ hasText: 'England' })
      .click();
    // The recap card stays in the DOM behind the game modal — scope all
    // assertions to the game modal's Key events section.
    await expect(page.getByRole('heading', { name: 'Match report' })).toBeVisible();
    const events = page
      .getByRole('dialog')
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Key events' }) });
    await expect(events.getByText('Harry Kane')).toBeVisible();
    // Two England goals → two italic digs; Kubo's goal gets none
    const digs = events.locator('span.italic');
    await expect(digs).toHaveCount(2);
    await expect(digs.first()).toContainText(/^\(.+\)$/);
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

  test('an England goal celebrates in grey with the horn declining to comment', async ({ page }) => {
    await page.goto('/?mock=1&demo=goal-eng');
    const overlay = page.getByRole('button', { name: 'Dismiss goal celebration' });
    await expect(overlay).toBeVisible({ timeout: 5000 });
    await expect(overlay.getByText('England')).toBeVisible();
    // The accent goes greyscale (#9ca3af) instead of the owner's colour
    await expect(overlay.getByText('GOAL!')).toHaveCSS('color', 'rgb(156, 163, 175)');
    await expect(overlay.getByText('(the air horn has declined to comment)')).toBeVisible();
    // No office party for an England goal
    await expect(overlay.getByText(/England conceded/)).not.toBeVisible();
  });

  test('England conceding throws the office party overlay', async ({ page }) => {
    await page.goto('/?mock=1&demo=concede');
    const overlay = page.getByRole('button', { name: 'Dismiss goal celebration' });
    await expect(overlay).toBeVisible({ timeout: 5000 });
    // The scorer is England's opponent in the mock R32 tie (Bosnia)
    await expect(overlay.getByText('GOAL!')).toBeVisible();
    await expect(overlay.getByText('England conceded — the office celebrates')).toBeVisible();
    await expect(overlay.getByText('(the air horn has declined to comment)')).not.toBeVisible();
  });
});

test.describe('1966 mode', () => {
  test('?era=1966 renders England matches in monochrome, everything else in colour', async ({ page }) => {
    await page.goto('/?mock=1&era=1966');
    await page.getByRole('button', { name: 'Knockout ladder' }).click();
    // England appear twice in the mock bracket (R32 v BIH, R16 v JPN)
    const retro = page.locator('.era-1966');
    await expect(retro).toHaveCount(2);
    await expect(retro.first()).toHaveCSS('filter', /grayscale\(1\)/);
    // England-free ties stay in colour
    const espArg = page.locator('.bracket-cell').filter({ hasText: 'ESP' }).filter({ hasText: 'ARG' });
    await expect(espArg.first()).not.toHaveClass(/era-1966/);
  });

  test('without the query param the world stays in colour', async ({ page }) => {
    await page.goto('/?mock=1');
    await page.getByRole('button', { name: 'Knockout ladder' }).click();
    await expect(page.locator('.bracket-cell').first()).toBeVisible();
    await expect(page.locator('.era-1966')).toHaveCount(0);
  });
});

test.describe('England trophy cabinet', () => {
  test("the team modal lists England's expired silverware", async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-07-06T12:00:00Z'));
    await page.goto('/?mock=1');
    // Recap → Japan–England game modal → England team modal
    await page.locator('footer').getByRole('button', { name: /recap of the last 48 hours/i }).click();
    await page
      .getByRole('dialog')
      .locator('button')
      .filter({ hasText: 'Japan' })
      .filter({ hasText: 'England' })
      .click();
    await expect(page.getByRole('heading', { name: 'Match report' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /England/ }).last().click();
    await expect(page.getByRole('heading', { name: 'England' })).toBeVisible();
    await expect(page.getByText('🏆 Trophy cabinet: 1 (expired 1966)')).toBeVisible();
  });
});
