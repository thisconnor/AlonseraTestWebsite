/* Imports brand assets from the user-provided asset drop into the repo.
   Source: /tmp/alonsera-assets/Alonsera Website Assets (not committed).
   Run once: node scripts/import-brand-assets.mjs */
import sharp from 'sharp';
import { mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const SRC = '/tmp/alonsera-assets/Alonsera Website Assets';
const IMG = 'assets/img';
mkdirSync(`${IMG}/team`, { recursive: true });

/* ---------- Logos (vector, copied as-is) ---------- */
const logoMap = [
  ['Logos/SVG/alonsera-logo-F_Full-line.svg', `${IMG}/logo-line-full.svg`],
  ['Logos/SVG/alonsera-logo-F_line-1-w.svg', `${IMG}/logo-line-white.svg`],
  ['Logos/SVG/alonsera-logo-F_icon-F.svg', `${IMG}/logo-icon.svg`],
  ['Logos/SVG/alonsera-logo-F_icon-w.svg', `${IMG}/logo-icon-white.svg`],
];
for (const [from, to] of logoMap) {
  copyFileSync(join(SRC, from), to);
  console.log('logo →', to);
}

/* ---------- Team headshots → 640w webp ---------- */
const slugify = (name) =>
  name.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/['.]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const TEAM_DIR = join(SRC, 'Team Headshots');
const special = {
  // preferred files for people with multiple options
  'christine-duque': join(TEAM_DIR, 'Christine/CD Main.png'),
  'nikos-acuna': join(TEAM_DIR, "Nikos/Niko's Headshot.png"),
};

async function toWebp(srcPath, outPath, width) {
  await sharp(srcPath)
    .rotate() // honor EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outPath);
  console.log('img  →', outPath);
}

for (const [slug, path] of Object.entries(special)) {
  await toWebp(path, `${IMG}/team/${slug}.webp`, 640);
}
for (const f of readdirSync(TEAM_DIR)) {
  const full = join(TEAM_DIR, f);
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  if (/christi anderson 2/i.test(f)) continue; // duplicate variant
  const slug = slugify(basename(f, extname(f)));
  await toWebp(full, `${IMG}/team/${slug}.webp`, 640);
}

/* ---------- Brand imagery → webp ---------- */
const imageMap = [
  ['Images/breaking-waves-on-the-sea-shore-2023-11-27-05-00-48-utc.jpg', 'photo-breaking-waves', 1600],
  ['Images/atlantic-ocean-waves-break-beautiful-ice-floes-on-2023-11-27-04-52-33-utc.jpg', 'photo-atlantic-waves', 1600],
  ['Images/a-beautiful-view-of-the-ocean-with-a-beach-on-it-2023-12-29-02-57-00-utc.jpg', 'photo-ocean-beach', 1600],
  ['Images/small-helicopter-flying-above-the-sea-during-sunse-2023-11-27-05-24-01-utc.jpeg', 'photo-sunset-sea', 1600],
  ['Images/matt-paul-catalano-0QEG_xOoY7Y-unsplash (1).jpg', 'photo-wave-crest', 1600],
  ['Images/wavy-lines.png', 'wavy-lines', 1400],
];
for (const [from, name, width] of imageMap) {
  const src = join(SRC, from);
  if (!existsSync(src)) { console.warn('MISSING:', from); continue; }
  await toWebp(src, `${IMG}/${name}.webp`, width);
}
console.log('done');
