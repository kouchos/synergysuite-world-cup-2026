// Captures screenshots of all three views at the TV target size.
// Run: node scripts/screenshots.mjs   (requires `npm run dev` to be live on :5173)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:5173';
const OUT = resolve('screenshots');

const viewports = [
  { name: 'tv-1080p', width: 1920, height: 1080 },
  { name: 'laptop',   width: 1366, height: 768 },
];

const views = [
  { id: 'group',    label: 'Pool stage' },
  { id: 'knockout', label: 'Knockout ladder' },
  { id: 'winners',  label: 'Winners' },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  for (const view of views) {
    // Click the matching tab so the screenshot reflects that view.
    await page.getByRole('button', { name: view.label }).click();
    // Tiny settle so transitions/layout finish before capture.
    await page.waitForTimeout(150);
    const file = `${OUT}/${view.id}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  wrote ${file}`);
  }

  await ctx.close();
}

await browser.close();
console.log('done');
