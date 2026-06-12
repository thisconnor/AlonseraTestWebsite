/* Verifies the team bio modal opens with content. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3210/AlonseraTestWebsite/who-we-are.html', { waitUntil: 'load' });
await page.waitForTimeout(1800);
const card = page.locator('.team-card.has-bio').first();
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await card.click();
await page.waitForTimeout(700);
const open = await page.evaluate(() => document.querySelector('[data-bio-modal]')?.open);
const text = await page.evaluate(() => document.querySelector('[data-bio-content]')?.textContent.length ?? 0);
console.log({ modalOpen: open, bioChars: text });
await page.screenshot({ path: 'qa-output/snap-bio-modal.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
console.log('closesWithEsc:', await page.evaluate(() => !document.querySelector('[data-bio-modal]')?.open));
await browser.close();
