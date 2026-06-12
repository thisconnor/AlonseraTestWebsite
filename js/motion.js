/* Data-attribute motion engine. One scan of the DOM wires every
   generic animation; bespoke set pieces live in home.js.
   Vocabulary:
     data-reveal[="up|left|right|fade|scale"]  data-reveal-delay  data-stagger
     data-split="lines|words|chars"            data-scrub-text    data-parallax
     data-counter (+ -prefix/-suffix/-decimals)  data-marquee     data-magnetic
*/
import { hasFinePointer } from './utils.js';

const REVEAL_FROM = {
  up: { y: 44, opacity: 0 },
  left: { x: -44, opacity: 0 },
  right: { x: 44, opacity: 0 },
  fade: { opacity: 0 },
  scale: { scale: 0.96, y: 24, opacity: 0 },
};

function reveal(el, fromVars, delay = 0, stagger = 0) {
  gsap.fromTo(el, fromVars, {
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    duration: 0.9,
    delay,
    stagger,
    ease: 'expo.out',
    onStart() {
      gsap.utils.toArray(el).forEach((t) => t.classList.add('is-animating'));
    },
    onComplete() {
      gsap.utils.toArray(el).forEach((t) => {
        t.classList.remove('is-animating');
        t.style.willChange = '';
      });
    },
    scrollTrigger: {
      trigger: gsap.utils.toArray(el)[0].parentElement ?? el,
      start: 'top 85%',
      once: true,
    },
  });
}

function initReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.closest('[data-hero-seq]')) return;
    const variant = REVEAL_FROM[el.dataset.reveal] ? el.dataset.reveal : 'up';
    const delay = parseFloat(el.dataset.revealDelay || '0');
    gsap.fromTo(el, REVEAL_FROM[variant], {
      x: 0, y: 0, scale: 1, opacity: 1,
      duration: 0.9,
      delay,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

function initStaggers() {
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    const children = [...group.children];
    if (!children.length) return;
    const each = parseFloat(group.dataset.stagger || '0.08');
    reveal(children, { y: 36, opacity: 0 }, 0, each);
    // Draw stat rules alongside their parent's reveal
    group.querySelectorAll('[data-rule]').forEach((rule) => {
      gsap.fromTo(rule, { scaleX: 0 }, {
        scaleX: 1,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: rule, start: 'top 90%', once: true },
      });
    });
  });
}

/* Masked line/word/char reveals for standalone headings (hero headings
   are sequenced by the entrance timeline instead). */
export function splitReveal(el, { delay = 0, scrollTrigger = null } = {}) {
  const type = el.dataset.split || 'lines';
  const split = SplitText.create(el, {
    type,
    mask: type.includes('lines') ? 'lines' : type.includes('words') ? 'words' : 'chars',
    linesClass: 'split-line',
  });
  el.classList.add('is-split');
  const targets = type === 'lines' ? split.lines : type === 'words' ? split.words : split.chars;
  return gsap.fromTo(targets, { yPercent: 115 }, {
    yPercent: 0,
    duration: 1,
    delay,
    stagger: type === 'chars' ? 0.02 : 0.09,
    ease: 'power4.out',
    ...(scrollTrigger ? { scrollTrigger } : {}),
  });
}

function initSplits() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    if (el.closest('[data-hero-seq]') || el.hasAttribute('data-hero-seq')) return;
    splitReveal(el, {
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

/* Word-by-word opacity fill, scrubbed to scroll (manifesto pattern). */
function initScrubText() {
  document.querySelectorAll('[data-scrub-text]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'w' });
    el.classList.add('is-split');
    gsap.to(split.words, {
      opacity: 1,
      stagger: 0.06,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 78%',
        end: 'top 30%',
        scrub: 0.4,
      },
    });
  });
}

function initParallax() {
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const strength = parseFloat(el.dataset.parallax || '0.12');
    const img = el.querySelector('img');
    const target = img || el;
    if (img) gsap.set(img, { scale: 1 + strength * 1.6, transformOrigin: 'center' });
    gsap.fromTo(target, { yPercent: -strength * 100 }, {
      yPercent: strength * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.4,
      },
    });
  });
}

function initCounters() {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const end = parseFloat(el.dataset.counter);
    const prefix = el.dataset.counterPrefix || '';
    const suffix = el.dataset.counterSuffix || '';
    const decimals = parseInt(el.dataset.counterDecimals || '0', 10);
    const state = { v: 0 };
    const render = () => {
      el.textContent = `${prefix}${state.v.toFixed(decimals)}${suffix.replace(/&nbsp;/g, ' ')}`;
    };
    gsap.to(state, {
      v: end,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: render,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

function initMagnetic() {
  if (!hasFinePointer()) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* Generic entrance for [data-hero-seq] elements (used by every page hero).
   Returns the timeline so home.js can append the ocean fade. */
export function heroEntrance() {
  const items = [...document.querySelectorAll('[data-hero-seq]')];
  const nav = document.querySelector('[data-nav]');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  if (nav) tl.fromTo(nav, { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0);

  let at = 0.15;
  items.forEach((el) => {
    if (el.hasAttribute('data-split')) {
      gsap.set(el, { opacity: 1 });
      tl.add(splitReveal(el), at);
      at += 0.22;
    } else {
      tl.fromTo(el, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, at);
      at += 0.1;
    }
  });
  return tl;
}

/* ---------- Animated layered wave dividers ----------
   [data-wave-divider="<token>"] elements get an injected 3-layer SVG
   whose paths drift horizontally at different speeds — a living
   shoreline between sections. The wave pattern repeats every 720 units
   so a 0 → -720 loop is seamless. */
const WAVE_COLORS = {
  'navy-deep': 'hsl(228.5, 80%, 18%)',
  navy: '#0a2182',
  lilac: '#dcbef7',
};

function wavePathD(amp, yMid) {
  // 4 periods of a 720-wide wave, closed upward (fill sits above the curve)
  let d = `M0,${yMid}`;
  for (let i = 0; i < 4; i++) {
    const x = i * 720;
    d += ` C${x + 120},${yMid - amp} ${x + 240},${yMid - amp} ${x + 360},${yMid}`
       + ` C${x + 480},${yMid + amp} ${x + 600},${yMid + amp} ${x + 720},${yMid}`;
  }
  return `${d} L2880,0 L0,0 Z`;
}

export function initWaveDividers({ animate = true } = {}) {
  document.querySelectorAll('[data-wave-divider]').forEach((el) => {
    const color = WAVE_COLORS[el.dataset.waveDivider] || WAVE_COLORS['navy-deep'];
    const layers = [
      { amp: 16, yMid: 34, opacity: 0.18, dur: 26 },
      { amp: 22, yMid: 46, opacity: 0.35, dur: 18 },
      { amp: 26, yMid: 58, opacity: 1, dur: 12 },
    ];
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 1440 90');
    svg.setAttribute('preserveAspectRatio', 'none');
    layers.forEach(({ amp, yMid, opacity, dur }, i) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', wavePathD(amp, yMid));
      path.setAttribute('fill', color);
      path.setAttribute('opacity', String(opacity));
      svg.appendChild(path);
      if (animate) {
        gsap.fromTo(path, { x: i % 2 ? -720 : 0 }, {
          x: i % 2 ? 0 : -720,
          duration: dur,
          ease: 'none',
          repeat: -1,
        });
      }
    });
    el.appendChild(svg);
  });
}

/* Ambient bob for the decorative page-hero wave strokes. */
export function initHeroWaveStrokes() {
  document.querySelectorAll('.page-hero__waves').forEach((svg) => {
    const paths = svg.querySelectorAll('path');
    gsap.fromTo(paths, { opacity: 0, y: 14 }, {
      opacity: 1, y: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', delay: 0.4,
    });
    paths.forEach((p, i) => {
      gsap.to(p, {
        y: i % 2 ? 7 : -7,
        duration: 3.2 + i * 0.45,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    });
  });
}

/* Backgrounds lean toward the cursor: bg-wave photography, wavy-lines
   accents and page-hero strokes drift on a smoothed pointer offset. */
function initCursorParallax() {
  if (!hasFinePointer()) return;
  const layers = [
    ...[...document.querySelectorAll('.bg-wave')].map((el) => ({ el, depth: 18, vars: true })),
    ...[...document.querySelectorAll('.section--waves')].map((el) => ({ el, depth: 12, vars: true })),
    ...[...document.querySelectorAll('.page-hero__waves')].map((el) => ({ el, depth: 30, vars: false })),
  ];
  if (!layers.length) return;
  layers.forEach((l) => {
    if (!l.vars) l.setX = gsap.quickTo(l.el, 'x', { duration: 1.1, ease: 'power2.out' });
    if (!l.vars) l.setY = gsap.quickTo(l.el, 'y', { duration: 1.1, ease: 'power2.out' });
  });
  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    layers.forEach((l) => {
      if (l.vars) {
        gsap.to(l.el, {
          '--mx': nx * l.depth,
          '--my': ny * l.depth,
          duration: 1.1,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        l.setX(nx * l.depth);
        l.setY(ny * l.depth);
      }
    });
  }, { passive: true });
}

/* Chapter accordion: click a row to reveal its summary. */
function initChapterAccordion() {
  document.querySelectorAll('.chapter-list li').forEach((li) => {
    const row = li.querySelector('.chapter-row');
    const summary = li.querySelector('.chapter-summary');
    if (!row || !summary) return;
    gsap.set(summary, { height: 0, opacity: 0, overflow: 'hidden' });
    row.addEventListener('click', () => {
      const open = row.getAttribute('aria-expanded') === 'true';
      row.setAttribute('aria-expanded', String(!open));
      li.classList.toggle('is-open', !open);
      gsap.to(summary, {
        height: open ? 0 : 'auto',
        opacity: open ? 0 : 1,
        duration: 0.55,
        ease: open ? 'power2.in' : 'expo.out',
      });
    });
  });
}

/* Seamless GSAP logo marquees. Markup provides one .logo-marquee__set;
   it is cloned until the track exceeds twice the viewport, then shifted
   by exactly one set-width per loop (the set carries its own trailing
   gap, so the seam is invisible). Hover eases the speed down. */
export function initLogoMarquees({ animate = true } = {}) {
  document.querySelectorAll('[data-logo-marquee]').forEach((wrap) => {
    const track = wrap.querySelector('.logo-marquee__track');
    const set = wrap.querySelector('.logo-marquee__set');
    if (!track || !set) return;
    if (!animate) {
      wrap.classList.add('is-static');
      return;
    }
    const speed = parseFloat(wrap.dataset.logoMarquee || '55'); // px per second
    const reverse = wrap.hasAttribute('data-logo-marquee-reverse');

    const build = () => {
      track.querySelectorAll('.logo-marquee__set:not(:first-child)').forEach((s) => s.remove());
      const setW = set.offsetWidth;
      if (!setW) return null;
      const copies = Math.max(2, Math.ceil((wrap.clientWidth * 2) / setW));
      for (let i = 1; i < copies; i++) track.appendChild(set.cloneNode(true));
      return setW;
    };

    let tween = null;
    const start = () => {
      tween?.kill();
      const setW = build();
      if (!setW) return;
      gsap.set(track, { x: reverse ? -setW : 0 });
      tween = gsap.to(track, {
        x: reverse ? 0 : -setW,
        duration: setW / speed,
        ease: 'none',
        repeat: -1,
      });
    };
    start();

    wrap.addEventListener('mouseenter', () => tween && gsap.to(tween, { timeScale: 0.12, duration: 0.5 }));
    wrap.addEventListener('mouseleave', () => tween && gsap.to(tween, { timeScale: 1, duration: 0.5 }));

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(start, 200);
    });
  });
}

/* Reduced-motion / failure path: make everything visible immediately. */
export function showEverything() {
  document.querySelectorAll('[data-reveal], [data-hero-seq], [data-split], [data-scrub-text]')
    .forEach((el) => {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
    });
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    [...group.children].forEach((c) => { c.style.opacity = '1'; });
  });
  document.querySelectorAll('.logo-marquee').forEach((m) => m.classList.add('is-static'));
}

export function initMotion() {
  initReveals();
  initStaggers();
  initSplits();
  initScrubText();
  initParallax();
  initCounters();
  initMagnetic();
  initWaveDividers({ animate: true });
  initHeroWaveStrokes();
  initCursorParallax();
  initChapterAccordion();
  initLogoMarquees({ animate: true });
}
