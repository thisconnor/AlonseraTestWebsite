/* Slices individual logos out of the flat collage images via
   connected-component analysis on the white background, merges nearby
   components into whole marks, then exports each crop upscaled 3x and
   color-graded to the brand's navy monochrome.
   Usage: node scripts/slice-logos.mjs   (sources in /tmp/collages) */
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';

const SRC_DIR = process.env.SRC || '/tmp/collages';
const OUT_DIR = 'assets/img/logos';
mkdirSync(OUT_DIR, { recursive: true });

const INK = 242;        // luminance below this counts as logo ink
const MERGE_X = parseInt(process.env.MX || '11', 10);     // merge boxes whose horizontal gap is below this
const MERGE_Y = parseInt(process.env.MY || '9', 10);
const MIN_SIDE = 12;    // discard specks

function boxesOverlapOrNear(a, b) {
  const gapX = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0);
  const gapY = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
  return gapX <= MERGE_X && gapY <= MERGE_Y;
}

async function slice(file) {
  const img = sharp(`${SRC_DIR}/${file}`).flatten({ background: '#ffffff' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    if (0.299 * r + 0.587 * g + 0.114 * b < INK) ink[i] = 1;
  }

  // BFS connected components → bounding boxes
  const seen = new Uint8Array(W * H);
  let boxes = [];
  const stack = [];
  for (let start = 0; start < W * H; start++) {
    if (!ink[start] || seen[start]) continue;
    let x0 = W, x1 = 0, y0 = H, y1 = 0, count = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      count++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx;
        if (ink[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
      }
    }
    if (count > 12) boxes.push({ x0, x1, y0, y1 });
  }

  // Iteratively merge near neighbours into whole logos
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (boxesOverlapOrNear(boxes[i], boxes[j])) {
          boxes[i] = {
            x0: Math.min(boxes[i].x0, boxes[j].x0),
            x1: Math.max(boxes[i].x1, boxes[j].x1),
            y0: Math.min(boxes[i].y0, boxes[j].y0),
            y1: Math.max(boxes[i].y1, boxes[j].y1),
          };
          boxes.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  boxes = boxes.filter((b) => b.x1 - b.x0 >= MIN_SIDE && b.y1 - b.y0 >= MIN_SIDE);
  // reading order: rows (by center y bucket), then x
  boxes.sort((a, b) => {
    const ay = (a.y0 + a.y1) / 2, by = (b.y0 + b.y1) / 2;
    return Math.abs(ay - by) > 26 ? ay - by : a.x0 - b.x0;
  });

  const stem = file.replace(/\.(png|webp)$/i, '');
  let n = 0;
  for (const b of boxes) {
    n++;
    const pad = 4;
    const left = Math.max(0, b.x0 - pad);
    const top = Math.max(0, b.y0 - pad);
    const w = Math.min(W, b.x1 + pad) - left;
    const h = Math.min(H, b.y1 + pad) - top;
    const grey = await sharp(`${SRC_DIR}/${file}`)
      .flatten({ background: '#ffffff' })
      .extract({ left, top, width: w, height: h })
      .resize({ width: w * 3, kernel: 'lanczos3' })
      .greyscale()
      .png()
      .toBuffer();
    await sharp(grey)
      .linear(
        [(255 - 10) / 255, (255 - 33) / 255, (255 - 130) / 255],
        [10, 33, 130],   // black → brand navy, white stays white
      )
      .webp({ quality: 88 })
      .toFile(`${OUT_DIR}/${stem}-${n}.webp`);
  }
  console.log(`${file}: ${n} logos`);
}

for (const f of readdirSync(SRC_DIR).sort()) {
  if (/\.(png|webp)$/i.test(f)) await slice(f);
}
console.log('done');
