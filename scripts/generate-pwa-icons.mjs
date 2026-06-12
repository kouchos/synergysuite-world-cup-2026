// Renders the PWA icon set from the site's brand look (ink background, volt
// "WC26" chip) using headless Chromium — no image tooling needed.
//
//   node scripts/generate-pwa-icons.mjs
//
// Outputs: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
//          public/apple-touch-icon.png (180×180)
import { chromium } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fontPath = path.join(
  root,
  'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2',
);

// chipScale: chip width as a fraction of the canvas. Maskable icons keep the
// chip inside the central safe zone (~80% circle), so it renders smaller.
function iconHtml(size, chipScale) {
  const fontSize = Math.round(size * chipScale * 0.36);
  return `<!doctype html>
<html><head><style>
  @font-face {
    font-family: 'Archivo';
    src: url('file://${fontPath}') format('woff2-variations');
    font-weight: 100 900;
  }
  * { margin: 0; }
  body {
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    background:
      radial-gradient(120% 120% at 50% -20%, #1e2630, #0a0c10 70%);
    overflow: hidden;
  }
  .chip {
    background: #c8f542;
    color: #0a0c10;
    font-family: 'Archivo', sans-serif;
    font-weight: 800;
    font-stretch: 110%;
    font-style: italic;
    font-size: ${fontSize}px;
    letter-spacing: 0.02em;
    line-height: 1;
    padding: ${Math.round(fontSize * 0.42)}px ${Math.round(fontSize * 0.5)}px;
    border-radius: ${Math.round(size * 0.04)}px;
    transform: skewX(-12deg);
  }
  .chip span { display: inline-block; transform: skewX(12deg); }
</style></head>
<body><div class="chip"><span>WC26</span></div></body></html>`;
}

const ICONS = [
  { file: 'public/icons/icon-192.png', size: 192, chipScale: 0.62 },
  { file: 'public/icons/icon-512.png', size: 512, chipScale: 0.62 },
  { file: 'public/icons/icon-maskable-512.png', size: 512, chipScale: 0.58 },
  { file: 'public/apple-touch-icon.png', size: 180, chipScale: 0.62 },
];

await mkdir(path.join(root, 'public/icons'), { recursive: true });
const browser = await chromium.launch();
for (const { file, size, chipScale } of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const tmp = path.join(root, `.icon-${size}-${chipScale}.tmp.html`);
  await writeFile(tmp, iconHtml(size, chipScale));
  await page.goto(`file://${tmp}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, file) });
  await rm(tmp);
  await page.close();
  console.log(`✓ ${file} (${size}×${size})`);
}
await browser.close();
