/* Boot: capability flags → Lenis/GSAP sync → nav → motion engine →
   per-page modules. Loaded as a module on every page. */
import { prefersReducedMotion, isMobileViewport, webglSupported, fontsReady } from './utils.js';
import { initMotion, heroEntrance, showEverything } from './motion.js';

document.documentElement.classList.add('js');

gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

const reduced = prefersReducedMotion();
const page = document.body.dataset.page;

/* ---------- Smooth scroll (skipped under reduced motion) ---------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.115 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- Navigation ---------- */
function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  // Mark the current page's link
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link, .menu__link').forEach((a) => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  // Scrolled state + hide-on-down/show-on-up
  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle('is-scrolled', y > 24);
    if (y > 160 && y > lastY + 4) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y <= 160) nav.classList.remove('is-hidden');
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);

  // Mobile menu
  const burger = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!burger || !menu) return;
  const links = menu.querySelectorAll('.menu__link, .menu__contact');

  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    if (open) {
      lenis?.stop();
      if (!reduced) {
        gsap.fromTo(links, { y: 34, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out', delay: 0.08,
        });
      }
    } else {
      lenis?.start();
    }
  };

  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
  });
}

/* ---------- Anchor links through Lenis ---------- */
function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ---------- Ambient videos: play only in view, never under reduced motion ---------- */
function initAmbientVideos() {
  const videos = document.querySelectorAll('video[data-ambient-video], video[data-feature-video]');
  if (!videos.length) return;
  if (reduced) {
    videos.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  }, { rootMargin: '100px' });
  videos.forEach((v) => io.observe(v));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach((v) => v.pause());
  });
}

/* ---------- Contact form → pre-filled email ---------- */
function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const subject = `Website inquiry — ${data.get('name') || 'New contact'}`;
    const body = [
      `Name: ${data.get('name') || ''}`,
      `Email: ${data.get('email') || ''}`,
      `Organization: ${data.get('organization') || '—'}`,
      '',
      data.get('message') || '',
    ].join('\n');
    window.location.href =
      `mailto:info@alonsera.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

/* ---------- Team bio: hover (or tap) shows a centered floating panel ---------- */
function initBioHover() {
  const panel = document.querySelector('[data-bio-float]');
  if (!panel) return;
  const photo = panel.querySelector('[data-bio-photo]');
  const nameEl = panel.querySelector('[data-bio-name]');
  const roleEl = panel.querySelector('[data-bio-role]');
  const contentEl = panel.querySelector('[data-bio-content]');
  const card = panel.querySelector('.bio-float__card');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let hideTimer = null;
  let current = null;

  function populate(tile) {
    const slug = tile.dataset.bio;
    const tpl = document.querySelector(`template[data-bio-for="${slug}"]`);
    if (!tpl) return false;
    photo.src = tile.querySelector('img')?.src ?? '';
    photo.alt = '';
    nameEl.textContent = tile.querySelector('h4')?.textContent ?? '';
    roleEl.textContent = tile.querySelector('.team-card__meta span')?.textContent ?? '';
    contentEl.replaceChildren(tpl.content.cloneNode(true));
    return true;
  }

  function show(tile) {
    clearTimeout(hideTimer);
    if (current === tile) return;
    const swap = current !== null;
    if (!populate(tile)) return;
    current = tile;
    panel.classList.add('is-visible');
    if (reduced) {
      panel.style.opacity = '1';
    } else if (swap) {
      gsap.fromTo(card, { scale: 0.985, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' });
      gsap.set(panel, { opacity: 1 });
    } else {
      gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
      gsap.fromTo(card, { y: 18, scale: 0.97 }, { y: 0, scale: 1, duration: 0.4, ease: 'expo.out' });
    }
  }

  function hide() {
    hideTimer = setTimeout(() => {
      current = null;
      if (reduced) {
        panel.style.opacity = '0';
        panel.classList.remove('is-visible');
      } else {
        gsap.to(panel, {
          opacity: 0,
          duration: 0.22,
          ease: 'power2.in',
          onComplete: () => panel.classList.remove('is-visible'),
        });
      }
    }, 140); // grace period to glide between cards without flicker
  }

  document.querySelectorAll('.team-card.has-bio').forEach((tile) => {
    if (fine) {
      tile.addEventListener('mouseenter', () => show(tile));
      tile.addEventListener('mouseleave', hide);
    } else {
      tile.addEventListener('click', () => (current === tile ? hide() : show(tile)));
    }
    tile.addEventListener('focusin', () => show(tile));
    tile.addEventListener('focusout', hide);
  });
  if (!fine) {
    document.addEventListener('click', (e) => {
      if (current && !e.target.closest('.team-card')) hide();
    });
  }
}

/* ---------- Flow-waves ambient layers ---------- */
function initFlowWaves() {
  const mounts = document.querySelectorAll('[data-flow-waves]');
  if (!mounts.length) return;
  import('./flow-waves.js').then(({ createFlowWaves }) => {
    mounts.forEach((mount) => {
      const fw = createFlowWaves(mount, { tint: mount.dataset.flowWaves || 'lilac', reduced });
      window.addEventListener('pagehide', () => fw.destroy(), { once: true });
    });
  }).catch(() => {});
}

/* ---------- Boot ---------- */
initNav();
initAnchors();
initAmbientVideos();
initContactForm();
initBioHover();
initFlowWaves();

if (reduced) {
  showEverything();
} else {
  try {
    initMotion();

    // Entrance choreography starts once fonts settle (or 1.5s, whichever first)
    fontsReady(1500).then(() => {
      const tl = heroEntrance();
      if (page === 'home') {
        import('./home.js').then(({ initHome }) => {
          initHome({ tl, lenis, isMobile: isMobileViewport(), webglOK: webglSupported() });
        }).catch((err) => {
          console.warn('Home module failed; using static hero.', err);
          document.querySelector('[data-hero]')?.classList.add('is-fallback');
        });
      }
    });
  } catch (err) {
    document.documentElement.classList.add('motion-failed');
    console.error('Motion init failed:', err);
  }
}

if (page === 'home' && reduced) {
  document.querySelector('[data-hero]')?.classList.add('is-fallback');
}

window.addEventListener('load', () => ScrollTrigger.refresh());
