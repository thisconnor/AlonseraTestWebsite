/* QA loop: every page × three widths. Captures console errors, page
   errors and failed requests; scroll-steps through each page to fire
   reveal animations; saves top + full-page screenshots to qa-output/.
   Usage: node scripts/qa.mjs   (expects a static server on :3210
   serving the repo's PARENT directory, so subpath bugs surface here)   */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE || 'http://localhost:3210/AlonseraTestWebsite/';
const PAGES = ['index.html', 'what-we-do.html', 'who-we-are.html', 'insights.html', 'contact.html'];
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

mkdirSync('qa-output', { recursive: true });

const browser = await chromium.launch();
let totalProblems = 0;

async function auditPage(pageName, vp, { reducedMotion = false } = {}) {
  const label = `${pageName.replace('.html', '')}-${vp.name}${reducedMotion ? '-rm' : ''}`;
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const problems = [];

  page.on('console', (msg) => {
    // Typekit fails through this container's TLS-intercepting proxy; the
    // kit is async + optional by design, so it is excluded from QA.
    if (msg.type() === 'error' && !msg.location()?.url?.includes('typekit')) {
      problems.push(`console.error: ${msg.text()} [${msg.location()?.url ?? ''}]`);
    }
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    // Typekit is expected to fail off-domain; ignore it.
    if (!req.url().includes('typekit')) {
      problems.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('typekit')) {
      problems.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });

  // 'load' rather than 'networkidle': ambient videos stream indefinitely
  await page.goto(BASE + pageName, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500); // entrance choreography
  await page.screenshot({ path: `qa-output/${label}-top.png` });

  // Scroll through in steps so once-reveals and the pin sequence fire
  const steps = await page.evaluate(() => {
    return Math.ceil(document.documentElement.scrollHeight / (window.innerHeight * 0.75));
  });
  for (let s = 0; s < Math.min(steps, 30); s++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.75));
    await page.waitForTimeout(reducedMotion ? 80 : 350);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `qa-output/${label}-full.png`, fullPage: true });

  await context.close();
  if (problems.length) {
    totalProblems += problems.length;
    console.log(`\n✗ ${label}`);
    [...new Set(problems)].forEach((p) => console.log(`   ${p}`));
  } else {
    console.log(`✓ ${label}`);
  }
}

for (const pageName of PAGES) {
  for (const vp of VIEWPORTS) {
    await auditPage(pageName, vp);
  }
}
// Reduced-motion sanity pass on the two richest pages
await auditPage('index.html', VIEWPORTS[2], { reducedMotion: true });
await auditPage('insights.html', VIEWPORTS[0], { reducedMotion: true });

await browser.close();
console.log(totalProblems ? `\n${totalProblems} problem(s) found.` : '\nAll clean.');
process.exit(totalProblems ? 1 : 0);
