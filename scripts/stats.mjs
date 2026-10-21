// Fetches public GitHub numbers and draws assets/generated/stats.svg.
// Run: node scripts/stats.mjs [user]
// PROFILE_TOKEN (or GITHUB_TOKEN) is optional; without one the contribution count is public-only.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, Layer, textWidth, writeSvg, frame, panel, outlinedText } from './pixel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const USER = process.argv[2] || process.env.GITHUB_REPOSITORY_OWNER || 'anrlldev-bit';
// PROFILE_TOKEN is a personal token with read:user, so private contributions are counted too.
const TOKEN = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
const headers = {
  'User-Agent': `${USER}-profile-stats`,
  Accept: 'application/vnd.github+json',
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
};

async function api(path, init) {
  const res = await fetch(`https://api.github.com${path}`, { headers, ...init });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

async function collect() {
  const user = await api(`/users/${USER}`);
  // The profile repo itself is skipped so its generator scripts don't count as "languages".
  const repos = (await api(`/users/${USER}/repos?per_page=100&type=owner`))
    .filter(r => !r.fork && r.name.toLowerCase() !== USER.toLowerCase());
  const bytes = {};
  for (const r of repos) {
    for (const [lang, n] of Object.entries(await api(`/repos/${USER}/${r.name}/languages`))) bytes[lang] = (bytes[lang] || 0) + n;
  }
  let contributions = null;
  if (TOKEN) {
    try {
      const q = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions}}}}`;
      const res = await api('/graphql', { method: 'POST', body: JSON.stringify({ query: q, variables: { login: USER } }) });
      contributions = res.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ?? null;
    } catch (err) {
      console.warn(`contributions skipped: ${err.message}`);
    }
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  const languages = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, n]) => ({ name, pct: Math.max(1, Math.round((n / total) * 100)) }));
  return {
    repos: repos.length,
    followers: user.followers,
    stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
    contributions,
    languages,
  };
}

function draw(d) {
  const P = 4, TP = 2, CW = 200, W = CW * P;
  const langH = d.languages.length ? d.languages.length * 30 : 54;
  const CH = Math.ceil((270 + langH + 84) / P);
  const L = new Layer(P), T = [];
  const text = (str, x, y, color) => T.push(new Layer(TP, x, y).text(str, 0, 0, { color }));
  panel(L, CW, CH);

  const cells = [[d.repos, 'public repos'], [d.followers, 'followers'], [d.stars, 'stars'], [d.contributions ?? '--', 'contributions']];
  cells.forEach(([value, label], i) => {
    const x = i % 2 ? 102 : 8, y = i < 2 ? 8 : 32;
    frame(L, 90, 22, C.haze, C.navy, C.navy, x, y);
    text(label, x * P + 18, y * P + 16, C.lavender);
    const V = new Layer(TP);
    outlinedText(V, String(value), Math.round((x * P + 18) / TP), Math.round((y * P + 40) / TP), { scale: 2, fill: cy => (cy < 7 ? C.yellow : C.orange), outline: C.ink, shadow: C.plum });
    T.push(V);
  });

  let y = 236;
  text('top languages', 40, y, C.yellow);
  y += 34;
  if (!d.languages.length) {
    text('No public repos yet. Languages show up here', 40, y, C.silver);
    text('once one goes public.', 40, y + 26, C.silver);
    y += 54;
  } else {
    for (const { name, pct } of d.languages) {
      text(name, 40, y, C.cream);
      const by = Math.round(y / P);
      frame(L, 104, 6, C.ink, C.navy, C.navy, 64, by);
      const filled = Math.round((pct / 100) * 102);
      for (let i = 0; i < filled; i++) for (let r = 1; r < 5; r++) L.set(65 + i, by + r, r === 1 ? C.cream : r < 3 ? C.green : C.moss);
      const label = `${pct}%`;
      text(label, W - 40 - textWidth(label) * TP, y, C.cream);
      y += 30;
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  text(d.contributions == null ? 'Contributions are filled in by the daily workflow.' : 'Contributions cover the past year.', 40, y + 12, C.silver);
  text(`Updated ${today}`, 40, y + 38, C.silver);
  L.toString = (orig => () => orig() + T.join(''))(L.toString.bind(L));

  const summary = `${d.repos} public repos, ${d.followers} followers, ${d.stars} stars` +
    (d.contributions == null ? '' : `, ${d.contributions} contributions in the past year`) +
    (d.languages.length ? `. Top languages: ${d.languages.map(l => `${l.name} ${l.pct}%`).join(', ')}.` : '. No public languages yet.');
  writeSvg(join(ROOT, 'assets/generated/stats.svg'), CW * P, CH * P, summary, '', L.toString());
}

try {
  draw(await collect());
} catch (err) {
  // Keep the previous stats.svg rather than drawing wrong numbers.
  console.error(`stats not updated: ${err.message}`);
  process.exit(1);
}
