// Suggest close matches on the 404 page, computed on this device from the
// command index. The requested path is read here and never sent anywhere.

const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);

/** Edit distance, for near-miss words such as "conver" for "convert". */
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Score each index entry against the words of the requested path; best first. */
export function suggest(path, index, limit = 5) {
  const want = words(decodeURIComponent(path));
  return index.map((e) => {
    const have = [...words(e.title), ...words(e.url), ...(e.words ?? [])];
    let score = 0;
    for (const w of want) {
      const best = Math.min(...have.map((h) => (h === w ? 0 : h.startsWith(w) || w.startsWith(h) ? 0.5 : distance(w, h) / Math.max(w.length, h.length))));
      if (best < 0.34) score += 1 - best;
    }
    return { ...e, score };
  }).filter((e) => e.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

const list = globalThis.document?.querySelector('[data-suggestions]');
if (list) {
  const index = await (await fetch('/command-index.json')).json();
  const found = suggest(location.pathname, index);
  for (const e of found) {
    const li = document.createElement('li');
    li.append(Object.assign(document.createElement('a'), { href: e.url, textContent: e.title }));
    list.append(li);
  }
  document.querySelector('[data-suggest]').hidden = found.length === 0;
  document.documentElement.dataset.ready = 'true';
}
