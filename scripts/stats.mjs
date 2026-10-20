// Fetches public GitHub numbers and draws assets/generated/stats.svg.
// Run: node scripts/stats.mjs [user]
// GITHUB_TOKEN is optional; without it the contribution count is left empty.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, Layer, textWidth, writeSvg, frame, panel, outlinedText, ICON } from './pixel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const USER = process.argv[2] || process.env.GITHUB_REPOSITORY_OWNER || 'anrlldev-bit';
const TOKEN = process.env.GITHUB_TOKEN;
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
  const P = 4, CW = 200;
  const langRows = d.languages.length ? d.languages.length * 10 : 30;
  const CH = 88 + langRows + 30;
  const L = new Layer(P);
  panel(L, CW, CH);

  const cells = [
    ['chest', d.repos, 'public repos'], ['heart', d.followers, 'followers'],
    ['star', d.stars, 'stars'], ['leaf', d.contributions ?? '--', 'contributions'],
  ];
  cells.forEach(([icon, value, label], i) => {
    const x = i % 2 ? 102 : 8, y = i < 2 ? 8 : 40;
    frame(L, 90, 30, C.haze, C.navy, C.navy, x, y);
    L.sprite(ICON[icon].rows, x + 4, y + 3, ICON[icon].pal);
    L.text(label, x + 15, y + 4, { color: C.cream });
    outlinedText(L, String(value), x + 15, y + 12, { scale: 2, fill: cy => (cy < 7 ? C.yellow : C.orange), outline: C.ink, shadow: C.plum });
  });

  L.sprite(ICON.leaf.rows, 10, 76, ICON.leaf.pal);
  L.text('top languages', 21, 76, { color: C.yellow });
  let y = 88;
  if (!d.languages.length) {
    L.sprite(ICON.chest.rows, 10, y + 2, ICON.chest.pal, 3);
    ['No public repos yet.', 'Languages show up here', 'once one goes public.'].forEach((line, k) => L.text(line, 40, y + k * 10, { color: C.silver }));
    y += 30;
  } else {
    for (const { name, pct } of d.languages) {
      L.text(name, 10, y, { color: C.cream });
      frame(L, 106, 7, C.ink, C.navy, C.navy, 66, y);
      const filled = Math.round((pct / 100) * 104);
      for (let i = 0; i < filled; i++) for (let r = 1; r < 6; r++) L.set(67 + i, y + r, r === 1 ? C.cream : r < 4 ? C.green : C.moss);
      const label = `${pct}%`;
      L.text(label, 191 - textWidth(label), y, { color: C.cream });
      y += 10;
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  L.text(d.contributions == null ? 'Contributions: set by the workflow.' : 'Contributions cover the past year.', 10, y + 4, { color: C.silver });
  L.text(`Updated ${today}`, 10, y + 14, { color: C.silver });

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
