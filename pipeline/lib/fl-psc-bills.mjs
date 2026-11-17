// Florida PSC typical residential bills (add-tariff-conformance-suite 1.2 and 1.3): the "Typical Electric
// Bill Comparisons - Residential Service" tables of the Comparative Rate Statistics report, read twice by two
// independent methods, from the layout text line by line, and from each word's position under the column
// headers. A figure the two disagree on is excluded and counted, never guessed. The report's 1,000 kWh ranking
// table is a third reading of that column.

export const LEVELS = [100, 250, 500, 750, 1000, 1500];
const money = (s) => Number(String(s).replace(/[$,]/g, ''));
const clean = (name) => name.replace(/\*+$/, '').trim();

/**
 * Method A: the layout text, one table row per line: a name, the customer charge, then a bill per level.
 * Tables are told apart by the page label printed after each (A-1 investor-owned, A-2 municipal, A-3 co-op).
 * @param {string} text pdftotext -layout output
 * @returns {Array<{page: string, utility: string, websiteSourced: boolean, customerCharge: number, bills: Record<number, number>}>}
 */
export function readByLines(text) {
  const out = [];
  const pages = text.split('\f');
  for (const pg of pages) {
    if (!/Typical Electric Bill Comparisons\* - Residential Service/.test(pg)) continue;
    const page = /\n\s*(A-[123])\s*\n/.exec(pg)?.[1];
    if (!page) continue;
    for (const line of pg.split('\n')) {
      const m = /^\s*([A-Z][A-Za-z.&,'\- ]+?\**)\s+\$\s?([\d,]+\.\d\d)((?:\s+\$\s?[\d,]+\.\d\d){6})\s*$/.exec(line);
      if (!m) continue;
      const amounts = m[3].trim().split(/\s+(?=\$)/).map(money);
      out.push({ page, utility: clean(m[1]), websiteSourced: /\*\*$/.test(m[1]), customerCharge: money(m[2]), bills: Object.fromEntries(LEVELS.map((k, i) => [k, amounts[i]])) });
    }
  }
  return out;
}

/**
 * Method B: word positions. Each dollar amount on a table page is placed in the column whose header is
 * nearest its center, and rows are the words that share a baseline; the name is the words left of the first
 * amount. Independent of the line layout method A relies on.
 * @param {string} bbox pdftotext -bbox output
 */
export function readByPositions(bbox) {
  const out = [];
  for (const pg of bbox.split('<page').slice(1)) {
    const words = [...pg.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map((w) => ({ x0: +w[1], y0: +w[2], x1: +w[3], y1: +w[4], t: w[5].replace(/&amp;/g, '&').replace(/&#39;/g, '\'') }));
    const joined = words.map((w) => w.t).join(' ');
    if (!/Typical Electric Bill Comparisons\* - Residential Service/.test(joined)) continue;
    const page = words.map((w) => w.t).find((t) => /^A-[123]$/.test(t));
    if (!page) continue;
    // Column centers: the level headers (100 ... 1,500), and the customer charge column left of them.
    // The header row is the line that carries every level label.
    const labelRow = words.filter((w) => w.t === '1,500').map((w) => w.y0).find((y) => LEVELS.every((k) => words.some((w) => w.t === k.toLocaleString('en-US') && Math.abs(w.y0 - y) < 2)));
    const head = labelRow === undefined ? [] : LEVELS.map((k) => words.find((w) => w.t === k.toLocaleString('en-US') && Math.abs(w.y0 - labelRow) < 2));
    if (head.length !== LEVELS.length) continue;
    const centers = head.map((w) => (w.x0 + w.x1) / 2);
    const rows = new Map();
    for (const w of words.filter((x) => x.y0 > head[0].y1)) {
      const key = Math.round(w.y0);
      const near = [...rows.keys()].find((k) => Math.abs(k - key) <= 2) ?? key;
      (rows.get(near) ?? rows.set(near, []).get(near)).push(w);
    }
    for (const ws of rows.values()) {
      ws.sort((a, b) => a.x0 - b.x0);
      const amounts = ws.filter((w) => /^\$?[\d,]+\.\d\d$/.test(w.t) || w.t === '$');
      const firstAmount = ws.findIndex((w) => /^\$?[\d,]+\.\d\d$/.test(w.t) || w.t === '$');
      if (firstAmount < 1) continue;
      const name = ws.slice(0, firstAmount).map((w) => w.t).join(' ');
      const figures = amounts.filter((w) => w.t !== '$');
      if (figures.length !== LEVELS.length + 1 || !/^[A-Z]/.test(name)) continue;
      const bills = {};
      for (const w of figures.slice(1)) {
        const c = (w.x0 + w.x1) / 2;
        const i = centers.reduce((best, x, k) => (Math.abs(x - c) < Math.abs(centers[best] - c) ? k : best), 0);
        bills[LEVELS[i]] = money(w.t);
      }
      out.push({ page, utility: clean(name), websiteSourced: /\*\*$/.test(name), customerCharge: money(figures[0].t), bills });
    }
  }
  return out;
}

/**
 * The 1,000 kWh ranking table (A-10): each utility's bill and its type, two utilities to a line.
 * @param {string} text pdftotext -layout output
 */
export function readRanking(text) {
  // From the table's title to the next section; the rows may follow a page break.
  const at = text.search(/1,000 kWh Residential Monthly Bills for All Florida Electric Utilities\s+December/);
  const pg = at < 0 ? '' : text.slice(at, text.indexOf('SECTION B', at) < 0 ? undefined : text.indexOf('SECTION B', at));
  const out = new Map();
  for (const m of pg.matchAll(/(\d+)\s+([A-Z][A-Za-z.&,'\- ]+?\**)\s+([IMC])\s+\$\s*([\d,]+\.\d\d)/g)) out.set(clean(m[2]), { type: m[3], bill: money(m[4]) });
  return out;
}

/**
 * Both readings compared figure by figure, with the ranking table as a check on the 1,000 kWh column. Every
 * agreed figure becomes a row with its provenance; every disagreement is excluded and listed.
 */
export function reconcile(a, b, ranking, provenance) {
  const key = (r) => `${r.page}|${r.utility}`;
  const bMap = new Map(b.map((r) => [key(r), r]));
  const rows = []; const excluded = [];
  const TYPE = { 'A-1': 'investor-owned', 'A-2': 'municipal', 'A-3': 'cooperative' };
  for (const r of a) {
    const other = bMap.get(key(r));
    for (const kwh of LEVELS) {
      const x = r.bills[kwh]; const y = other?.bills[kwh];
      const rank = kwh === 1000 ? ranking.get(r.utility)?.bill : undefined;
      if (y === undefined || Math.abs(x - y) > 0.004 || (rank !== undefined && Math.abs(rank - x) > 0.004)) {
        excluded.push({ utility: r.utility, page: r.page, kwh, lines: x, positions: y ?? null, ...(rank !== undefined ? { ranking: rank } : {}) });
        continue;
      }
      rows.push({ ...provenance, page: r.page, utility: r.utility, ownership: TYPE[r.page], kwh, bill: x, customerCharge: r.customerCharge, websiteSourced: r.websiteSourced, ...(rank !== undefined ? { checkedAgainst: 'A-10' } : {}) });
    }
  }
  const total = rows.length + excluded.length;
  return { rows, excluded, extraction: { methods: ['layout text, line by line', 'word positions under the column headers'], figures: total, agreed: rows.length, disagreed: excluded.length, disagreementRate: total ? excluded.length / total : 0 } };
}
