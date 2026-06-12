/* Drags the cursor across the hero ocean and the video-ocean surface,
   capturing the ripple response. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3210/AlonseraTestWebsite/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2600);

// Stroke across the hero water band
for (let i = 0; i <= 24; i++) {
  await page.mouse.move(200 + i * 44, 640 + Math.sin(i * 0.5) * 60);
  await page.waitForTimeout(28);
}
await page.waitForTimeout(250);
await page.screenshot({ path: 'qa-output/snap-hero-ripples.png' });

// Stroke across the video-ocean feature
const frame = page.locator('[data-video-frame]');
await frame.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const box = await frame.boundingBox();
const hasCanvas = await page.evaluate(() => !!document.querySelector('[data-video-frame] canvas'));
console.log('video-ocean canvas mounted:', hasCanvas);
for (let i = 0; i <= 24; i++) {
  await page.mouse.move(box.x + 80 + i * (box.width - 160) / 24, box.y + box.height * (0.35 + 0.3 * Math.sin(i * 0.6)));
  await page.waitForTimeout(28);
}
await page.waitForTimeout(150);
await page.screenshot({ path: 'qa-output/snap-video-ocean.png' });
await browser.close();
console.log('interaction captures saved');
