// Montana PSC average residential electric bills (add-tariff-conformance-suite 1.2 and 1.3): the "Average Bill -
// Electric, Assume 30 days/750 kwh" table of the Commission's monthly Gas and Electric Rate Summary, one bill per
// utility per month at the rates filed as of the month's first day. Read twice by independent methods, from the
// layout text line by line and from each word's position under the month headers; a figure the two disagree on
// is excluded and counted, never guessed.

export const KWH = 750;
const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const monthOf = (label) => { const m = /^([A-Z][a-z]{2})-(\d\d)$/.exec(label); return m ? `20${m[2]}-${MONTHS[m[1]]}` : null; };
const AMOUNT = /^\$?\d[\d,]*\.\d\d$/;
const money = (s) => Number(s.replace(/[$,]/g, ''));
export const UTILITIES = { NWE: 'NorthWestern Energy', MDU: 'Montana-Dakota Utilities' };

/**
 * Method A: the layout text. After the electric heading, the last line of month labels gives the order; each
 * utility's line is its code and one amount per month.
 * @param {string} text pdftotext -layout output
 * @returns {Array<{page: number, utility: string, month: string, bill: number}>}
 */
export function readByLines(text) {
  const at = text.indexOf('Averge Bill - Electric');
  if (at < 0) return [];
  const page = text.slice(0, at).split('\f').length;
  const lines = text.slice(at).split('\f')[0].split('\n');
  const monthLines = lines.filter((l) => (l.match(/[A-Z][a-z]{2}-\d\d/g) ?? []).length >= 12);
  const months = (monthLines.at(-1)?.match(/[A-Z][a-z]{2}-\d\d/g) ?? []).map(monthOf);
  const out = [];
  for (const l of lines) {
    const m = /^\s*(NWE|MDU)\s+(.*)$/.exec(l);
    if (!m) continue;
    const amounts = m[2].trim().split(/\s+/);
    if (amounts.length !== months.length || !amounts.every((a) => AMOUNT.test(a))) continue;
    amounts.forEach((a, i) => out.push({ page, utility: UTILITIES[m[1]], month: months[i], bill: money(a) }));
  }
  return out;
}

/**
 * Method B: word positions. On the page with the electric heading, below it, the month-label row nearest above
 * the utility rows gives the column centers; each amount on a utility's row goes to the nearest center.
 * @param {string} bbox pdftotext -bbox output
 */
export function readByPositions(bbox) {
  const out = [];
  for (const pg of bbox.split('<page').slice(1)) {
    const words = [...pg.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((w) => ({ x: (+w[1] + +w[3]) / 2, y: +w[2], t: w[5] }));
    const heading = words.find((w, i) => w.t === 'Averge' && words[i + 1]?.t === 'Bill' && words[i + 3]?.t === 'Electric');
    if (!heading) continue;
    const below = words.filter((w) => w.y > heading.y);
    const rowsOf = (pred) => [...Map.groupBy(below.filter(pred), (w) => Math.round(w.y)).values()];
    const labels = rowsOf((w) => monthOf(w.t)).filter((r) => r.length >= 12);
    for (const code of Object.keys(UTILITIES)) {
      const name = below.find((w) => w.t === code);
      if (!name) continue;
      const header = labels.filter((r) => r[0].y < name.y).at(-1);
      if (!header) continue;
      const cols = header.sort((a, b) => a.x - b.x).map((w) => ({ x: w.x, month: monthOf(w.t) }));
      const row = below.filter((w) => Math.abs(w.y - name.y) < 3 && AMOUNT.test(w.t));
      for (const w of row) {
        const c = cols.reduce((best, k) => (Math.abs(k.x - w.x) < Math.abs(best.x - w.x) ? k : best), cols[0]);
        out.push({ utility: UTILITIES[code], month: c.month, bill: money(w.t) });
      }
    }
  }
  return out;
}

/** Both readings compared figure by figure; agreed figures become rows, the rest are excluded and counted. */
export function reconcile(a, b) {
  const key = (r) => `${r.utility}|${r.month}`;
  const bMap = new Map(b.map((r) => [key(r), r]));
  const rows = []; const excluded = [];
  for (const r of a) {
    const other = bMap.get(key(r));
    if (!other || Math.round(other.bill * 100) !== Math.round(r.bill * 100)) { excluded.push({ ...r, kwh: KWH, lines: r.bill, positions: other?.bill ?? null, why: other ? 'the two methods disagree' : 'not read by word positions' }); continue; }
    rows.push({ page: r.page, utility: r.utility, schedule: 'Residential', month: r.month, kwh: KWH, bill: r.bill });
  }
  const total = rows.length + excluded.length;
  return { rows, excluded, extraction: { methods: ['layout text, line by line', 'word positions under the month headers'], figures: total, agreed: rows.length, disagreed: excluded.length, disagreementRate: total ? excluded.length / total : 0 } };
}
