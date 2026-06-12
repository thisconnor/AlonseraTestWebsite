/* Flow waves — a full-page ambient layer of flowing contour lines in
   brand tints (the wavy-lines motif, alive). Lines undulate slowly and
   bow around a smoothed cursor position, bleeding down the page across
   section boundaries. Plain 2D canvas: one stroke pass per frame.
   Mount: any element with [data-flow-waves]; tint via data-flow-waves
   ("lilac" | "teal" | "purple"). */

const TINTS = {
  lilac: ['rgba(220,190,247,0.55)', 'rgba(169,156,224,0.4)', 'rgba(93,211,217,0.28)'],
  teal: ['rgba(93,211,217,0.5)', 'rgba(220,190,247,0.42)', 'rgba(89,70,177,0.16)'],
  purple: ['rgba(89,70,177,0.26)', 'rgba(220,190,247,0.5)', 'rgba(93,211,217,0.32)'],
};

export function createFlowWaves(mount, { tint = 'lilac', reduced = false } = {}) {
  const colors = TINTS[tint] || TINTS.lilac;
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none',
  });
  mount.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0;
  let H = 0;
  function resize() {
    W = mount.clientWidth;
    H = mount.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  // Smoothed cursor (page coords relative to mount)
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, ts: 0 };
  function onMove(e) {
    const rect = mount.getBoundingClientRect();
    mouse.tx = e.clientX - rect.left;
    mouse.ty = e.clientY - rect.top;
    mouse.ts = 1;
  }
  function onLeave() { mouse.ts = 0; }
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  const LINES = 16;
  const STEP = 26;
  let t = Math.random() * 100;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    mouse.x += (mouse.tx - mouse.x) * 0.07;
    mouse.y += (mouse.ty - mouse.y) * 0.07;
    mouse.s += (mouse.ts - mouse.s) * 0.05;

    for (let li = 0; li < LINES; li++) {
      const baseY = (H / (LINES + 1)) * (li + 1);
      const phase = li * 0.7;
      ctx.beginPath();
      for (let x = -STEP; x <= W + STEP; x += STEP) {
        let y = baseY
          + Math.sin(x * 0.004 + t * 0.5 + phase) * 16
          + Math.sin(x * 0.0016 - t * 0.3 + phase * 1.7) * 26;
        // Bow around the cursor: lines yield smoothly, like water parting
        const dx = x - mouse.x;
        const dy = baseY - mouse.y;
        const dist2 = dx * dx + dy * dy;
        const influence = Math.exp(-dist2 / 52000) * mouse.s;
        y += Math.sign(dy || 1) * influence * 42
          + Math.sin(t * 1.4 + li) * influence * 10;
        if (x === -STEP) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors[li % colors.length];
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  if (reduced) {
    draw(); // static composition, no animation loop
    return { destroy() { canvas.remove(); } };
  }

  let running = true;
  function tick(_, delta) {
    if (!running || document.hidden) return;
    t += Math.min(delta, 60) / 1000;
    draw();
  }
  gsap.ticker.add(tick);

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  };
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      running = false;
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      canvas.remove();
    },
  };
}
