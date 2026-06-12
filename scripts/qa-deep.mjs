import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3210/AlonseraTestWebsite/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);

// Scroll to the pillars section and step through the pin
const pillarsY = await page.evaluate(() => {
  const el = document.querySelector('[data-pillars]');
  return el.getBoundingClientRect().top + window.scrollY;
});
for (const [i, frac] of [0.15, 0.5, 0.9].entries()) {
  await page.evaluate(({ y, f }) => window.scrollTo(0, y + window.innerHeight * 2.4 * f), { y: pillarsY, f: frac });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `qa-output/deep-pillars-${i}.png` });
}

// Industries hover preview
const row = page.locator('.industries__row').nth(3);
await row.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await row.hover();
await page.waitForTimeout(600);
await page.screenshot({ path: 'qa-output/deep-industries-hover.png' });

// Manifesto mid-scrub
await page.evaluate(() => {
  const el = document.querySelector('[data-scrub-text]');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55);
});
await page.waitForTimeout(800);
await page.screenshot({ path: 'qa-output/deep-manifesto.png' });

await browser.close();
console.log('deep captures done');
