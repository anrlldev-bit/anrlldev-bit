// Generates the animated SVGs in ../assets and the map/mascot used by ../play.
// Run: node scripts/generate.mjs   (stats.svg comes from the workflow)
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { charLayer, blinkLayer, landmark, drawLandmark, treeCells, ART_CSS } from './art.mjs';
import {
  C, Layer, textWidth, g, at, pct, BASE_CSS, REDUCED, writeSvg, rng, frame, outlinedText, ICON, panel,
  MASCOT_A, MASCOT_B, MASCOT_SLEEP, MASCOT_PAL,
} from './pixel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = p => join(ROOT, p);
const TAU = Math.PI * 2;

// Both characters walking side by side; gap is the girl's offset from the boy in pixels.
const duo = (px, gap) => g('fa', charLayer('boy', 'A', px, 0, 0).toString() + charLayer('girl', 'A', px, gap, 0)) + g('fb', charLayer('boy', 'B', px, 0, 0).toString() + charLayer('girl', 'B', px, gap, 0));

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
    g('blink', press),
    at(170, GROUND * P - 60, duo(3, 56)),
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
  const TEXT = "Halo! I'm anrlldev. Right now I'm building a chat app that runs on Bluetooth, SQL lessons in Indonesian, and a site for a Japanese club. Every quest card below opens the real site, and the stats further down refresh every day.";
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
const LANDMARKS = {
  tendril: { cx: 32, row: 'top', label: 'TENDRIL' },
  dblab: { cx: 160, row: 'top', label: 'DBLAB' },
  fileflow: { cx: 38, row: 'bottom', label: 'FILEFLOW' },
  akari: { cx: 164, row: 'bottom', label: 'AKARI' },
};
// Bounding box of each landmark on the map grid (cells).
const placeOf = key => {
  const d = LANDMARKS[key], lm = landmark(key);
  const x = d.cx - Math.floor(lm.w / 2), y = d.row === 'top' ? 36 - lm.h : 63;
  return { x, y, w: lm.w, h: lm.h };
};
// Feet positions where the mascot stops for each landmark (also used by play/).
export const STOPS = { tendril: [46, 40], dblab: [146, 40], akari: [164, 61], fileflow: [38, 61] };

function map({ withWalker }) {
  const P = 4, CW = 200, CH = 100, W = CW * P, H = CH * P;
  const rnd = rng(11);
  const base = new Layer(P), sparkA = new Layer(P), sparkB = new Layer(P);

  const island = (x, y) => ((x - 100) / 96) ** 4 + ((y - 50) / 47) ** 4 - 0.05 * Math.sin(x * 0.31) - 0.05 * Math.cos(y * 0.45 + x * 0.07);
  const LAKE = { x: 100, y: 75, rx: 21, ry: 7 };
  const lake = (x, y) => ((x - LAKE.x) / LAKE.rx) ** 2 + ((y - LAKE.y) / LAKE.ry) ** 2;
  const riverX = y => 100 + Math.round(2 * Math.sin(y / 4));
  const isRiver = (x, y) => y >= 33 && y < 70 && Math.abs(x - riverX(y)) <= 1;

  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const m = island(x, y);
    let c;
    if (m > 1) {
      c = m < 1.07 ? C.cream : m < 1.5 ? C.blue : C.navy;
      if (m >= 1.07 && rnd() < 0.025) (rnd() < 0.5 ? sparkA : sparkB).set(x, y, C.cream);
    } else if (m > 0.84) c = rnd() < 0.08 ? C.orange : C.peach;
    else {
      const r = rnd();
      c = r < 0.05 ? C.green : r < 0.065 ? C.forest : C.moss;
      if (r > 0.995) c = [C.pink, C.yellow, C.cream][Math.floor(rnd() * 3)];
    }
    const lk = lake(x, y);
    if (lk <= 1.25 && m <= 0.84) c = lk > 1 ? C.peach : lk > 0.8 ? C.cream : C.blue;
    if (lk <= 0.8 && rnd() < 0.05) (rnd() < 0.5 ? sparkA : sparkB).set(x, y, C.cream);
    if (isRiver(x, y)) { c = C.blue; if (rnd() < 0.12) (rnd() < 0.5 ? sparkA : sparkB).set(x, y, C.cream); }
    base.set(x, y, c);
  }
  frame(base, CW, CH, C.ink, C.navy, null);

  const taken = new Set();
  const mark = (x, y, w, h, pad = 1) => { for (let j = -pad; j < h + pad; j++) for (let i = -pad; i < w + pad; i++) taken.add(`${x + i},${y + j}`); };
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (island(x, y) > 0.8 || lake(x, y) <= 1.4 || isRiver(x, y)) taken.add(`${x},${y}`);

  // Mountains between the two top landmarks; the river starts below them.
  const mtn = new Layer(P);
  for (const [px, top, half] of [[84, 15, 9], [96, 11, 11], [110, 13, 10], [120, 18, 7]]) {
    for (let y = top; y < 34; y++) {
      const w = Math.min(half, Math.round((y - top) * 0.9));
      for (let x = px - w; x <= px + w; x++) mtn.set(x, y, y - top < 3 ? C.cream : x <= px ? C.silver : C.stone);
    }
  }
  outlineShape(mtn);
  mark(74, 9, 56, 27, 1);

  // Roads (3 wide) with brown dotted edges, bridges where they cross the river.
  const road = new Layer(P);
  const roads = [[42, 37, 117, 3], [30, 58, 143, 3], [56, 37, 3, 24], [142, 37, 3, 24]];
  for (const [x, y, w, h] of roads) {
    road.rect(x, y, w, h, C.peach);
    for (let i = 0; i < w; i++) { if (i % 2 === 0) { if (h === 3) { road.set(x + i, y, C.orange); road.set(x + i, y + 2, C.orange); } } }
    mark(x, y, w, h, 2);
  }
  for (const by of [37, 58]) {
    const bx = riverX(by + 1);
    road.rect(bx - 3, by - 1, 7, 5, C.brown);
    for (let i = -3; i <= 3; i++) { road.set(bx + i, by - 1, C.ink); road.set(bx + i, by + 3, C.ink); }
    for (let j = 0; j < 3; j++) road.set(bx - 2, by + j, C.dirt).set(bx + 2, by + j, C.dirt);
  }

  // Landmarks with a wooden sign each.
  const signs = new Layer(P);
  let signText = '', lmSvg = '';
  const shadows = new Layer(P);
  for (const [key, d] of Object.entries(LANDMARKS)) {
    const pl = placeOf(key);
    for (let i = 2; i < pl.w - 2; i++) shadows.set(pl.x + i, pl.y + pl.h, '#00543a');
    lmSvg += drawLandmark(key, P, pl.x * P, pl.y * P).svg;
    mark(pl.x, pl.y, pl.w, pl.h + 1, 2);
    const tw2 = textWidth(d.label) * 2, bw = Math.ceil((tw2 + 20) / P);
    const sx = d.cx - Math.floor(bw / 2), sy = d.row === 'top' ? pl.y - 10 : pl.y + pl.h + 2;
    frame(signs, bw, 8, C.ink, C.orange, C.brown, sx, sy);
    signText += new Layer(2, sx * P + Math.round((bw * P - tw2) / 2), sy * P + 9).text(d.label, 0, 0, { color: C.cream });
    const postY = d.row === 'top' ? sy + 8 : sy - 2;
    for (const px of [sx + 2, sx + bw - 3]) signs.rect(px, postY, 1, 2, C.dirt);
    mark(sx, sy, bw, 10, 2);
  }

  // Forests: overlapping trees packed in rows, plus a few loose ones.
  const TREE = treeCells(7), TW = 10, TH = 12;
  const spots = [];
  const tryTree = (x, y) => {
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) if (taken.has(`${x + i},${y + j}`)) return;
    spots.push([x, y]);
  };
  for (const [x0, y0, x1, y1] of [[46, 14, 74, 34], [124, 10, 150, 34], [62, 63, 80, 92], [120, 63, 150, 92], [8, 40, 24, 58], [176, 40, 192, 58]]) {
    for (let y = y0, row = 0; y <= y1 - TH; y += 5, row++)
      for (let x = x0 + (row % 2) * 4; x <= x1 - TW; x += 7)
        if (rnd() < 0.85) tryTree(x + Math.floor(rnd() * 2), y);
  }
  for (let n = 0; n < 90; n++) tryTree(4 + Math.floor(rnd() * 190), 4 + Math.floor(rnd() * 90));
  spots.sort((a, b) => a[1] - b[1]);
  const trees = new Layer(P);
  for (const [x, y] of spots) for (const [k, c] of TREE) { const [a, b] = k.split(',').map(Number); trees.set(x + a + 1, y + b + 1, c); }

  // Little animated details.
  const fireflies = new Layer(P).set(20, 30, C.yellow).set(48, 12, C.yellow).set(130, 8, C.yellow);
  const cloudShade = new Layer(P);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 46; x++) if (((x - 23) / 23) ** 2 + ((y - 7) / 7) ** 2 <= 1 && (x + y) % 2 === 0) cloudShade.set(x, y, C.ink);

  let body = base + g('tw0', sparkA) + g('tw1', sparkB) + mtn + road + shadows + trees + lmSvg + g('tw2', fireflies) + signs + signText;
  body += at(0, 70, g('cs cs1', cloudShade)) + at(0, 230, g('cs cs2', cloudShade));
  let css = BASE_CSS + `.tw2{animation:tw 1.7s steps(1) -.4s infinite}
.lamp{animation:lamp 1.4s steps(1) infinite}@keyframes lamp{50%{opacity:.35}}
.puff{animation:puff 3s infinite;opacity:0}.p1{animation-delay:-1s}.p2{animation-delay:-2s}
@keyframes puff{0%{opacity:0;transform:translate(0,0);animation-timing-function:steps(6,end)}15%{opacity:1}85%{opacity:.6}100%{opacity:0;transform:translate(8px,-28px)}}
.cs{opacity:.16;animation:cs 46s linear infinite}.cs2{animation-duration:63s;animation-delay:-30s}
@keyframes cs{from{transform:translateX(-200px)}to{transform:translateX(${W + 20}px)}}` + ART_CSS;

  if (withWalker) {
    const route = [
      { xy: STOPS.tendril, stop: true }, { xy: STOPS.dblab, stop: true }, { xy: [143, 40] }, { xy: [143, 61] },
      { xy: STOPS.akari, stop: true }, { xy: STOPS.fileflow, stop: true }, { xy: [57, 61] }, { xy: [57, 40] },
      { xy: STOPS.tendril, stop: true },
    ];
    const SPEED = 0.09, PAUSE = 1.5;
    let t = 0;
    const frames = [{ t: 0, xy: route[0].xy, steps: 0 }];
    if (route[0].stop) { t += PAUSE; frames.push({ t, xy: route[0].xy, steps: 0 }); }
    for (let i = 1; i < route.length; i++) {
      const [ax, ay] = route[i - 1].xy, [bx, by] = route[i].xy;
      const dist = Math.abs(bx - ax) + Math.abs(by - ay);
      t += dist * SPEED;
      frames.push({ t, xy: route[i].xy, steps: dist });
      if (route[i].stop && i < route.length - 1) { t += PAUSE; frames.push({ t, xy: route[i].xy, steps: 0 }); }
    }
    const [sx, sy] = route[0].xy;
    let kf = '';
    frames.forEach((f, i) => {
      const next = frames[i + 1];
      const tf = next && next.steps ? `;animation-timing-function:steps(${next.steps},end)` : ';animation-timing-function:steps(1,end)';
      kf += `${pct((f.t / t) * 100)}{transform:translate(${(f.xy[0] - sx) * P}px,${(f.xy[1] - sy) * P}px)${tf}}`;
    });
    css += `.route{animation:route ${t.toFixed(2)}s infinite}@keyframes route{${kf}}`;
    body += at((sx - 4) * P, (sy - 10) * P, g('route', duo(2, -34)));
  }
  css += REDUCED('.puff{display:none}');
  const label = 'World map: an island with Tendril grove, DBLab tower, FileFlow workshop and AKARI shrine, joined by roads.';
  writeSvg(out(withWalker ? 'assets/map.svg' : 'play/map.svg'), W, H, label, css, body);
}

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
  const decoSvg = key === 'tendril' || key === 'fileflow' ? g('drift', decoB) + deco : g('tw0', deco) + g('tw1', decoB);
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
  const mascot = charLayer('boy', 'A', 3, 300, GROUND * P - 60, { asleep: true }).toString() + charLayer('girl', 'A', 3, 344, GROUND * P - 60, { asleep: true });
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
  for (const key of Object.keys(LANDMARKS)) {
    const d = drawLandmark(key, 6, 6, 6);
    writeSvg(out(`play/lm-${key}.svg`), d.w + 12, d.h + 12, LANDMARKS[key].label, BASE_CSS + ART_CSS, d.svg);
  }
  for (const kind of ['boy', 'girl']) for (const f of ['A', 'B'])
    writeSvg(out(`play/${kind}-${f.toLowerCase()}.svg`), 32, 40, kind, '', charLayer(kind, f, 2, 0, 0).toString());
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
button('btn-play.svg', 'WALK AROUND THE MAP', 480);
button('btn-instagram.svg', 'INSTAGRAM @ir.prat_', 390);
button('btn-linkedin.svg', 'LINKEDIN', 390);
footer();
gameSprites();
