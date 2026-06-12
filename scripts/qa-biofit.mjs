/* Asserts every team bio panel fits entirely inside the viewport. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 375, height: 812 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto('http://localhost:3210/AlonseraTestWebsite/who-we-are.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  const cards = page.locator('.team-card.has-bio');
  const n = await cards.count();
  let worst = { slug: '', h: 0 };
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    if (vp.name === 'desktop') await card.hover();
    else await card.click();
    await page.waitForTimeout(320);
    const m = await page.evaluate(() => {
      const c = document.querySelector('.bio-float__card');
      const r = c.getBoundingClientRect();
      return { slug: document.querySelector('.bio-float h3')?.textContent, h: r.height, top: r.top, bottom: r.bottom };
    });
    const fits = m.top >= 0 && m.bottom <= vp.height;
    if (!fits) console.log(`  ✗ ${vp.name} ${m.slug}: ${Math.round(m.h)}px (top ${Math.round(m.top)}, bottom ${Math.round(m.bottom)})`);
    if (m.h > worst.h) worst = { slug: m.slug, h: m.h };
    if (vp.name === 'mobile') { await page.mouse.click(10, 10); await page.waitForTimeout(250); }
  }
  console.log(`${vp.name}: ${n} bios checked — tallest: ${worst.slug} at ${Math.round(worst.h)}px (viewport ${vp.height}px)`);
  await page.close();
}
await browser.close();
