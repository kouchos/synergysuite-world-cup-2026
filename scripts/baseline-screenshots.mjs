// Baseline ("before") captures for the redesign audit. Captures every view —
// including modals and the pre-tournament live state — at mobile / tablet /
// desktop widths. Run: node scripts/baseline-screenshots.mjs (dev server on :5173)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:5173';
const OUT = resolve(process.env.SCREENSHOT_OUT ?? 'screenshots/baseline');

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const captures = [
  { url: '/?mock=1', tab: 'Pool stage', prefix: 'group' },
  { url: '/?mock=1', tab: 'Knockout ladder', prefix: 'knockout' },
  { url: '/?mock=1', tab: 'Winners', prefix: 'winners-pending' },
  { url: '/?mock=final', tab: 'Winners', prefix: 'winners-final' },
  { url: '/?mock=final', tab: 'Knockout ladder', prefix: 'knockout-final' },
  // Modals (mock mid-tournament)
  { url: '/?mock=1', prefix: 'modal-employee', action: async (page) => {
    await page.getByRole('button', { name: 'Hazel' }).first().click();
  } },
  { url: '/?mock=1', prefix: 'modal-team', action: async (page) => {
    await page.getByRole('button', { name: /Mexico/ }).first().click();
  } },
  { url: '/?mock=1', prefix: 'modal-game', action: async (page) => {
    // open the live match's score button in the sidebar
    await page.getByRole('button', { name: /3.*–.*1|3.*1/ }).first().click();
  } },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  for (const cap of captures) {
    try {
      await page.goto(BASE + cap.url, { waitUntil: 'networkidle' });
      if (cap.tab) {
        await page.getByRole('button', { name: cap.tab }).click();
        await page.waitForTimeout(300);
      }
      if (cap.action) {
        await cap.action(page);
        await page.waitForTimeout(400);
      }
      const file = `${OUT}/${cap.prefix}-${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  wrote ${file}`);
    } catch (e) {
      console.error(`  FAILED ${cap.prefix}-${vp.name}: ${e.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log('done');
