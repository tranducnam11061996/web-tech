import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const releaseMode = process.argv.includes('--release');
const routes = [
  { name: 'product-detail', manifest: '[slug]/page_client-reference-manifest.js', entry: '/src/app/[slug]/page', regressionKb: 235, releaseKb: 205 },
  { name: 'cart', manifest: 'gio-hang/page_client-reference-manifest.js', entry: '/src/app/gio-hang/page', regressionKb: 174, releaseKb: 170 },
  { name: 'checkout', manifest: 'thanh-toan/page_client-reference-manifest.js', entry: '/src/app/thanh-toan/page', regressionKb: 174, releaseKb: 170 },
  { name: 'combo-cart', manifest: 'gio-hang-combo/page_client-reference-manifest.js', entry: '/src/app/gio-hang-combo/page', regressionKb: 174, releaseKb: 170 },
  { name: 'combo-checkout', manifest: 'thanh-toan-combo/page_client-reference-manifest.js', entry: '/src/app/thanh-toan-combo/page', regressionKb: 174, releaseKb: 170 },
];

let failed = false;
for (const route of routes) {
  const manifestPath = path.join(root, '.next/server/app', route.manifest);
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing build manifest: ${manifestPath}`);
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifestMatch = raw.match(/globalThis\.__RSC_MANIFEST\[.*?\] = (\{.*\});\s*$/s);
  if (!manifestMatch) throw new Error(`Invalid client reference manifest: ${manifestPath}`);
  const manifest = JSON.parse(manifestMatch[1]);
  const entry = Object.entries(manifest.entryJSFiles || {}).find(([key]) => key.endsWith(route.entry));
  if (!entry) throw new Error(`Missing route entry ${route.entry} in ${manifestPath}`);
  const chunks = [...new Set(entry[1])];
  const bytes = chunks.reduce((total, chunk) => {
    const chunkPath = path.join(root, '.next', chunk);
    return total + (fs.existsSync(chunkPath) ? fs.statSync(chunkPath).size : 0);
  }, 0);
  const sizeKb = Math.round((bytes / 1024) * 10) / 10;
  const configured = route.name === 'product-detail' ? process.env.PRODUCT_DETAIL_JS_BUDGET_KB : process.env.COMMERCE_JS_BUDGET_KB;
  const budgetKb = Number(configured || (releaseMode ? route.releaseKb : route.regressionKb));
  console.log(`${route.name}: ${sizeKb} KB referenced JS (${releaseMode ? 'release' : 'regression'} budget ${budgetKb} KB)`);
  if (sizeKb > budgetKb) failed = true;
}
if (failed) process.exitCode = 1;
