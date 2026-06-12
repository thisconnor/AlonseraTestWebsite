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
}

export function initMotion() {
  initReveals();
  initStaggers();
  initSplits();
  initScrubText();
  initParallax();
  initCounters();
  initMagnetic();
}
