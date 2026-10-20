// Generates the animated SVGs in ../assets and the map/mascot used by ../play.
// Run: node scripts/generate.mjs   (stats.svg comes from the workflow)
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catLayer, charLayer, blinkLayer, landmark, drawLandmark, treeCells, ART_CSS } from './art.mjs';
import {
  C, Layer, textWidth, g, at, pct, BASE_CSS, REDUCED, writeSvg, rng, frame, outlinedText, ICON, panel,
  MASCOT_A, MASCOT_B, MASCOT_SLEEP, MASCOT_PAL,
} from './pixel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = p => join(ROOT, p);
const TAU = Math.PI * 2;

// Both characters walking side by side; gap is the girl's offset from the boy in pixels.
const duo = (px, gap) => g('fa', charLayer('boy', 'A', px, 0, 0).toString() + charLayer('girl', 'A', px, gap, 0)) + g('fb', charLayer('boy', 'B', px, 0, 0).toString() + charLayer('girl', 'B', px, gap, 0));
// The cat trots behind; cx is its left edge relative to the boy, feet on the same line.
const withCat = (px, gap, cx) => duo(px, gap) + g('fb', catLayer('A', px, cx, 11 * px)) + g('fa', catLayer('B', px, cx, 11 * px));

// Ink outline around whatever is already drawn, so shapes hold up on white and dark pages.
function outlineShape(L, color = C.ink) {
  const add = [];
  for (const k of L.m.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!L.has(x + dx, y + dy)) add.push([x + dx, y + dy]);
  }
  for (const [x, y] of add) L.set(x, y, color);
}

function shineCss(name, travel, period = 5) {
  return `.${name}{animation:${name} ${period}s steps(20,end) infinite}@keyframes ${name}{0%{transform:translateX(0)}25%,100%{transform:translateX(${travel}px)}}`;
}
const cellsPath = (cells, P) => cells.map(([x, y]) => `M${x * P} ${y * P}h${P}v${P}h-${P}z`).join('');

// ---------- header: side-scrolling night city, the mascot walks in place ----------
function header() {
  const P = 4, CW = 200, CH = 60, W = CW * P, H = CH * P, GROUND = 50;
  const rnd = rng(7);

  const sky = new Layer(P);
  const bands = [[0, C.ink], [14, C.night], [27, C.dusk], [37, C.haze]];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let c = C.ink;
    for (const [s, col] of bands) if (y >= s) c = col;
    for (const [s, col] of bands) {
      if (y === s - 1 && (x + y) % 2 === 0) c = col;
      if (y === s - 2 && x % 4 === 0) c = col;
    }
    sky.set(x, y, c);
  }

  const MX = 174, MY = 11, R = 6;
  const moon = new Layer(P), halo = new Layer(P);
  for (let dy = -R - 4; dy <= R + 4; dy++) for (let dx = -R - 4; dx <= R + 4; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 <= R * R + R) {
      const crater = (dx + 2) ** 2 + (dy + 1) ** 2 <= 2 || (dx - 2) ** 2 + (dy - 2) ** 2 <= 1 || (dx - 1) ** 2 + (dy + 3) ** 2 <= 0;
      moon.set(MX + dx, MY + dy, crater || (d2 > (R - 1.5) ** 2 && dx + dy > 2) ? C.silver : C.cream);
    } else if (d2 <= (R + 4) ** 2 && (dx + dy) % 2 === 0) halo.set(MX + dx, MY + dy, C.violet);
  }

  const stars = [new Layer(P), new Layer(P), new Layer(P)];
  const blocked = (x, y) => (x >= 44 && x <= 156 && y >= 4 && y <= 40) || (Math.abs(x - MX) <= 11 && Math.abs(y - MY) <= 11);
  for (let n = 0; n < 70;) {
    const x = Math.floor(rnd() * CW), y = Math.floor(rnd() * 36);
    if (blocked(x, y)) continue;
    const L = stars[n % 3];
    const col = n % 5 === 0 ? C.yellow : n % 3 === 0 ? C.blue : C.cream;
    if (n % 7 === 0) L.set(x, y, C.cream).set(x - 1, y, col).set(x + 1, y, col).set(x, y - 1, col).set(x, y + 1, col);
    else L.set(x, y, col);
    n++;
  }

  const shoot = new Layer(P);
  shoot.set(0, 0, C.cream).set(0, 1, C.cream);
  for (let i = 1; i <= 10; i++) shoot.set(-i, -Math.floor(i / 2), i < 3 ? C.cream : i < 6 ? C.silver : C.lavender);

  const CLOUD = ['....####......', '..########.##.', '.#############', '##############', '.############.'];
  const clouds = new Layer(P).sprite(CLOUD, 20, 8, { '#': '#3b2f86' }).sprite(CLOUD, 120, 20, { '#': '#33297a' }).tileX(CW);

  const far = new Layer(P);
  for (let x = 0; x < CW; x++) {
    const h = Math.round(13 + 4 * Math.sin(TAU * x / CW * 3) + 3 * Math.sin(TAU * x / CW * 7 + 1) + 1.5 * Math.sin(TAU * x / CW * 13));
    for (let y = GROUND - h; y < GROUND; y++) far.set(x, y, y === GROUND - h ? C.violet : y === GROUND - h + 1 && x % 2 ? C.violet : '#33287a');
  }
  far.tileX(CW);

  const city = new Layer(P), win = new Layer(P), winF = new Layer(P);
  for (let x = 0; x < CW;) {
    const w = Math.min(4 + Math.floor(rnd() * 6), CW - x), h = 4 + Math.floor(rnd() * 9);
    city.rect(x, GROUND - h, w, h, C.ink);
    if (w > 4 && rnd() < 0.3) city.set(x + 2, GROUND - h - 1, C.ink).set(x + 2, GROUND - h - 2, C.ink).set(x + 2, GROUND - h - 3, C.red);
    for (let wy = GROUND - h + 2; wy < GROUND - 1; wy += 2)
      for (let wx = x + 1; wx < x + w - 1; wx += 2)
        if (rnd() < 0.38) (rnd() < 0.2 ? winF : win).set(wx, wy, rnd() < 0.8 ? C.yellow : C.orange);
    x += w + Math.floor(rnd() * 3);
  }
  city.tileX(CW); win.tileX(CW); winF.tileX(CW);

  const ground = new Layer(P);
  for (let y = GROUND; y < CH; y++) for (let x = 0; x < CW; x++) {
    const c = y === GROUND ? C.green : y === GROUND + 1 ? (x % 2 ? C.green : C.moss) : y < GROUND + 4 ? C.moss : (rnd() < 0.14 ? C.dirt : C.brown);
    ground.set(x, y, c);
  }
  for (let x = 0; x < CW; x++) {
    const r = rnd();
    if (r < 0.14) ground.set(x, GROUND - 1, C.green);
    else if (r < 0.18) ground.set(x, GROUND - 1, rnd() < 0.5 ? C.pink : C.yellow);
  }
  for (let x = 0; x < CW; x += 25 + Math.floor(rnd() * 20)) ground.set(x, GROUND + 6, C.silver).set(x + 1, GROUND + 6, C.stone);
  ground.tileX(CW);

  const NAME = 'ANRLLDEV';
  const LP = 3, tw = textWidth(NAME, { scale: 2 }), tx = Math.round((W / LP - tw) / 2), ty = 13;
  const title = new Layer(LP);
  const titleCells = outlinedText(title, NAME, tx, ty, { scale: 2, fill: cy => (cy < 6 ? C.yellow : cy < 8 ? (cy % 2 ? C.orange : C.yellow) : C.orange), outline: C.ink, shadow: C.plum });

  const PRESS = 'PRESS START';
  const press = new Layer(2);
  outlinedText(press, PRESS, Math.round((W / 2 - textWidth(PRESS)) / 2), 54, { fill: C.cream, outline: C.ink });

  const css = BASE_CSS + `
.tw2{animation:tw 2s steps(1) -.5s infinite}
.sc0{animation:sc 200s linear infinite}.sc1{animation:sc 90s linear infinite}.sc2{animation:sc 40s linear infinite}.sc3{animation:sc 9s linear infinite}
@keyframes sc{to{transform:translateX(-${W}px)}}
.shoot{animation:shoot 8s linear infinite}
@keyframes shoot{0%,40%{opacity:0;transform:translate(0,0)}40.01%{opacity:1;transform:translate(0,0);animation-timing-function:steps(30,end)}52%{opacity:1;transform:translate(240px,120px)}52.01%,100%{opacity:0;transform:translate(240px,120px)}}
.halo{animation:halo 4s ease-in-out infinite}@keyframes halo{0%,100%{opacity:.35}50%{opacity:.8}}
.fa,.fb{animation-duration:.36s}.fb{animation-delay:-.18s}
` + shineCss('shine', tw * LP + 120) + REDUCED('.shoot,.shine{display:none}');

  const body = [
    `<defs><clipPath id="logo"><path d="${cellsPath(titleCells, LP)}"/></clipPath></defs>`,
    sky, g('halo', halo), moon, g('tw0', stars[0]), g('tw1', stars[1]), g('tw2', stars[2]),
    at(150, 0, g('shoot', shoot)),
    g('sc0', clouds), g('sc1', far), g('sc2', city + win + g('tw1', winF)), g('sc3', ground),
    title,
    `<g clip-path="url(#logo)"><g class="shine"><rect x="${tx * LP - 60}" y="0" width="24" height="${H}" fill="${C.cream}" opacity=".75"/></g></g>`,
    at(230, GROUND * P - 60, withCat(3, 56, -40)),
  ].join('');
  writeSvg(out('assets/header.svg'), W, H, 'ANRLLDEV. Press start to play this profile as a small game.', css, body);
}

// ---------- about: RPG dialog window with the mascot's portrait ----------
function wrap(text, maxCells) {
  const lines = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (textWidth(next) <= maxCells) cur = next;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function about() {
  const P = 4, TP = 2, CW = 200, W = CW * P;
  const TEXT = "Halo! I'm anrlldev. Right now I'm building a study-program recommender, a college planner, a chat app that runs on Bluetooth, SQL lessons in Indonesian, and a site for a Japanese club. Every quest card below opens the real site, and the stats further down refresh every day.";
  const TX = 184, TY = 76, LH = 24;
  const LINES = wrap(TEXT, Math.floor((W - TX - 32) / TP));
  const CH = Math.max(52, Math.ceil((TY + LINES.length * LH + 20) / P));
  const H = CH * P;

  const L = new Layer(P);
  panel(L, CW, CH, 0, 0, { flat: true });
  const portrait = new Layer(P);
  frame(portrait, 32, 36, C.cream, C.ink, C.navy, 7, 8);
  for (let y = 31; y < 42; y++) for (let x = 9; x < 37; x++) portrait.set(x, y, y === 31 ? C.green : C.moss);
  portrait.set(12, 13, C.cream).set(31, 16, C.yellow).set(20, 11, C.cream).set(34, 24, C.cream);
  const pals = charLayer('boy', 'A', 3, 44, 64).toString() + charLayer('girl', 'A', 3, 100, 64);
  const blinkL = blinkLayer('boy', 3, 44, 64).toString() + blinkLayer('girl', 3, 100, 64);

  const tag = new Layer(TP);
  const nameW = textWidth('ANRLLDEV');
  frame(tag, nameW + 8, 13, C.ink, C.plum, C.plum, TX / TP - 1, 16);
  outlinedText(tag, 'ANRLLDEV', TX / TP + 3, 19, { fill: C.yellow, outline: C.ink });

  const T = 16, CPS = 0.055;
  let t = 0.6, css = '', defs = '', text = '', covers = '';
  LINES.forEach((line, i) => {
    const y = TY + i * LH, wpx = (textWidth(line) + 1) * TP;
    text += new Layer(TP, TX, y).text(line, 0, 0, { color: C.cream });
    let kf = '0%{transform:translateX(0)}';
    [...line].forEach((_, k) => {
      kf += `${pct(((t + (k + 1) * CPS) / T) * 100)}{transform:translateX(${Math.min((textWidth(line.slice(0, k + 1)) + 1) * TP, wpx)}px)}`;
    });
    const s = (t / T) * 100, e = ((t + line.length * CPS) / T) * 100;
    kf += `100%{transform:translateX(${wpx}px)}`;
    t += line.length * CPS + 0.25;
    defs += `<clipPath id="l${i}"><rect x="${TX}" y="${y - 3}" width="${wpx + 18}" height="${LH}"/></clipPath>`;
    covers += `<g clip-path="url(#l${i})"><g class="cover ty${i}"><rect x="${TX}" y="${y - 3}" width="${wpx + 18}" height="${LH}" fill="${C.night}"/><rect class="cu${i}" x="${TX + 2}" y="${y}" width="8" height="14" fill="${C.yellow}"/></g></g>`;
    css += `.ty${i}{animation:ty${i} ${T}s steps(1,end) infinite}@keyframes ty${i}{${kf}}
.cu${i}{animation:cu${i} ${T}s steps(1,end) infinite}@keyframes cu${i}{0%{opacity:0}${pct(s)}{opacity:1}${pct(e)}{opacity:0}100%{opacity:0}}`;
  });
  css += `.lu{animation:fa 1.6s steps(1) infinite}.ld{animation:fa 1.6s steps(1) -.8s infinite}
.bl{animation:bl 4.2s steps(1) infinite}@keyframes bl{0%{opacity:0}93%{opacity:1}97%{opacity:0}}` + REDUCED('.cover,.ld,.bl{display:none}');

  const svgBody = `<defs>${defs}</defs>` + L + portrait + pals + g('bl', blinkL) + tag + text + covers;
  writeSvg(out('assets/about.svg'), W, H, TEXT, css, svgBody);
}

// ---------- world map: island overworld, one landmark per project ----------
// Lake in the middle, a ring road around it, the six places along the outside of the ring.
const RING = { x: 100, y: 50, rx: 58, ry: 20 };
const LAKE = { x: 100, y: 50, rx: 28, ry: 9 };
const ringPoint = t => [RING.x + RING.rx * Math.cos(t), RING.y + RING.ry * Math.sin(t)];
const ringYAt = (x, top) => RING.y + (top ? -1 : 1) * RING.ry * Math.sqrt(Math.max(0, 1 - ((x - RING.x) / RING.rx) ** 2));

// side: where the landmark sits relative to the ring; sign: where its board goes.
const LANDMARKS = {
  tendril: { cx: 62, side: 'top', sign: 'left', label: 'TENDRIL' },
  dblab: { cx: 138, side: 'top', sign: 'right', label: 'DBLAB' },
  kompas: { side: 'left', sign: 'below', label: 'KOMPAS' },
  ivory: { side: 'right', sign: 'below', label: 'IVORY' },
  fileflow: { cx: 62, side: 'bottom', sign: 'left', label: 'FILEFLOW' },
  akari: { cx: 138, side: 'bottom', sign: 'right', label: 'AKARI' },
};
// Bounding box of each landmark on the map grid (cells).
const placeOf = key => {
  const d = LANDMARKS[key], lm = landmark(key);
  if (d.side === 'left') return { x: RING.x - RING.rx - 3 - lm.w, y: RING.y + 12 - lm.h, w: lm.w, h: lm.h };
  if (d.side === 'right') return { x: RING.x + RING.rx + 4, y: RING.y + 12 - lm.h, w: lm.w, h: lm.h };
  const x = d.cx - Math.floor(lm.w / 2);
  const y = d.side === 'top' ? Math.floor(ringYAt(d.cx, true)) - 3 - lm.h : Math.ceil(ringYAt(d.cx, false)) + 3;
  return { x, y, w: lm.w, h: lm.h };
};
// Where on the ring each place is visited: the ring point closest to the landmark.
const STOP_T = {};
export const STOPS = {};
for (const key of Object.keys(LANDMARKS)) {
  const pl = placeOf(key), tx = pl.x + pl.w / 2, ty = pl.y + pl.h / 2;
  let best = 0, bd = Infinity;
  for (let i = 0; i < 360; i++) {
    const t = (i / 360) * Math.PI * 2, [x, y] = ringPoint(t), dd = (x - tx) ** 2 + (y - ty) ** 2;
    if (dd < bd) { bd = dd; best = t; }
  }
  STOP_T[key] = best;
  const [x, y] = ringPoint(best);
  STOPS[key] = [Math.round(x), Math.round(y) + 1];
}

// Park props, drawn as cell maps (outlined) so they can be placed as standalone objects.
function propCells(rows, pal) {
  const m = new Map();
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) m.set(`${x},${y}`, pal[ch]); }));
  const add = [];
  for (const k of m.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!m.has(`${x + dx},${y + dy}`)) add.push(`${x + dx},${y + dy}`);
  }
  for (const k of add) m.set(k, C.ink);
  return m;
}
// Benches face the lake: front view north of it, back view south of it, side views east and west.
const BENCH_PAL = { w: '#d08a55', W: '#8a4a2a', k: '#3a3f5c' };
const BENCH = {
  front: propCells(['.wwwwwww.', '.WWWWWWW.', '.k.....k.', 'wwwwwwwww', 'WWWWWWWWW', '.k.....k.'], BENCH_PAL),
  back: propCells(['.WWWWWWW.', 'wwwwwwwww', 'WWWWWWWWW', 'wwwwwwwww', 'WWWWWWWWW', '.k.....k.'], BENCH_PAL),
  east: propCells(['w....', 'w....', 'W....', 'wwwww', 'WWWWW', 'k...k', 'k...k'], BENCH_PAL),
  west: propCells(['....w', '....w', '....W', 'wwwww', 'WWWWW', 'k...k', 'k...k'], BENCH_PAL),
};
const LAMP = propCells(['.kkk.', 'kyYyk', 'kyyyk', '.kkk.', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '..k..', '.kkk.'], { k: '#3a3f5c', y: C.yellow, Y: C.cream });
const TREE_CELLS = treeCells(7);

// Every object knows its box on the map grid and the row it stands on (base), so anything
// whose base is lower on screen is drawn in front.
function mapObjects() {
  const objs = [];
  const fromCells = (cells, x, y, kind, block) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of cells.keys()) { const [a, b] = k.split(',').map(Number); minX = Math.min(minX, a); minY = Math.min(minY, b); maxX = Math.max(maxX, a); maxY = Math.max(maxY, b); }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    objs.push({
      kind, x, y, w, h, base: y + h, block,
      draw: (px, ox, oy) => {
        const L = new Layer(px, ox - minX * px, oy - minY * px);
        for (const [k, c] of cells) { const [a, b] = k.split(',').map(Number); L.set(a, b, c); }
        return L.toString();
      },
    });
  };
  return { objs, fromCells };
}

function map({ withWalker }) {
  const P = 4, CW = 200, CH = 100, W = CW * P, H = CH * P;
  const rnd = rng(11);
  const base = new Layer(P), sparkA = new Layer(P), sparkB = new Layer(P);

  const island = (x, y) => ((x - 100) / 96) ** 4 + ((y - 50) / 47) ** 4 - 0.05 * Math.sin(x * 0.31) - 0.05 * Math.cos(y * 0.45 + x * 0.07);
  const lake = (x, y) => ((x - LAKE.x) / LAKE.rx) ** 2 + ((y - LAKE.y) / LAKE.ry) ** 2;
  const riverX = y => 100 + Math.round(1.5 * Math.sin(y / 3));
  const isRiver = (x, y) => y >= 26 && y < 43 && Math.abs(x - riverX(y)) <= 1;

  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const m = island(x, y);
    let c;
    if (m > 1) {
      c = m < 1.07 ? C.cream : m < 1.5 ? C.blue : C.navy;
      if (m >= 1.07 && rnd() < 0.02) (rnd() < 0.5 ? sparkA : sparkB).set(x, y, C.cream);
    } else if (m > 0.84) c = C.peach;
    else {
      const r = rnd();
      c = r < 0.05 ? C.green : r < 0.065 ? C.forest : C.moss;
      if (r > 0.995) c = [C.pink, C.yellow, C.cream][Math.floor(rnd() * 3)];
    }
    const lk = lake(x, y);
    if (lk <= 1.3 && m <= 0.84) c = lk > 1.08 ? C.peach : lk > 0.85 ? C.cream : lk > 0.6 ? C.blue : '#1f8fe0';
    if (lk <= 0.8 && rnd() < 0.04) (rnd() < 0.5 ? sparkA : sparkB).set(x, y, C.cream);
    if (isRiver(x, y)) { c = C.blue; if (rnd() < 0.12) (rnd() < 0.5 ? sparkA : sparkB).set(x, y, C.cream); }
    base.set(x, y, c);
  }
  frame(base, CW, CH, C.ink, C.navy, null);

  const taken = new Set();
  const mark = (x, y, w, h, pad = 1) => { for (let j = -pad; j < h + pad; j++) for (let i = -pad; i < w + pad; i++) taken.add(`${x + i},${y + j}`); };
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (island(x, y) > 0.8 || lake(x, y) <= 1.6 || isRiver(x, y)) taken.add(`${x},${y}`);

  // Flowers in a ring around the lake shore.
  const flowers = new Layer(P);
  const PETALS = [C.pink, C.yellow, C.cream, C.red, '#c08cff'];
  for (let i = 0; i < 70; i++) {
    const t = (i / 70) * Math.PI * 2 + rnd() * 0.05;
    if (Math.abs(Math.cos(t)) < 0.12 && Math.sin(t) < 0) continue;
    const r = 1.25 + rnd() * 0.18;
    const fx = Math.round(LAKE.x + LAKE.rx * Math.sqrt(r) * Math.cos(t)), fy = Math.round(LAKE.y + LAKE.ry * Math.sqrt(r) * Math.sin(t));
    if (isRiver(fx, fy)) continue;
    const col = PETALS[Math.floor(rnd() * PETALS.length)];
    flowers.set(fx, fy + 1, C.forest).set(fx, fy, col);
    if (rnd() < 0.5) flowers.set(fx - 1, fy, col).set(fx + 1, fy, col).set(fx, fy - 1, col).set(fx, fy, C.yellow);
  }

  const mtn = new Layer(P);
  for (const [px, top, half] of [[88, 14, 7], [100, 9, 9], [112, 13, 7]]) {
    for (let y = top; y < 26; y++) {
      const w = Math.min(half, Math.round((y - top) * 0.9));
      for (let x = px - w; x <= px + w; x++) mtn.set(x, y, y - top < 3 ? C.cream : x <= px ? C.silver : C.stone);
    }
  }
  outlineShape(mtn);
  mark(80, 8, 41, 19, 1);

  // Ring road: a 3-wide band stamped along the ellipse, with darker dotted edges.
  const road = new Layer(P), roadCells = new Set();
  for (let i = 0; i < 1400; i++) {
    const [x, y] = ringPoint((i / 1400) * Math.PI * 2);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) roadCells.add(`${Math.round(x) + dx},${Math.round(y) + dy}`);
  }
  for (const k of roadCells) {
    const [x, y] = k.split(',').map(Number);
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !roadCells.has(`${x + dx},${y + dy}`));
    road.set(x, y, edge && (x + y) % 2 === 0 ? C.orange : C.peach);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) taken.add(`${x + dx},${y + dy}`);
  }
  {
    const by = Math.round(ringYAt(100, true));
    road.rect(97, by - 2, 7, 5, C.brown);
    for (let i = 97; i <= 103; i++) { road.set(i, by - 2, C.ink); road.set(i, by + 2, C.ink); }
    for (let j = -1; j <= 1; j++) road.set(98, by + j, C.dirt).set(102, by + j, C.dirt);
  }

  const { objs, fromCells } = mapObjects();
  const shadows = new Layer(P);

  // Landmarks and their wooden signs.
  for (const [key, d] of Object.entries(LANDMARKS)) {
    const pl = placeOf(key);
    for (let i = 2; i < pl.w - 2; i++) shadows.set(pl.x + i, pl.y + pl.h, '#00543a');
    objs.push({ kind: `lm-${key}`, x: pl.x, y: pl.y, w: pl.w, h: pl.h, base: pl.y + pl.h, block: [pl.x + 2, pl.y + pl.h - 4, pl.w - 4, 4], draw: (px, ox, oy) => drawLandmark(key, px, ox, oy).svg });
    mark(pl.x, pl.y, pl.w, pl.h + 1, 2);
    const tw = textWidth(d.label), bw = Math.ceil((tw * 2 + 20) / P);
    let sx, sy;
    if (d.sign === 'left') { sx = pl.x - bw - 2; sy = pl.y + pl.h - 12; }
    else if (d.sign === 'right') { sx = pl.x + pl.w + 2; sy = pl.y + pl.h - 12; }
    else { sx = pl.x + Math.floor((pl.w - bw) / 2); sy = pl.y + pl.h + 2; }
    const below = d.sign === 'below';
    objs.push({
      kind: `sign-${key}`, x: sx, y: below ? sy - 2 : sy, w: bw, h: 10, base: below ? sy + 8 : sy + 10, block: null,
      draw: (px, ox, oy) => {
        const top = below ? 2 : 0;
        const L = new Layer(px, ox, oy);
        frame(L, bw, 8, C.ink, C.orange, C.brown, 0, top);
        for (const p of [2, bw - 3]) L.rect(p, below ? 0 : 8, 1, 2, C.dirt);
        const T = new Layer(px / 2, ox + Math.round((bw * px - tw * px / 2) / 2), oy + (top * px) + Math.round(px * 2.25)).text(d.label, 0, 0, { color: C.cream });
        return L.toString() + T;
      },
    });
    mark(sx, sy, bw, 11, 2);
  }

  // Benches facing the lake, lamps along the inner edge of the ring.
  for (const [t, view] of [[-2.3, 'front'], [Math.PI / 2, 'back']]) {
    const side = view === 'east' || view === 'west', bw = side ? 5 : 9, bh = side ? 7 : 6;
    const bx = Math.round(LAKE.x + (LAKE.rx + (side ? 6 : 7)) * Math.cos(t)) - Math.floor(bw / 2);
    const by = Math.round(LAKE.y + (LAKE.ry + 5) * Math.sin(t)) - bh + 2;
    fromCells(BENCH[view], bx, by, `bench-${view}`, [bx, by + bh - 2, bw, 2]);
    mark(bx, by, bw, bh, 1);
  }
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const lx = Math.round(RING.x + (RING.rx - 5) * Math.cos(t)) - 2, ly = Math.round(RING.y + (RING.ry - 4) * Math.sin(t)) - 11;
    fromCells(LAMP, lx, ly, 'lamp', [lx + 1, ly + 10, 3, 2]);
    objs[objs.length - 1].glow = [lx + 2, ly + 1];
    mark(lx, ly, 5, 12, 1);
  }

  // Trees fill the land that is left.
  const spots = [];
  const tryTree = (x, y) => {
    for (let j = 0; j < 12; j++) for (let i = 0; i < 10; i++) if (taken.has(`${x + i},${y + j}`)) return;
    spots.push([x, y]);
    for (let j = 2; j < 10; j++) for (let i = 2; i < 8; i++) taken.add(`${x + i},${y + j}`);
  };
  for (let n = 0; n < 1500; n++) tryTree(2 + Math.floor(rnd() * 192), 2 + Math.floor(rnd() * 92));
  for (const [x, y] of spots) fromCells(TREE_CELLS, x, y, 'tree', [x + 3, y + 9, 4, 2]);

  objs.sort((a, b) => a.base - b.base);
  const glowLayer = new Layer(P);
  for (const o of objs) if (o.glow) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5 && (dx + dy) % 2 === 0) glowLayer.set(o.glow[0] + dx, o.glow[1] + dy, C.yellow);

  const cloudShade = new Layer(P);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 46; x++) if (((x - 23) / 23) ** 2 + ((y - 7) / 7) ** 2 <= 1 && (x + y) % 2 === 0) cloudShade.set(x, y, C.ink);
  const ducks = new Layer(P).rect(86, 48, 3, 2, C.cream).set(88, 47, C.cream).set(89, 47, C.orange).rect(110, 51, 3, 2, C.cream).set(112, 50, C.cream).set(113, 50, C.orange);

  const ground = base + g('tw0', sparkA) + g('tw1', sparkB) + road + flowers + g('swim', ducks) + shadows;
  let css = BASE_CSS + `.swim{animation:swim 9s steps(9) infinite}@keyframes swim{50%{transform:translateX(16px)}}
.lampglow{opacity:.35;animation:lampglow 2.4s steps(2) infinite}@keyframes lampglow{50%{opacity:.6}}
.cs{opacity:.16;animation:cs 46s linear infinite}.cs2{animation-duration:63s;animation-delay:-30s}
@keyframes cs{from{transform:translateX(-200px)}to{transform:translateX(${W + 20}px)}}` + ART_CSS;
  const clouds = at(0, 70, g('cs cs1', cloudShade)) + at(0, 230, g('cs cs2', cloudShade));

  if (withWalker) {
    // The walkers only ever stand on the ring, so each object is either always behind them
    // (its base is above the nearest stretch of road) or always in front.
    const roadYNear = o => {
      const cx = o.x + o.w / 2;
      if (Math.abs(cx - RING.x) >= RING.rx) return RING.y;
      const top = ringYAt(cx, true), bot = ringYAt(cx, false);
      return Math.abs(o.base - top) < Math.abs(o.base - bot) ? top : bot;
    };
    const behind = objs.filter(o => o.base <= roadYNear(o) + 1), front = objs.filter(o => o.base > roadYNear(o) + 1);
    const drawAll = list => list.map(o => o.draw(P, o.x * P, o.y * P)).join('');

    const order = Object.keys(LANDMARKS).sort((a, b) => ((STOP_T[a] + Math.PI / 2) % (Math.PI * 2)) - ((STOP_T[b] + Math.PI / 2) % (Math.PI * 2)));
    const N = 96, PAUSE = 1.5, SPEED = 0.09, t0 = STOP_T[order[0]];
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + (i / N) * Math.PI * 2;
      const [x, y] = ringPoint(t);
      const stopKey = order.find(k => Math.abs(((STOP_T[k] - t0 + Math.PI * 4) % (Math.PI * 2)) - (i / N) * Math.PI * 2) < Math.PI / N);
      pts.push({ xy: stopKey ? STOPS[stopKey] : [Math.round(x), Math.round(y) + 1], stop: Boolean(stopKey) });
    }
    let t = 0;
    const frames = [{ t: 0, xy: pts[0].xy, steps: 0 }];
    t += PAUSE; frames.push({ t, xy: pts[0].xy, steps: 0 });
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1].xy, [bx, by] = pts[i].xy;
      const dist = Math.max(1, Math.abs(bx - ax) + Math.abs(by - ay));
      t += dist * SPEED;
      frames.push({ t, xy: pts[i].xy, steps: dist });
      if (pts[i].stop && i < pts.length - 1) { t += PAUSE; frames.push({ t, xy: pts[i].xy, steps: 0 }); }
    }
    const [sx, sy] = pts[0].xy;
    let kf = '';
    frames.forEach((f, i) => {
      const next = frames[i + 1];
      const tf = next && next.steps ? `;animation-timing-function:steps(${next.steps},end)` : ';animation-timing-function:steps(1,end)';
      kf += `${pct((f.t / t) * 100)}{transform:translate(${(f.xy[0] - sx) * P}px,${(f.xy[1] - sy) * P}px)${tf}}`;
    });
    css += `.route{animation:route ${t.toFixed(2)}s infinite}@keyframes route{${kf}}`;
    const walkers = at((sx - 4) * P, (sy - 10) * P, g('route', withCat(2, -34, -56)));
    const body = ground + mtn + drawAll(behind) + walkers + drawAll(front) + g('lampglow', glowLayer) + clouds;
    writeSvg(out('assets/map.svg'), W, H, MAP_LABEL, css + REDUCED('.puff{display:none}'), body);
  } else {
    // The game draws objects itself so the player can walk behind them.
    writeSvg(out('play/map.svg'), W, H, MAP_LABEL, css, ground + g('lampglow', glowLayer));
    const files = new Map();
    const objects = objs.map(o => {
      const name = o.kind === 'tree' || o.kind === 'bench' || o.kind === 'lamp' ? o.kind : o.kind;
      if (!files.has(name)) {
        files.set(name, true);
        writeSvg(out(`play/obj/${name}.svg`), o.w * P, o.h * P, name, BASE_CSS + ART_CSS, o.draw(P, 0, 0));
      }
      return { src: `obj/${name}.svg`, x: o.x, y: o.y, w: o.w, h: o.h, z: o.base, block: o.block };
    });
    objects.push({ src: 'obj/mountains.svg', x: 79, y: 7, w: 43, h: 21, z: 26, block: [80, 14, 41, 12] });
    const M = new Layer(P, -79 * P, -7 * P);
    for (const [k, c] of mtn.m) { const [a, b] = k.split(',').map(Number); M.set(a, b, c); }
    writeSvg(out('play/obj/mountains.svg'), 43 * P, 21 * P, 'mountains', '', M.toString());
    writeFileSync(out('play/stops.js'), `// Generated by scripts/generate.mjs: stops, the lake, and every object with its depth (z) and blocking box.\nwindow.MAP = ${JSON.stringify({ stops: STOPS, lake: LAKE, objects })};\n`);
  }
}
const MAP_LABEL = 'World map: an island with a lake in the middle, flowers, benches and lamps around it, a ring road and six places along the road: Kompas, Ivory, Tendril, DBLab, FileFlow and AKARI.';

// ---------- section ribbons (text only) ----------
function ribbon(file, text) {
  const P = 2, tw = textWidth(text);
  const BW = 7 + tw + 7;
  const L = new Layer(P);
  const tailC = '#5e1c40', shade = '#3b0f28';
  for (const side of [0, 1]) {
    for (let y = 3; y < 15; y++) for (let i = 0; i < 7; i++) {
      const notch = Math.max(0, 3 - Math.abs(y - 8.5)) | 0;
      if (i < notch) continue;
      L.set(side === 0 ? i : BW + 6 - i, y, i > 4 ? shade : tailC);
    }
  }
  for (let y = 0; y < 12; y++) for (let x = 3; x < BW + 4; x++) L.set(x, y, y === 0 ? C.pink : y === 11 ? shade : C.plum);
  outlineShape(L);
  outlinedText(L, text, 10, 2, { fill: C.yellow, outline: C.ink });
  writeSvg(out(`assets/${file}`), (BW + 8) * P, 16 * P, text, '', at(P, P, L.toString()));
}

// ---------- pixel buttons (wrapped in real links in the README) ----------
function button(file, label, w) {
  const P = 2, CW = Math.round(w / P), CH = 22;
  const L = new Layer(P);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const ex = Math.min(x, CW - 1 - x), ey = Math.min(y, CH - 1 - y);
    if (ex + ey < 2) continue;
    L.set(x, y, ex === 0 || ey === 0 || ex + ey === 2 ? C.ink : y === 1 ? C.pink : y >= CH - 4 ? '#3b0f28' : C.plum);
  }
  outlinedText(L, label, Math.round((CW - textWidth(label)) / 2), 6, { fill: C.yellow, outline: C.ink });
  const css = shineCss('shine', CW * P + 80, 4) + REDUCED('.shine{display:none}');
  const body = `<defs><clipPath id="b"><rect x="${P}" y="${P}" width="${(CW - 2) * P}" height="${(CH - 5) * P}"/></clipPath></defs>` + L
    + `<g clip-path="url(#b)"><g class="shine"><rect x="-40" y="0" width="18" height="${CH * P}" fill="${C.cream}" opacity=".25"/></g></g>`;
  writeSvg(out(`assets/${file}`), CW * P, CH * P, label, css, body);
}

// ---------- quest cards: one per project, illustration alternates sides ----------
const QUESTS = [
  ['kompas', 'Kompas Program Studi', 'Study-program recommendations for students, based on grades, interests, talents and preferences.', 'NestJS, PostgreSQL'],
  ['ivory', 'Ivory', 'Planner for college life: tasks, class schedule, grades and attendance. Works offline and syncs.', 'Node.js, Tauri, PWA'],
  ['tendril', 'Tendril', 'Android chat that works over Bluetooth, no internet needed.', 'Kotlin, Jetpack Compose'],
  ['dblab', 'DBLab', 'SQL lessons in Indonesian, with queries running right in the browser.', 'Next.js, sql.js'],
  ['fileflow', 'FileFlow', 'Desktop app that automates file chores.', 'Tauri'],
  ['akari', 'AKARI', 'Website for a Japanese culture club, with a meetings and attendance area.', 'Next.js, Supabase'],
];
// Each card gets its own time of day so the four read as different places.
const SCENES = {
  tendril: { sky: [C.blue, '#6cc4ff', '#a8dcff'], ground: [C.green, C.moss], accent: C.green },
  dblab: { sky: [C.ink, C.night, C.dusk], ground: [C.haze, C.navy], accent: C.blue },
  fileflow: { sky: [C.plum, C.red, C.orange, C.yellow], ground: [C.brown, C.dirt], accent: C.orange },
  akari: { sky: [C.ink, '#2b0f2a', C.plum], ground: [C.moss, '#00543a'], accent: C.pink },
  kompas: { sky: [C.navy, C.lavender, C.pink], ground: [C.green, C.moss], accent: C.yellow },
  ivory: { sky: ['#8ea6c8', '#b9cbe3', '#dde7f3'], ground: ['#ffffff', '#d6e0ec'], accent: C.cream },
};
function questCard([key, name, desc, tags], i) {
  const P = 4, CW = 200, W = CW * P, SP = 6, TP = 2;
  const left = i % 2 === 0;
  const sc = SCENES[key];
  const bw = 46, bh = 34;
  const tx = left ? (6 + bw + 6) * P : 28, maxW = W - (bw + 18) * P - 28;
  const lines = wrap(desc, Math.floor(maxW / TP));
  const blockH = 28 + 18 + lines.length * 20 + 8 + 14;
  const CH = Math.max(46, Math.ceil((blockH + 64) / P)), H = CH * P;
  const rnd = rng(30 + i);
  const L = new Layer(P);
  panel(L, CW, CH, 0, 0, { flat: true });
  const bx = left ? 6 : CW - 6 - bw, by = Math.round((CH - bh) / 2);
  const box = new Layer(P);
  frame(box, bw, bh, C.cream, C.ink, C.dusk, bx, by);
  const horizon = by + 25;
  for (let y = by + 2; y < horizon; y++) {
    const f = (y - by - 2) / (horizon - by - 2), band = Math.min(sc.sky.length - 1, Math.floor(f * sc.sky.length));
    for (let x = bx + 2; x < bx + bw - 2; x++) {
      const next = sc.sky[Math.min(sc.sky.length - 1, band + 1)];
      const edge = (f * sc.sky.length) % 1 > 0.8 && (x + y) % 2 === 0;
      box.set(x, y, edge ? next : sc.sky[band]);
    }
  }
  for (let y = horizon; y < by + bh - 2; y++) for (let x = bx + 2; x < bx + bw - 2; x++) box.set(x, y, y === horizon ? sc.ground[0] : (rnd() < 0.15 ? sc.ground[0] : sc.ground[1]));

  const deco = new Layer(P), decoB = new Layer(P);
  if (key === 'tendril') {
    for (let k = -2; k <= 2; k++) for (let j = -2; j <= 2; j++) if (k * k + j * j <= 5) deco.set(bx + bw - 8 + k, by + 6 + j, C.yellow);
    for (const [cx, cy] of [[bx + 8, by + 7], [bx + 22, by + 12]]) deco.rect(cx, cy, 6, 2, C.cream).rect(cx + 1, cy - 1, 3, 1, C.cream);
  } else if (key === 'dblab') {
    for (let n = 0; n < 9; n++) (n % 2 ? deco : decoB).set(bx + 3 + Math.floor(rnd() * (bw - 6)), by + 3 + Math.floor(rnd() * 16), n % 3 ? C.cream : C.yellow);
    deco.rect(bx + bw - 9, by + 4, 3, 3, C.cream).set(bx + bw - 8, by + 4, C.dusk);
  } else if (key === 'fileflow') {
    for (let k = -5; k <= 5; k++) for (let j = -5; j <= 0; j++) if (k * k + j * j <= 25) deco.set(bx + bw / 2 + k, horizon - 1 + j, C.yellow);
    for (let x = bx + 4; x < bx + bw - 4; x += 7) decoB.rect(x, by + 6 + (x % 3), 4, 1, C.pink);
  } else if (key === 'kompas') {
    for (const [cx, cy] of [[bx + 8, by + 6], [bx + 16, by + 9], [bx + 33, by + 5]]) decoB.set(cx, cy, C.ink).set(cx - 1, cy - 1, C.ink).set(cx + 1, cy - 1, C.ink);
    for (let k = -2; k <= 2; k++) for (let j = -2; j <= 0; j++) if (k * k + j * j <= 5) deco.set(bx + bw - 7 + k, by + 22 + j, C.yellow);
  } else if (key === 'ivory') {
    for (let n = 0; n < 14; n++) (n % 2 ? deco : decoB).set(bx + 3 + Math.floor(rnd() * (bw - 6)), by + 3 + Math.floor(rnd() * 20), '#ffffff');
  } else {
    for (let x = bx + 3; x < bx + bw - 3; x++) deco.set(x, by + 4 + Math.round(Math.sin((x - bx) / 5) * 1.5), C.stone);
    for (let x = bx + 5, n = 0; x < bx + bw - 4; x += 6, n++) {
      const yy = by + 6 + Math.round(Math.sin((x - bx) / 5) * 1.5);
      (n % 2 ? deco : decoB).rect(x, yy, 2, 2, C.red).set(x, yy, C.yellow);
    }
  }

  const lmInfo = landmark(key), LS = 4;
  const lx = bx * P + Math.round((bw * P - lmInfo.w * LS) / 2), ly = (horizon + 2) * P - lmInfo.h * LS;
  const sprite = drawLandmark(key, LS, lx, ly).svg, extra = '';

  let y = Math.round((H - blockH) / 2);
  const T = new Layer(TP);
  outlinedText(T, name, Math.round(tx / TP), Math.round(y / TP), { scale: 2, fill: sc.accent, outline: C.ink, shadow: C.ink });
  y += 28 + 18;
  const descL = lines.map((line, k) => new Layer(TP, tx, y + k * 20).text(line, 0, 0, { color: C.cream })).join('');
  y += lines.length * 20 + 8;
  const tagL = new Layer(TP, tx, y).text(tags, 0, 0, { color: C.lavender });

  const css = BASE_CSS + `.lamp{animation:lamp 1.4s steps(1) infinite}@keyframes lamp{50%{opacity:.3}}
.puff{animation:puff 3s infinite;opacity:0}.p1{animation-delay:-1s}.p2{animation-delay:-2s}
@keyframes puff{0%{opacity:0;transform:translate(0,0);animation-timing-function:steps(6,end)}15%{opacity:1}100%{opacity:0;transform:translate(10px,-30px)}}
.drift{animation:drift 14s linear infinite}@keyframes drift{0%{transform:translateX(-16px)}50%{transform:translateX(16px)}100%{transform:translateX(-16px)}}` + REDUCED('.puff{display:none}');
  const decoSvg = key === 'tendril' || key === 'fileflow' || key === 'kompas' ? g('drift', decoB) + deco : g('tw0', deco) + g('tw1', decoB);
  writeSvg(out(`assets/quest-${key}.svg`), W, H, `${name}: ${desc} ${tags}.`, css, L + box + decoSvg + sprite + extra + T + descL + tagL);
}

// ---------- footer: the mascot sleeps by a campfire ----------
function footer() {
  const P = 4, CW = 200, CH = 40, W = CW * P, H = CH * P, GROUND = 32;
  const rnd = rng(42);
  const L = new Layer(P);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let c = y < 12 ? C.ink : y < 22 ? C.night : C.dusk;
    if ((y === 11 || y === 21) && (x + y) % 2 === 0) c = y === 11 ? C.night : C.dusk;
    if (y >= GROUND) c = y === GROUND ? C.green : y === GROUND + 1 ? (x % 2 ? C.green : C.moss) : y < GROUND + 3 ? C.moss : (rnd() < 0.14 ? C.dirt : C.brown);
    L.set(x, y, c);
  }
  const stars = [new Layer(P), new Layer(P)];
  for (let n = 0; n < 30;) {
    const x = Math.floor(rnd() * CW), y = Math.floor(rnd() * 24);
    if (x > 40 && x < 160 && y > 2 && y < 16) continue;
    stars[n % 2].set(x, y, n % 4 === 0 ? C.yellow : C.silver);
    n++;
  }
  for (let x = 0; x < CW; x++) if (rnd() < 0.12) L.set(x, GROUND - 1, C.green);
  const THANKS = 'THANKS FOR VISITING';
  const title = new Layer(3);
  outlinedText(title, THANKS, Math.round((W / 3 - textWidth(THANKS)) / 2), 9, { fill: cy => (cy < 4 ? C.cream : C.silver), outline: C.ink, shadow: C.plum });
  const mascot = charLayer('boy', 'A', 3, 300, GROUND * P - 60, { asleep: true }).toString() + charLayer('girl', 'A', 3, 344, GROUND * P - 60, { asleep: true }) + catLayer('A', 3, 444, GROUND * P - 27, { asleep: true });
  const log = new Layer(P).rect(73, GROUND - 4, 25, 4, C.brown).rect(73, GROUND - 4, 25, 1, '#c97b4a').rect(73, GROUND - 1, 25, 1, C.dirt).set(73, GROUND - 3, C.dirt).set(97, GROUND - 3, C.dirt);

  const FIRE = [
    ['....y...', '...yy...', '..yoyy..', '..yooy..', '.yoory..', '.yoroyy.', 'bbbbbbbb', '.b.bb.b.'],
    ['...y....', '...yy...', '..yyoy..', '..yooy..', '..yrooy.', '.yyoroy.', 'bbbbbbbb', '.b.bb.b.'],
  ];
  const firePal = { y: C.yellow, o: C.orange, r: C.red, b: C.brown };
  const fireGlow = new Layer(P);
  for (let y = -6; y <= 6; y++) for (let x = -10; x <= 10; x++) if ((x / 10) ** 2 + (y / 6) ** 2 <= 1 && (x + y) % 2 === 0) fireGlow.set(104 + x, GROUND - 3 + y, C.plum);
  const fire = g('fa', new Layer(P).sprite(FIRE[0], 100, GROUND - 8, firePal)) + g('fb', new Layer(P).sprite(FIRE[1], 100, GROUND - 8, firePal));

  let zs = '', flies = '';
  for (let k = 0; k < 3; k++) zs += g(`z z${k}`, new Layer(2, 398, (GROUND - 15) * P).text('z', 0, 0, { color: C.cream }));
  [[30, 22], [58, 26], [140, 24], [168, 20], [120, 27]].forEach(([x, y], k) => {
    flies += g(`fly fl${k}`, new Layer(P).set(x, y, C.yellow), ` style="animation-delay:-${k * 0.9}s"`);
  });
  const css = BASE_CSS + `.z{animation:z 3s infinite;opacity:0}.z1{animation-delay:-1s}.z2{animation-delay:-2s}
@keyframes z{0%{opacity:0;transform:translate(0,0);animation-timing-function:steps(6,end)}10%{opacity:1}90%{opacity:1}100%{opacity:0;transform:translate(14px,-8px)}}
.fly{animation:fly 4.5s steps(1) infinite}@keyframes fly{0%{transform:translate(0,0)}20%{transform:translate(4px,-4px);opacity:.3}40%{transform:translate(8px,0);opacity:1}60%{transform:translate(4px,4px)}80%{transform:translate(0,4px);opacity:.3}}
.glow{animation:halo 1.4s steps(2) infinite}@keyframes halo{0%,100%{opacity:.5}50%{opacity:.9}}` + REDUCED('.z{display:none}');
  writeSvg(out('assets/footer.svg'), W, H, 'Thanks for visiting!', css, L + g('tw0', stars[0]) + g('tw1', stars[1]) + title + g('glow', fireGlow) + log + mascot + fire + zs + flies);
}

function gameSprites() {
  const LANTERN = ['....kkkk....', '..kkkkkkkk..', '.rrrrrrrrrr.', 'rrwrrrrrrrrr', 'RRRRRRRRRRRR', 'rrwrrrrrrrrr', 'rrrrrrrrrrrr', 'RRRRRRRRRRRR', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', 'RRRRRRRRRRRR', '.rrrrrrrrrr.', '..kkkkkkkk..', '....kkkk....', '.....yy.....', '.....yy.....'];
  for (const [name, pal] of [['lantern-off', { k: C.stone, r: C.plum, R: '#4b1531', w: '#a8336f', y: '#a08a40' }], ['lantern-on', { k: C.stone, r: '#ffb347', R: '#e8862a', w: C.cream, y: C.yellow }]]) {
    const L = new Layer(4, 4, 4);
    for (const [k, c] of propCells(LANTERN, pal)) { const [a, b] = k.split(',').map(Number); L.set(a, b, c); }
    writeSvg(out(`play/${name}.svg`), 14 * 4, 18 * 4, name, '', L.toString());
  }
  for (const key of Object.keys(LANDMARKS)) {
    const d = drawLandmark(key, 6, 6, 6);
    writeSvg(out(`play/lm-${key}.svg`), d.w + 12, d.h + 12, LANDMARKS[key].label, BASE_CSS + ART_CSS, d.svg);
  }
  for (const kind of ['boy', 'girl']) for (const f of ['A', 'B'])
    writeSvg(out(`play/${kind}-${f.toLowerCase()}.svg`), 32, 40, kind, '', charLayer(kind, f, 2, 0, 0).toString());
  for (const f of ['A', 'B']) writeSvg(out(`play/cat-${f.toLowerCase()}.svg`), 20, 18, 'cat', '', catLayer(f, 2, 0, 0).toString());
}

header();
about();
map({ withWalker: true });
map({ withWalker: false });
ribbon('title-map.svg', 'WORLD MAP');
ribbon('title-quests.svg', 'QUEST LOG');
ribbon('title-stats.svg', 'STATS');
ribbon('title-contact.svg', 'FIND ME');
QUESTS.forEach(questCard);
button('btn-play.svg', 'START', 300);
button('btn-instagram.svg', 'INSTAGRAM', 390);
button('btn-linkedin.svg', 'LINKEDIN', 390);
footer();
gameSprites();
