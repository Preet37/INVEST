// Renders the app icon PNGs from one SVG. Run: node scripts/make-icons.mjs
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright");

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0c1110"/>
  <g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
    <path d="M112 352 L208 256 L272 312 L400 168" fill="none" stroke="#2dd4bf" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M320 160 H408 V248" fill="none" stroke="#2dd4bf" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const browser = await chromium.launch();
for (const [name, size, pad] of [["icon-192", 192, 0.8], ["icon-512", 512, 0.8], ["apple-touch-icon", 180, 0.85]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg(pad).replace("<svg", `<svg width="${size}" height="${size}"`)}</body>`);
  await page.screenshot({ path: `public/icons/${name}.png` });
  await page.close();
}
await browser.close();
