// Shared pixel-art toolkit: palette, bitmap font, cell canvas, sprites.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Palette: the PICO-8 16-colour set plus four night-sky shades.
// One fixed palette for every asset is what keeps the pixel art consistent.
export const C = {
  ink: '#0b0a1a', night: '#13112e', dusk: '#1c1847', haze: '#2a2163', violet: '#5b3fa8',
  moss: '#008751', green: '#00e436',
  cream: '#fff1e8', yellow: '#ffec27',
  // details
  orange: '#ffa300', red: '#ff004d', blue: '#29adff', navy: '#1d2b53',
  silver: '#c2c3c7', brown: '#ab5236', dirt: '#742f29', peach: '#ffccaa', pink: '#ff77a8',
  plum: '#7e2553', lavender: '#83769c', stone: '#5f574f', forest: '#065a3a', black: '#000000',
};

const RAW = {
  A: '.###. #...# #...# ##### #...# #...# #...#', B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.', D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####', F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####', H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.', J: '..### ...#. ...#. ...#. #..#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#', L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#', N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.', P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#', R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.', T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.', V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.', X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..', Z: '##### ....# ...#. ..#.. .#... #.... #####',
  a: '..... ..... .###. ....# .#### #...# .####', b: '#.... #.... ####. #...# #...# #...# ####.',
  c: '..... ..... .###. #.... #.... #...# .###.', d: '....# ....# .#### #...# #...# #...# .####',
  e: '..... ..... .###. #...# ##### #.... .###.', f: '..## .#.. #### .#.. .#.. .#.. .#..',
  g: '..... ..... .#### #...# #...# .#### ....# .###.', h: '#.... #.... ####. #...# #...# #...# #...#',
  i: '# . # # # # #', j: '..# ... ..# ..# ..# ..# #.# .#.',
  k: '#... #... #..# #.#. ##.. #.#. #..#', l: '#. #. #. #. #. #. .#',
  m: '..... ..... ##.#. #.#.# #.#.# #.#.# #...#', n: '..... ..... ####. #...# #...# #...# #...#',
  o: '..... ..... .###. #...# #...# #...# .###.', p: '..... ..... ####. #...# #...# ####. #.... #....',
  q: '..... ..... .#### #...# #...# .#### ....# ....#', r: '..... ..... #.##. ##..# #.... #.... #....',
  s: '..... ..... .#### #.... .###. ....# ####.', t: '.#.. .#.. #### .#.. .#.. .#.. ..##',
  u: '..... ..... #...# #...# #...# #..## .##.#', v: '..... ..... #...# #...# #...# .#.#. ..#..',
  w: '..... ..... #...# #...# #.#.# #.#.# .#.#.', x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  y: '..... ..... #...# #...# #...# .#### ....# .###.', z: '..... ..... ##### ...#. ..#.. .#... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.', 1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####', 3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.', 5: '##### #.... ####. ....# ....# #...# .###.',
  6: '..##. .#... #.... ####. #...# #...# .###.', 7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.', 9: '.###. #...# #...# .#### ....# ...#. .##..',
  ' ': '... ... ... ... ... ... ...', '.': '.. .. .. .. .. ## ##', ',': '.. .. .. .. ## .# #.',
  '!': '# # # # # . #', ':': '. # # . # # .', "'": '# # . . . . .',
  '-': '.... .... .... #### .... .... ....', '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..', '(': '.# #. #. #. #. #. .#', ')': '#. .# .# .# .# .# #.',
  '▶': '#... ##.. ###. #### ###. ##.. #...', '#': '.#.#. ##### .#.#. .#.#. ##### .#.#. .....', '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....', '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
};
const FONT = Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, v.split(' ')]));

const glyph = ch => FONT[ch] || FONT['?'];
const advance = (ch, mono) => (mono ? 6 : glyph(ch)[0].length + 1);
export const textWidth = (str, { scale = 1, mono = false } = {}) =>
  ([...str].reduce((w, ch) => w + advance(ch, mono), 0) - 1) * scale;

export class Layer {
  constructor(px = 1, ox = 0, oy = 0) { this.px = px; this.ox = ox; this.oy = oy; this.m = new Map(); }
  set(x, y, c) { if (c) this.m.set(`${x},${y}`, c); return this; }
  get(x, y) { return this.m.get(`${x},${y}`); }
  has(x, y) { return this.m.has(`${x},${y}`); }
  // Repeat every cell one period to the right, for seamless scrolling strips.
  tileX(period) { for (const [k, c] of [...this.m]) { const [x, y] = k.split(',').map(Number); this.set(x + period, y, c); } return this; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  sprite(rows, x, y, pal, scale = 1) {
    rows.forEach((row, r) => [...row].forEach((ch, col) => {
      const c = pal[ch];
      if (c) this.rect(x + col * scale, y + r * scale, scale, scale, c);
    }));
    return this;
  }
  text(str, x, y, { color = C.cream, scale = 1, mono = false } = {}) {
    let cx = 0;
    for (const ch of str) {
      const g = glyph(ch);
      const off = mono ? Math.floor((5 - g[0].length) / 2) : 0;
      g.forEach((row, r) => [...row].forEach((bit, col) => {
        if (bit === '#') this.rect(x + (cx + off + col) * scale, y + r * scale, scale, scale, color);
      }));
      cx += advance(ch, mono);
    }
    return this;
  }
  toString() {
    const byColor = new Map();
    for (const [key, c] of this.m) {
      const [x, y] = key.split(',').map(Number);
      if (!byColor.has(c)) byColor.set(c, new Map());
      const rows = byColor.get(c);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(x);
    }
    const { px, ox, oy } = this;
    let out = '';
    for (const [c, rows] of byColor) {
      let d = '';
      for (const [y, xs] of rows) {
        xs.sort((a, b) => a - b);
        for (let i = 0; i < xs.length;) {
          let j = i;
          while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
          const w = (j - i + 1) * px;
          d += `M${ox + xs[i] * px} ${oy + y * px}h${w}v${px}h-${w}z`;
          i = j + 1;
        }
      }
      out += `<path fill="${c}" d="${d}"/>`;
    }
    return out;
  }
}

export const g = (cls, body, extra = '') => `<g${cls ? ` class="${cls}"` : ''}${extra}>${body}</g>`;
export const at = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;
export const pct = v => `${+v.toFixed(3)}%`;
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export const BASE_CSS = `
.blink{animation:blink 1.2s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.tw0{animation:tw 2.6s steps(1) infinite}
.tw1{animation:tw 3.4s steps(1) -1.1s infinite}
@keyframes tw{50%{opacity:.25}}
.fa{animation:fa .5s steps(1) infinite}
.fb{animation:fa .5s steps(1) -.25s infinite}
@keyframes fa{50%{opacity:0}}
`;
export const REDUCED = extra => `@media (prefers-reduced-motion:reduce){*{animation:none!important}.fb{opacity:0}${extra}}`;

export function writeSvg(path, w, h, label, css, body) {
  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${css ? `<style>${css.replace(/\s*\n\s*/g, '')}</style>` : ''}${body}</svg>`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
  console.log(`${path.split(/[\\/]/).slice(-2).join('/').padEnd(28)} ${(out.length / 1024).toFixed(1)} KB`);
}

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rounded pixel frame: outer ring, inner ring, fill.
export function frame(L, cw, ch, outer, inner, fill, x0 = 0, y0 = 0) {
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const ex = Math.min(x, cw - 1 - x), ey = Math.min(y, ch - 1 - y);
    if (ex === 0 && ey === 0) continue;
    if (ex === 1 && ey === 1) { L.set(x0 + x, y0 + y, outer); continue; }
    const ring = Math.min(ex, ey);
    L.set(x0 + x, y0 + y, ring === 0 ? outer : ring === 1 ? inner : fill);
  }
}

// The mascot: a seed with a sprout. Symmetric, so it never needs flipping.
const SEED_TOP = ['.gg....gg.', 'gggg..gggg', '.ggg..ggg.', '....mm....', '..kkkkkk..', '.kcccccck.'];
export const MASCOT_A = [...SEED_TOP, 'kcckcckcck', 'kcpccccpck', '.kcccccck.', '..kkkkkk..', '..k....k..', '.kk....kk.'];
export const MASCOT_B = [...SEED_TOP, 'kcckcckcck', 'kcpccccpck', '.kcccccck.', '..kkkkkk..', '...k..k...', '..kk..kk..'];
export const MASCOT_SLEEP = [...SEED_TOP, 'kckkcckkck', 'kcpccccpck', '.kcccccck.', '..kkkkkk..', '.kkk..kkk.', '..........'];
export const MASCOT_PAL = { g: C.green, m: C.moss, k: C.ink, c: C.peach, p: C.pink };

// Arcade-style lettering: drop shadow, 1-cell outline, fill coloured per row.
export function outlinedText(L, str, x, y, { scale = 1, fill, outline, shadow }) {
  const T = new Layer(1).text(str, 0, 0, { scale, color: '#000' });
  const cells = [...T.m.keys()].map(k => k.split(',').map(Number));
  const around = new Set();
  for (const [cx, cy] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) around.add(`${cx + dx},${cy + dy}`);
  if (shadow) for (const k of around) { const [cx, cy] = k.split(',').map(Number); L.set(x + cx + 1, y + cy + 1, shadow); }
  for (const k of around) { const [cx, cy] = k.split(',').map(Number); L.set(x + cx, y + cy, outline); }
  for (const [cx, cy] of cells) L.set(x + cx, y + cy, typeof fill === 'function' ? fill(cy) : fill);
  return cells.map(([cx, cy]) => [x + cx, y + cy]);
}

// Small icons shared by stats and section ribbons (8x8).
export const ICON = {
  chest: { rows: ['........', '.kkkkkk.', 'kbbbbbbk', 'kyyyyyyk', 'kbbykbbk', 'kbbbbbbk', 'kbbbbbbk', '.kkkkkk.'], pal: { k: C.ink, b: C.brown, y: C.yellow } },
  heart: { rows: ['........', '.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'], pal: { r: C.red, w: C.cream } },
  star: { rows: ['...y....', '...y....', '..yyy...', 'yyyyyyy.', '.yyyyy..', '..yyy...', '.yy.yy..', '.y...y..'], pal: { y: C.yellow } },
  leaf: { rows: ['.....gg.', '...gggg.', '..gglgg.', '.ggllgg.', '.gglgg..', '.gggg...', '.m......', 'm.......'], pal: { g: C.green, l: C.cream, m: C.moss } },
  pin: { rows: ['..rrrr..', '.rrrrrr.', '.rrwwrr.', '.rrwwrr.', '.rrrrrr.', '..rrrr..', '...rr...', '........'], pal: { r: C.red, w: C.cream } },
  sword: { rows: ['......ww', '.....wsw', '....wsw.', '.y.wsw..', '..ysw...', '..by....', '.b..y...', 'b.......'], pal: { w: C.cream, s: C.silver, y: C.yellow, b: C.brown } },
};

// RPG window: rounded corners, ink / cream / lavender / ink rings, night fill fading to dusk.
export function panel(L, cw, ch, x0 = 0, y0 = 0, { flat = false } = {}) {
  const rings = [C.ink, C.cream, C.lavender, C.ink];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const ex = Math.min(x, cw - 1 - x), ey = Math.min(y, ch - 1 - y);
    if (ex + ey < 2) continue;
    const ring = Math.min(ex, ey);
    let c = ring < rings.length ? rings[ring] : null;
    if (ex + ey === 2 && ring === 0) c = C.ink;
    if (!c) {
      const f = y / ch;
      c = flat || f < 0.55 ? C.night : f < 0.6 ? ((x + y) % 2 ? C.night : C.dusk) : C.dusk;
    }
    L.set(x0 + x, y0 + y, c);
  }
}

