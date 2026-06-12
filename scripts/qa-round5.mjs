import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const BASE = 'http://localhost:3210/AlonseraTestWebsite/';

// 1. Service page with flow waves + cursor influence
await page.goto(BASE + 'venture-studio.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);
for (let i = 0; i <= 18; i++) {
  await page.mouse.move(300 + i * 46, 380 + Math.sin(i * 0.5) * 110);
  await page.waitForTimeout(30);
}
await page.waitForTimeout(200);
await page.screenshot({ path: 'qa-output/snap-service-flowwaves.png' });

// 2. Hover bio panel on who-we-are
await page.goto(BASE + 'who-we-are.html', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const card = page.locator('.team-card.has-bio').first();
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await card.hover();
await page.waitForTimeout(700);
console.log('bio panel visible:', await page.evaluate(() =>
  document.querySelector('[data-bio-float]')?.classList.contains('is-visible')));
await page.screenshot({ path: 'qa-output/snap-bio-hover.png' });
await page.mouse.move(40, 40);
await page.waitForTimeout(600);
console.log('bio panel hides:', await page.evaluate(() =>
  !document.querySelector('[data-bio-float]')?.classList.contains('is-visible')));

// 3. Chapter accordion on insights
await page.goto(BASE + 'insights.html', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const row = page.locator('.chapter-list .chapter-row').first();
await row.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await row.click();
await page.waitForTimeout(800);
await page.screenshot({ path: 'qa-output/snap-chapter-open.png' });

// 4. Hero swell blend after a slow stroke
await page.goto(BASE + 'index.html', { waitUntil: 'load' });
await page.waitForTimeout(2600);
for (let i = 0; i <= 30; i++) {
  await page.mouse.move(300 + i * 30, 660 + Math.sin(i * 0.35) * 40);
  await page.waitForTimeout(35);
}
await page.waitForTimeout(300);
await page.screenshot({ path: 'qa-output/snap-hero-swell.png' });

await browser.close();
console.log('round5 captures done');
