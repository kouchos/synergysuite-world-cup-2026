// Captures screenshots of all three views at the TV target size, plus a couple
// of post-final captures via ?mock=final so the Winners view has something to show.
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

// Each capture: a URL (so we can pass ?mock=final), which tab to click,
// and the filename prefix.
const captures = [
  { url: '/?mock=1',     tab: 'Pool stage',      prefix: 'group' },
  { url: '/?mock=1',     tab: 'Knockout ladder', prefix: 'knockout' },
  { url: '/?mock=1',     tab: 'Winners',         prefix: 'winners' },
  { url: '/?mock=final', tab: 'Knockout ladder', prefix: 'knockout-final' },
  { url: '/?mock=final', tab: 'Winners',         prefix: 'winners-final' },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  for (const cap of captures) {
    await page.goto(BASE + cap.url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: cap.tab }).click();
    await page.waitForTimeout(200);
    const file = `${OUT}/${cap.prefix}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  wrote ${file}`);
  }

  await ctx.close();
}

await browser.close();
console.log('done');
