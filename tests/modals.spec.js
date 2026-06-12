// Modal interaction tests — verify the click→modal flow + cross-navigation.
// Runs against mocks since modals only need the local state to render their
// shell. ESPN-dependent network fetches inside modals are exercised in
// network.spec.js when ESPN is reachable.
import { test, expect } from '@playwright/test';

test.describe('Employee modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('clicking the Overall leader chip in the header opens the employee modal', async ({ page }) => {
    const header = page.locator('header');
    await header.getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hazel' })).toBeVisible();
    await expect(page.getByText(/Sweepstake player/i)).toBeVisible();
  });

  test('employee modal shows prize positions and their picks', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByText(/Prize positions/i)).toBeVisible();
    await expect(page.getByText(/Their six picks/i)).toBeVisible();
    // Hazel's 6 teams should all appear in the modal
    for (const name of ['Brazil', 'Mexico', 'Iraq', 'Czechia', 'Egypt', 'Japan']) {
      await expect(page.getByRole('dialog').getByText(name).first()).toBeVisible();
    }
  });

  test('ESC closes the modal', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('clicking the backdrop closes the modal', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Click the backdrop region (outside the dialog content)
    await page.mouse.click(50, 50);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('clicking an owner badge in the worst-team tile opens that owner', async ({ page }) => {
    // Worst team in mid-tournament mock is Curaçao (Jeff)
    await page.locator('header').getByRole('button', { name: /^Jeff$/ }).click();
    await expect(page.getByRole('heading', { name: 'Jeff' })).toBeVisible();
  });
});

test.describe('Team modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('clicking a team name in a group table opens the team modal', async ({ page }) => {
    // Mexico is in Group A of the mid-tournament mock
    const mexicoRow = page.locator('tr').filter({ hasText: 'Mexico' }).first();
    await mexicoRow.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mexico' })).toBeVisible();
  });

  test('team modal shows overview/squad/schedule/group tabs', async ({ page }) => {
    const mexicoRow = page.locator('tr').filter({ hasText: 'Mexico' }).first();
    await mexicoRow.click();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Squad/ })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Schedule/ })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Group/ })).toBeVisible();
  });

  test('Squad tab in team modal opens; shows fallback when ESPN data absent', async ({ page }) => {
    const mexicoRow = page.locator('tr').filter({ hasText: 'Mexico' }).first();
    await mexicoRow.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Squad' }).click();
    // Without ESPN data the panel reports it can't fetch the roster — the
    // exact copy depends on whether teamsRef has an ESPN id.
    await expect(
      page.getByRole('dialog').getByText(/No squad data|ESPN team ID not yet known|Loading squad/i),
    ).toBeVisible();
  });

  test('clicking the owner badge in the team modal opens the employee modal', async ({ page }) => {
    const mexicoRow = page.locator('tr').filter({ hasText: 'Mexico' }).first();
    await mexicoRow.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // The owner-badge button reads "Sweepstake owner → Hazel" — match by text
    await page.getByRole('dialog').getByRole('button', { name: /Sweepstake owner.*Hazel/ }).click();
    await expect(page.getByRole('heading', { name: 'Hazel' })).toBeVisible();
  });

  test('Group tab in team modal shows the four group teams with the current one highlighted', async ({ page }) => {
    const mexicoRow = page.locator('tr').filter({ hasText: 'Mexico' }).first();
    await mexicoRow.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Group' }).click();
    await expect(page.getByText('Group A table')).toBeVisible();
  });
});

test.describe('Game modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('clicking on a score in the live now sidebar opens the game modal', async ({ page }) => {
    // Mid-tournament mock has Mexico 3-1 Iraq live in Group A
    const liveCard = page.locator('aside').locator('section', { hasText: 'Live now' });
    await liveCard.getByRole('button', { name: /3.+1/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Live match/ })).toBeVisible();
    // Scope to dialog to avoid matching Mexico/Iraq elsewhere on the page
    await expect(page.getByRole('dialog').getByText('Mexico').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Iraq').first()).toBeVisible();
  });

  test('game modal renders key events for live matches', async ({ page }) => {
    const liveCard = page.locator('aside').locator('section', { hasText: 'Live now' });
    await liveCard.getByRole('button', { name: /3.+1/ }).click();
    await expect(page.getByRole('dialog').getByText(/Key events/i).first()).toBeVisible();
    // The mock has Santiago Giménez scoring twice in Mexico 3-1 Iraq
    await expect(page.getByRole('dialog').getByText('Santiago Giménez').first()).toBeVisible();
  });

  test('game modal shows Key events / Commentary / Team sheets tabs', async ({ page }) => {
    const liveCard = page.locator('aside').locator('section', { hasText: 'Live now' });
    await liveCard.getByRole('button', { name: /3.+1/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Key events' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Commentary' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Team sheets' })).toBeVisible();

    // Without ESPN summary data (mock ids are not fetchable) the commentary
    // and team-sheets tabs surface their fallbacks rather than empty panels.
    await dialog.getByRole('button', { name: 'Commentary' }).click();
    await expect(dialog.getByText(/No commentary feed available/i)).toBeVisible();
    await dialog.getByRole('button', { name: 'Team sheets' }).click();
    await expect(dialog.getByText(/No team sheets available/i)).toBeVisible();
    // Back to events — the mock's timeline still renders
    await dialog.getByRole('button', { name: 'Key events' }).click();
    await expect(dialog.getByText('Santiago Giménez').first()).toBeVisible();
  });
});

test.describe('Prize modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('clicking the Most cards tile opens the full cards standings', async ({ page }) => {
    // Click the tile kicker (not the leader's name, which opens the employee modal)
    await page.locator('header').getByText('Most cards', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Most cards race' })).toBeVisible();
    // Full ranking — all 8 sweepstake players listed
    for (const name of ['Tom', 'Jeff', 'Joy', 'Jon', 'Eoin', 'Tim', 'Niall', 'Hazel']) {
      await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible();
    }
  });

  test('clicking a player in the cards table shows their card timeline with a running balance', async ({ page }) => {
    await page.locator('header').getByText('Most cards', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    // Tom leads the mock cards race with 7 pts (3 yellows + 2 reds)
    await dialog.getByRole('button', { name: 'Tom', exact: true }).click();
    await expect(dialog.getByText('Card timeline')).toBeVisible();
    await expect(dialog.getByText('Victor Lindelöf').first()).toBeVisible();
    await expect(dialog.getByText('David Alaba')).toBeVisible();
    await expect(dialog.getByText(/Leading the cards race/)).toBeVisible();

    // Back returns to the ranking table
    await dialog.getByRole('button', { name: /Back to standings/ }).click();
    await expect(dialog.getByRole('button', { name: 'Hazel', exact: true })).toBeVisible();
  });

  test('knockout-stage cards count in the race and appear in the timeline', async ({ page }) => {
    await page.locator('header').getByText('Most cards', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    // Tim's only card in the mock is De Paul's yellow in the live R16 ESP–ARG tie
    await dialog.getByRole('button', { name: 'Tim', exact: true }).click();
    await expect(dialog.getByText('Rodrigo De Paul')).toBeVisible();
    await expect(dialog.getByText(/Spain 1–1 Argentina/)).toBeVisible();
    await expect(dialog.getByText(/6 pts behind Tom/)).toBeVisible();
  });

  test('cards drill-down tells a trailing player what they need to take the lead', async ({ page }) => {
    await page.locator('header').getByText('Most cards', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    // Jon (Panama's 2 yellows) is 5 pts behind Tom → 6 pts to lead = 3 reds / 6 yellows
    await dialog.getByRole('button', { name: 'Jon', exact: true }).click();
    await expect(dialog.getByText(/5 pts behind Tom — 3 more reds \(or 6 yellows\) takes the lead/)).toBeVisible();
  });

  test('clicking the Overall leader tile opens the overall standings with a points timeline drill-down', async ({ page }) => {
    await page.locator('header').getByText('Overall leader', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(page.getByRole('heading', { name: 'Overall race' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Hazel', exact: true }).click();
    await expect(dialog.getByText('Points timeline')).toBeVisible();
  });

  test('clicking the Golden boot tile opens the scorers table with a goal timeline drill-down', async ({ page }) => {
    await page.locator('header').getByText('Golden boot', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(page.getByRole('heading', { name: 'Golden boot race' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Lautaro Martínez' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Lautaro Martínez' }).click();
    await expect(dialog.getByText('Goal timeline')).toBeVisible();
    await expect(dialog.getByText(/Argentina 3–0 Panama/).first()).toBeVisible();
  });

  test('clicking the Worst team tile opens the worst-first team ranking', async ({ page }) => {
    await page.locator('header').getByText('Worst team', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(page.getByRole('heading', { name: 'Worst team race' })).toBeVisible();
    // Curaçao props up the mock table; its row is first and carries the spoon
    const firstRow = dialog.locator('tbody tr').first();
    await expect(firstRow).toContainText('Curaçao');
    await expect(firstRow).toContainText('🥄');
    await firstRow.click();
    await expect(dialog.getByText('Results', { exact: true })).toBeVisible();
    await expect(dialog.getByText(/0–5 vs .*Germany/)).toBeVisible();
  });

  test('inner leader buttons still open their own modals, not the prize dialog', async ({ page }) => {
    // Clicking the cards leader's name inside the tile opens Tom's employee modal
    await page.locator('header').getByRole('button', { name: /^Tom$/ }).click();
    await expect(page.getByRole('heading', { name: 'Tom' })).toBeVisible();
    await expect(page.getByText(/Sweepstake player/i)).toBeVisible();
  });
});

test.describe('Back button closes dialogs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('browser back closes an open dialog and stays on the page', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    // Still on the app, not navigated away
    expect(page.url()).toContain('mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('one back press dismisses the dialog even after cross-navigating between modals', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Brazil/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Brazil' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(page.url()).toContain('mock=1');
  });

  test('closing with ESC consumes the history entry so back then leaves the page', async ({ page }) => {
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    // The entry pushed on open was consumed on close — the next back exits the
    // app page (to the blank page the test started from).
    await page.waitForTimeout(200); // let the async history.back() settle
    await page.goBack();
    expect(page.url()).toBe('about:blank');
  });
});

test.describe('Cross-navigation between modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mock=1');
    await expect(page.getByRole('button', { name: /Pool stage/ })).toBeVisible();
  });

  test('employee → team → employee chain', async ({ page }) => {
    // Open Hazel
    await page.locator('header').getByRole('button', { name: /^Hazel$/ }).click();
    await expect(page.getByRole('heading', { name: 'Hazel' })).toBeVisible();

    // Click on Brazil in her picks list
    await page.getByRole('dialog').getByRole('button', { name: /Brazil/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Brazil' })).toBeVisible();

    // Click on Hazel's owner badge inside the team modal — back to employee
    await page.getByRole('dialog').getByRole('button', { name: /Sweepstake owner.*Hazel/ }).click();
    await expect(page.getByRole('heading', { name: 'Hazel' })).toBeVisible();
  });
});
