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

  test('team modal shows overview/schedule/group tabs', async ({ page }) => {
    const mexicoRow = page.locator('tr').filter({ hasText: 'Mexico' }).first();
    await mexicoRow.click();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Schedule/ })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Group/ })).toBeVisible();
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
    await expect(page.getByRole('dialog').getByText(/Key events/i)).toBeVisible();
    // The mock has Santiago Giménez scoring twice in Mexico 3-1 Iraq
    await expect(page.getByRole('dialog').getByText('Santiago Giménez').first()).toBeVisible();
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
