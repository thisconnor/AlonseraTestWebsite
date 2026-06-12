/* Homepage set pieces: particle ocean, pinned pillars, industries preview. */
import { hasFinePointer } from './utils.js';

/* ---------- Particle ocean (lazy: only when capable) ---------- */
async function initOcean({ tl, isMobile, webglOK }) {
  const hero = document.querySelector('[data-hero]');
  const mount = document.querySelector('[data-hero-canvas]');
  if (!hero || !mount) return;

  if (isMobile || !webglOK) {
    hero.classList.add('is-fallback');
    return;
  }

  try {
    const { createOcean } = await import('./hero-ocean.js');
    const ocean = await createOcean(mount, {
      tier: window.innerWidth >= 1024 ? 'desktop' : 'tablet',
    });

    // Fade the ocean in as the final beat of the entrance timeline
    tl.add(ocean.fadeIn(1.4), 0.55);

    // Scroll drives swell amplitude + camera pitch; hero copy drifts out
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
      onUpdate: (self) => ocean.setScrollProgress(self.progress),
    });
    gsap.to(hero.querySelector('.hero__content'), {
      yPercent: -18,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 35%', scrub: 0.5 },
    });

    window.addEventListener('pagehide', () => ocean.destroy(), { once: true });
  } catch (err) {
    console.warn('WebGL ocean unavailable; using static hero.', err);
    hero.classList.add('is-fallback');
  }
}

/* ---------- Pinned three-pillars sequence (desktop only) ---------- */
function initPillars() {
  const section = document.querySelector('[data-pillars]');
  if (!section) return;
  const panels = gsap.utils.toArray('[data-pillar-panel]', section);
  const counter = section.querySelector('[data-pillar-counter]');
  const bar = section.querySelector('[data-pillar-bar]');

  const mm = gsap.matchMedia();
  mm.add('(min-width: 860px)', () => {
      section.classList.add('is-pinned');
      gsap.set(panels.slice(1), { autoAlpha: 0, y: 80 });

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=240%',
          pin: true,
          scrub: 0.6,
          onUpdate(self) {
            const idx = Math.min(panels.length - 1, Math.floor(self.progress * panels.length));
            if (counter) counter.textContent = `0${idx + 1}`;
            if (bar) bar.style.transform = `scaleX(${(idx + 1) / panels.length})`;
          },
        },
      });

      tl.to({}, { duration: 0.65 }); // dwell on the first panel before any transition
      panels.forEach((panel, i) => {
        if (i === 0) return;
        tl.to(panels[i - 1], { autoAlpha: 0, y: -70, duration: 0.45 }, `panel${i}`)
          .fromTo(panel, { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 0.55 }, `panel${i}+=0.25`)
          .to({}, { duration: 0.5 }); // dwell on each panel
      });

      return () => {
        section.classList.remove('is-pinned');
        gsap.set(panels, { clearProps: 'all' });
      };
  });
}

/* ---------- Industries: cursor-following preview ---------- */
function initIndustriesPreview() {
  if (!hasFinePointer()) return;
  const list = document.querySelector('[data-industries]');
  const preview = document.querySelector('[data-industries-preview]');
  if (!list || !preview) return;

  const images = new Map();
  list.querySelectorAll('[data-preview]').forEach((row) => {
    const src = row.dataset.preview;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    preview.appendChild(img);
    images.set(row, img);
  });

  const xTo = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3.out' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3.out' });
  gsap.set(preview, { xPercent: 12, yPercent: -50 });

  let visible = false;
  list.addEventListener('mousemove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  list.querySelectorAll('[data-preview]').forEach((row) => {
    row.addEventListener('mouseenter', () => {
      images.forEach((img) => img.classList.remove('is-active'));
      images.get(row)?.classList.add('is-active');
      if (!visible) {
        visible = true;
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' });
      }
    });
  });
  list.addEventListener('mouseleave', () => {
    visible = false;
    gsap.to(preview, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' });
  });
}

export function initHome(ctx) {
  initOcean(ctx);
  initPillars();
  initIndustriesPreview();
}
