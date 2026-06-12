/* Focused full-res section captures: node scripts/qa-snap.mjs <page> <selector> <outname> [width] */
import { chromium } from 'playwright';
const [,, pageName = 'index.html', selector = 'body', out = 'snap', width = '1440'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: parseInt(width, 10), height: 900 } });
await page.goto(`http://localhost:3210/AlonseraTestWebsite/${pageName}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const el = page.locator(selector).first();
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await el.screenshot({ path: `qa-output/${out}.png` });
await browser.close();
console.log(`saved qa-output/${out}.png`);
