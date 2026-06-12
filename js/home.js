/* Homepage set pieces: GLSL ocean, pinned pillars, expanding video feature. */

/* ---------- Ocean hero (lazy: only when capable) ---------- */
async function initOcean({ tl, isMobile, webglOK }) {
  const hero = document.querySelector('[data-hero]');
  const mount = document.querySelector('[data-hero-canvas]');
  if (!hero || !mount) return;

  if (isMobile || !webglOK) {
    hero.classList.add('is-fallback'); // brand video (or poster) hero
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
    console.warn('WebGL ocean unavailable; using video hero.', err);
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

/* ---------- Expanding video feature ---------- */
function initVideoFeature() {
  const stage = document.querySelector('[data-video-feature]');
  const frame = document.querySelector('[data-video-frame]');
  const video = document.querySelector('[data-feature-video]');
  const soundBtn = document.querySelector('[data-video-sound]');
  if (!stage || !frame || !video) return;

  gsap.fromTo(frame,
    { clipPath: 'inset(5% 12% round 28px)' },
    {
      clipPath: 'inset(0% 0% round 0px)',
      ease: 'none',
      scrollTrigger: {
        trigger: frame,
        start: 'top 85%',
        end: 'top 22%',
        scrub: 0.5,
      },
    });

  // Merge the film with the motion system: render it as a cursor-reactive
  // water surface on capable desktop browsers (plain video elsewhere).
  if (window.matchMedia('(min-width: 860px) and (hover: hover)').matches) {
    import('./video-ocean.js')
      .then(({ createVideoOcean }) => {
        const ocean = createVideoOcean(frame, video);
        window.addEventListener('pagehide', () => ocean.destroy(), { once: true });
      })
      .catch(() => { /* plain video remains */ });
  }

  soundBtn?.addEventListener('click', () => {
    const unmuting = video.muted;
    video.muted = !unmuting;
    if (unmuting) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    soundBtn.setAttribute('aria-pressed', String(unmuting));
    soundBtn.textContent = unmuting ? 'Sound off' : 'Sound on';
  });
}

export function initHome(ctx) {
  initOcean(ctx);
  initPillars();
  initVideoFeature();
}
