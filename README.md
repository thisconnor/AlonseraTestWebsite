# Alonsera — Animated Marketing Site

A rebuilt, animation-first version of [alonsera.com](https://alonsera.com): four static pages
with an orchestrated GSAP motion system and a WebGL particle-ocean hero that brings the
brand's wave graphic to life.

| Page | Highlights |
|---|---|
| `index.html` | Particle ocean hero (Three.js + custom GLSL), scrubbed wave manifesto, animated counters, pinned three-pillars sequence, cursor-following industry previews, partner marquees |
| `what-we-do.html` | Service-line deep dives, engagement process, client-logo industry grid |
| `who-we-are.html` | Mission scrub, leadership profiles, team bench, values |
| `insights.html` | "AI Strategic Outlook 2026" white-paper feature page |

## Stack

- **No build step.** Plain HTML/CSS/JS; libraries are vendored in `assets/vendor/`
  (GSAP 3 + ScrollTrigger/SplitText/Flip, Lenis, Three.js).
- **Brand fidelity.** Design tokens extracted from the live site (`css/tokens.css`):
  navy `#0A2182`, purple `#5946B1`, teal `#56D2DB`, lavender tints; Halyard Display via
  Adobe Fonts with a self-hosted Plus Jakarta Sans fallback (the Typekit kit is
  domain-locked to alonsera.com, so other domains render the fallback automatically).
- **Motion engine.** `js/motion.js` wires animations declaratively via data attributes
  (`data-reveal`, `data-split`, `data-scrub-text`, `data-parallax`, `data-counter`,
  `data-marquee`, `data-magnetic`); bespoke set pieces live in `js/home.js`, and the
  ocean in `js/hero-ocean.js`.
- **Accessibility & fallbacks.** Full `prefers-reduced-motion` support, static wave-image
  hero below 768px / without WebGL / on context loss, keyboard focus styles, skip link,
  content fully visible without JavaScript.

## Run locally

```bash
python3 -m http.server 3210   # from the repo root — or: npx serve .
# open http://localhost:3210/
```

## QA loop

```bash
npm install                          # playwright + serve (dev only)
npx playwright install chromium
python3 -m http.server 3210 --directory ..   # serve the PARENT dir to catch subpath bugs
node scripts/qa.mjs                  # 4 pages × 3 viewports + reduced-motion passes
```

Screenshots and console-error reports land in `qa-output/` (gitignored).
`scripts/qa-snap.mjs <page> <selector> <name> [width]` captures a single section at
full resolution; `scripts/qa-deep.mjs` steps through the pinned sequence and hover states.

## Assets

All imagery is pulled from the live site's CDN by `scripts/fetch-assets.sh`
(logo, wave-lines hero graphic, ocean photography, client-logo industry collages,
partner strips, leadership headshots).

## Deploying to GitHub Pages

The site is fully static with relative paths and ships a `.nojekyll`, so it serves
correctly from a project subpath: **Settings → Pages → Deploy from a branch** →
your default branch, root folder. No configuration changes needed.
