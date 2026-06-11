// "After" captures for the redesign, mirroring scripts/baseline-screenshots.mjs.
// Also logs any browser console errors so the verification pass can confirm a
// clean console. Run: node scripts/redesign-screenshots.mjs (dev server on :5173)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:5173';
const OUT = resolve(process.env.SCREENSHOT_OUT ?? 'screenshots/redesign');

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
  { url: '/?mock=1', prefix: 'modal-employee', action: async (page) => {
    await page.getByRole('button', { name: 'Hazel', exact: true }).first().click();
  } },
  { url: '/?mock=1', prefix: 'modal-team', action: async (page) => {
    await page.getByRole('button', { name: 'Mexico', exact: true }).first().click();
  } },
  { url: '/?mock=1', prefix: 'modal-game', action: async (page) => {
    await page.locator('aside').getByRole('button', { name: /3.*1/ }).first().click();
  } },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const consoleErrors = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${vp.name}] ${msg.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`[${vp.name}] pageerror: ${e.message}`));

  for (const cap of captures) {
    try {
      await page.goto(BASE + cap.url, { waitUntil: 'networkidle' });
      if (cap.tab) {
        await page.getByRole('button', { name: cap.tab }).click();
        await page.waitForTimeout(450);
      }
      if (cap.action) {
        await cap.action(page);
        await page.waitForTimeout(450);
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
if (consoleErrors.length) {
  console.error('\nConsole errors detected:');
  for (const e of consoleErrors) console.error('  ' + e);
  process.exitCode = 1;
} else {
  console.log('\nConsole clean — no errors.');
}
