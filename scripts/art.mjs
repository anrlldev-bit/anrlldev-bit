// Characters and landmark illustrations. Landmarks are drawn from shapes (circles, gables,
// columns) with light from the top left, then outlined, so they read cleanly at any scale.
import { C, Layer, rng } from './pixel.mjs';

const INK = '#1b1a2e';

// ---------- characters: 16 x 20, front view, two walk frames ----------
const BOY_TOP = [
  '.....oooooo.....',
  '...oohhhhhhoo...',
  '..ohhHHhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhsssssshho..',
  '..ohssssssssho..',
  '..ossessssesso..',
  '..ossessssesso..',
  '..oscssmmsscso..',
  '...oSssssssSo...',
  '....oTttttTo....',
  '...oTttttttTo...',
  '..otTttttttTto..',
  '..osTttttttTso..',
  '...oppppppppo...',
  '...opppPPpppo...',
];
const GIRL_TOP = [
  '.....oooooo.....',
  '...oohhhhhhoo...',
  '..ohhHHhhhhhho..',
  '..ohhhhhhhkkho..',
  '..ohhsssssshho..',
  '..ohssssssssho..',
  '..ohsessssesho..',
  '..ohsessssesho..',
  '..ohcssmmsscho..',
  '..ohSssssssSho..',
  '..ohhoDddDohho..',
  '..ohoDddddDoho..',
  '..odDddddddDdo..',
  '..osDddddddDso..',
  '..oDddddddddDo..',
  '.oDddddddddddDo.',
];
export const CHARS = {
  boy: {
    A: [...BOY_TOP, '...oppo..oppo...', '...oppo..oppo...', '..obbbo..obbbo..', '..ooooo..ooooo..'],
    B: [...BOY_TOP, '...oppo..oppo...', '..obbbo..oppo...', '..ooooo..obbbo..', '.........ooooo..'],
    pal: { o: INK, h: '#3a2618', H: '#6b4630', s: '#ffd1b0', S: '#e9a682', e: INK, c: '#ff9a9a', m: '#c0504f', t: '#2f7de1', T: '#1f4fa0', p: '#2b2f4a', P: '#1b1e33', b: '#6b3d2a' },
  },
  girl: {
    A: [...GIRL_TOP, '....oso..oso....', '....oso..oso....', '...obbo..obbo...', '...oooo..oooo...'],
    B: [...GIRL_TOP, '....oso..oso....', '...obbo..oso....', '...oooo..obbo...', '.........oooo...'],
    pal: { o: INK, h: '#5a2e1c', H: '#8a4d2f', k: '#ff77a8', s: '#ffd1b0', S: '#e9a682', e: INK, c: '#ff9a9a', m: '#c0504f', d: '#ff77a8', D: '#c94a85', b: '#6b3d2a' },
  },
};
for (const [name, c] of Object.entries(CHARS)) for (const f of ['A', 'B']) c[f].forEach((r, i) => { if (r.length !== 16) throw new Error(`${name} ${f} row ${i} is ${r.length} wide`); });

// Orange-and-white cat, 10 x 9, two walk frames.
const CAT_TOP = ['.oo....oo.', '.orooooro.', '.orrrrrro.', '.oerwwreo.', '.owwppwwo.', '..owwwwo..', '.orrwwrro.', '.orrwwrrRo'];
export const CAT = {
  A: [...CAT_TOP, '.oo....oo.'],
  B: [...CAT_TOP, '..oo..oo..'],
  pal: { o: INK, r: '#ff9a3c', R: '#d9741f', w: '#fff6ea', p: '#ff8fa3', e: INK },
};
export function catLayer(frame, px, ox, oy, { asleep = false } = {}) {
  const L = new Layer(px, ox, oy).sprite(CAT[frame], 0, 0, CAT.pal);
  if (asleep) L.set(2, 3, CAT.pal.r).set(7, 3, CAT.pal.r).set(2, 4, INK).set(7, 4, INK);
  return L;
}

export function charLayer(kind, frame, px, ox, oy, { asleep = false } = {}) {
  const c = CHARS[kind];
  const L = new Layer(px, ox, oy).sprite(c[frame], 0, 0, c.pal);
  if (asleep) for (const x of [5, 10]) L.set(x, 6, c.pal.s).set(x, 7, INK).set(x - 1, 7, INK).set(x + 1, 7, c.pal.s);
  return L;
}
// Closed eyes, drawn on top of a frame for blinking.
export function blinkLayer(kind, px, ox, oy) {
  const s = CHARS[kind].pal.s;
  return new Layer(px, ox, oy).set(5, 6, s).set(10, 6, s).set(5, 7, INK).set(10, 7, INK);
}

// ---------- landmarks ----------
function outline(cells, color = INK) {
  const add = [];
  for (const k of cells.keys()) {
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cells.has(`${x + dx},${y + dy}`)) add.push(`${x + dx},${y + dy}`);
  }
  for (const k of add) cells.set(k, color);
}

function canvas() {
  const m = new Map();
  const set = (x, y, c) => { if (c) m.set(`${x},${y}`, c); };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  return { m, set, rect };
}

const G = { hi: '#7be35a', mid: C.green, base: C.moss, dark: '#065a3a' };

// Round canopy lit from the top left with a little leaf texture.
function canopy(set, cx, cy, rx, ry, seed) {
  const rnd = rng(seed);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const light = -nx * 0.6 - ny * 0.8;
    let c = light > 0.45 ? G.mid : light > -0.35 ? G.base : G.dark;
    if (light > 0.75 && d > 0.15) c = G.hi;
    if (rnd() < 0.12) c = c === G.base ? G.mid : c === G.mid ? G.base : c;
    set(x, y, c);
  }
}

export function treeCells(seed = 1) {
  const { m, set, rect } = canvas();
  rect(3, 7, 2, 3, C.brown); set(4, 9, C.dirt);
  canopy(set, 3.5, 4, 3.6, 3.6, seed);
  outline(m, '#063a26');
  return m;
}

const BUILDERS = {
  // A broad tree with curling tendrils and a few flowers.
  tendril() {
    const { m, set, rect } = canvas();
    rect(9, 14, 3, 7, C.brown); rect(11, 14, 1, 7, C.dirt); rect(7, 20, 7, 1, C.brown); set(8, 19, C.brown); set(12, 19, C.dirt);
    canopy(set, 10, 8, 9.5, 7.2, 4);
    const vine = '#b6f23a';
    for (const [x, y] of [[3, 13], [3, 14], [2, 15], [2, 16], [3, 17], [4, 17], [4, 16], [17, 13], [17, 14], [18, 15], [18, 16], [17, 17], [16, 17], [16, 16], [10, 0], [10, -1], [11, -2], [12, -2], [12, -1]]) set(x, y, vine);
    outline(m);
    return {
      m, anims: [
        { cls: 'tw0', cells: [[5, 5, C.pink], [14, 9, C.pink], [8, 11, C.cream]] },
        { cls: 'tw1', cells: [[12, 3, C.cream], [4, 9, C.pink], [16, 6, C.cream]] },
      ],
    };
  },
  // A small columned library with a database emblem in the pediment.
  dblab() {
    const { m, set, rect } = canvas();
    const wall = '#efe2c6', wallShade = '#cdb994', roof = '#3d4f9c', roofHi = '#5d73c9';
    for (let y = 0; y < 6; y++) for (let x = 9 - y * 2; x <= 10 + y * 2; x++) set(x, y + 1, y === 5 ? roofHi : x <= 9 ? roofHi : roof);
    rect(0, 7, 20, 1, wallShade); rect(1, 8, 18, 9, wall);
    for (const cx of [2, 6, 13, 17]) { rect(cx, 8, 1, 9, C.cream); set(cx + 1, 8, wallShade); rect(cx + 1, 9, 1, 8, wallShade); }
    rect(8, 11, 4, 6, '#5a3a2a'); rect(8, 11, 4, 1, '#3a2618'); set(11, 14, C.yellow);
    rect(0, 17, 20, 1, C.silver); rect(-1, 18, 22, 1, C.stone);
    rect(9, 3, 2, 3, C.yellow); set(9, 4, C.orange); set(10, 4, C.orange);
    outline(m);
    return { m, anims: [{ cls: 'blink', cells: [[9, 9, C.yellow], [10, 9, C.yellow]] }] };
  },
  // A workshop with a tiled gable roof, chimney and lit windows.
  fileflow() {
    const { m, set, rect } = canvas();
    const roofA = '#c2533a', roofB = '#9b3b2a', wall = '#f3d9b1', wallShade = '#d9b688';
    rect(14, 0, 3, 5, C.stone); rect(14, 0, 3, 1, C.silver);
    for (let y = 0; y < 7; y++) for (let x = 9 - y - 3; x <= 10 + y + 3; x++) set(x, y + 2, (x + y) % 3 === 0 ? roofB : roofA);
    rect(0, 9, 20, 1, roofB);
    rect(2, 10, 16, 9, wall); rect(15, 10, 3, 9, wallShade);
    rect(8, 13, 4, 6, '#6b3d2a'); rect(8, 13, 4, 1, '#3a2618'); set(10, 16, C.yellow);
    for (const wx of [3, 13]) { rect(wx, 12, 3, 3, C.yellow); set(wx + 1, 12, C.orange); set(wx + 1, 13, '#3a2618'); set(wx, 13, '#3a2618'); set(wx + 2, 13, '#3a2618'); set(wx + 1, 14, C.orange); }
    rect(1, 19, 18, 1, C.stone);
    outline(m);
    return { m, anims: [], chimney: [15, -1] };
  },
  // A torii gate with two paper lanterns hanging from the lower beam.
  akari() {
    const { m, set, rect } = canvas();
    const red = '#e83b3b', redShade = '#a9262e';
    rect(0, 1, 20, 2, INK); set(-1, 0, INK); set(20, 0, INK);
    rect(1, 3, 18, 2, red); rect(1, 4, 18, 1, redShade);
    rect(9, 5, 2, 2, INK);
    rect(2, 7, 16, 2, red); rect(2, 8, 16, 1, redShade);
    for (const px of [4, 14]) { rect(px, 5, 2, 13, red); rect(px + 1, 5, 1, 13, redShade); rect(px - 1, 18, 4, 2, C.stone); rect(px - 1, 18, 4, 1, C.silver); }
    for (const lx of [7, 12]) { set(lx, 9, INK); rect(lx - 1, 10, 2, 3, red); set(lx - 1, 10, INK); set(lx, 13, C.yellow); }
    outline(m);
    return { m, anims: [{ cls: 'lamp', cells: [[6, 11, C.yellow], [7, 11, C.orange], [11, 11, C.yellow], [12, 11, C.orange]] }] };
  },
};

// Kompas Program Studi: a signpost whose boards use the app's criterion colours, compass on top.
BUILDERS.kompas = () => {
  const { m, set, rect } = canvas();
  rect(9, 5, 2, 15, C.brown); rect(10, 5, 1, 15, C.dirt);
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) set(10 + x, 1 + y, x * x + y * y > 6 ? C.silver : C.cream);
  set(10, -1, C.red); set(10, 0, C.red); set(10, 2, C.stone); set(10, 3, C.stone); set(10, 1, INK);
  const board = (x0, x1, y, color, shade, dir) => {
    rect(x0, y, x1 - x0 + 1, 3, color); rect(x0, y + 2, x1 - x0 + 1, 1, shade);
    const tip = dir > 0 ? x1 + 1 : x0 - 1;
    set(tip, y, color); set(tip, y + 1, color); set(tip, y + 2, shade); set(tip + dir, y + 1, color);
  };
  board(11, 17, 6, C.yellow, C.orange, 1);
  board(2, 8, 10, C.blue, '#1f6fbf', -1);
  board(11, 16, 14, C.pink, '#c94a85', 1);
  rect(6, 19, 8, 2, C.stone); rect(6, 19, 8, 1, C.silver);
  outline(m);
  return { m, anims: [{ cls: 'tw0', cells: [[10, -1, C.orange]] }] };
};

// Ivory: an ivory tower with a battlement, lit arched windows and a pennant.
BUILDERS.ivory = () => {
  const { m, set, rect } = canvas();
  const wall = '#fff6e6', shade = '#e2d4bd', dark = '#c9b79a', roof = C.plum, roofHi = '#a8336f';
  set(10, -4, INK); set(10, -3, INK); set(11, -4, C.yellow); set(12, -4, C.yellow); set(11, -3, C.orange);
  for (let y = 0; y < 6; y++) for (let x = 10 - y - 1; x <= 10 + y; x++) set(x, y - 2, x < 10 ? roofHi : roof);
  for (let x = 3; x <= 16; x++) set(x, 4, x % 2 ? wall : shade);
  rect(3, 5, 14, 1, dark);
  rect(4, 6, 12, 14, wall); rect(12, 6, 3, 14, shade); rect(15, 6, 1, 14, dark); rect(4, 6, 1, 14, shade);
  for (const [wx, wy] of [[9, 8], [6, 12], [12, 12]]) { rect(wx, wy, 2, 3, C.yellow); set(wx, wy, '#3a2618'); set(wx + 1, wy, '#3a2618'); }
  rect(9, 16, 2, 4, '#6b3d2a'); set(9, 16, '#3a2618'); set(10, 16, '#3a2618');
  rect(2, 20, 16, 1, C.stone);
  outline(m);
  return { m, anims: [{ cls: 'blink', cells: [[9, 9, C.orange], [10, 9, C.orange]] }] };
};

export function landmark(key) {
  const art = BUILDERS[key]();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of art.m.keys()) {
    const [x, y] = k.split(',').map(Number);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { ...art, minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Draw a landmark so its bounding box starts at (ox, oy) in pixels.
export function drawLandmark(key, px, ox, oy) {
  const lm = landmark(key);
  const L = new Layer(px, ox - lm.minX * px, oy - lm.minY * px);
  for (const [k, c] of lm.m) { const [x, y] = k.split(',').map(Number); L.set(x, y, c); }
  let anims = '';
  for (const a of lm.anims) {
    const A = new Layer(px, ox - lm.minX * px, oy - lm.minY * px);
    for (const [x, y, c] of a.cells) A.set(x, y, c);
    anims += `<g class="${a.cls}">${A}</g>`;
  }
  if (lm.chimney) {
    for (let k = 0; k < 3; k++) {
      const A = new Layer(px, ox - lm.minX * px, oy - lm.minY * px).rect(lm.chimney[0], lm.chimney[1], 2, 1, C.silver);
      anims += `<g class="puff p${k}">${A}</g>`;
    }
  }
  return { svg: L.toString() + anims, w: lm.w * px, h: lm.h * px, lm };
}

export const ART_CSS = `.lamp{animation:lamp 1.4s steps(1) infinite}@keyframes lamp{50%{opacity:.35}}
.puff{animation:puff 3s infinite;opacity:0}.p1{animation-delay:-1s}.p2{animation-delay:-2s}
@keyframes puff{0%{opacity:0;transform:translate(0,0);animation-timing-function:steps(6,end)}15%{opacity:1}100%{opacity:0;transform:translate(8px,-26px)}}`;
