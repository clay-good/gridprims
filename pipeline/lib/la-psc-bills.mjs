// Louisiana PSC residential bill comparison (add-tariff-conformance-suite 1.2 and 1.3): the monthly
// "Residential Bill Comparison" of the Commission's jurisdictional electric utilities, one block per rate
// schedule itemizing every charge at eleven consumption levels. Each block is read twice by independent
// methods, from the layout text line by line and from each word's position under the block's "Kwh"
// headers. The report's summary table restates every total and is a third reading; the block's own line
// items, which must add up to its total, are a fourth. A total either method or check disputes is excluded
// and counted, never guessed.

export const LEVELS = [250, 500, 750, 1000, 1250, 1500, 1750, 2000, 3000, 4000, 5000];
const AMOUNT = /^\(?-?[\d,]*\d\.\d\d\)?$/;
const amount = (s) => { const n = Number(s.replace(/[$,()]/g, '')); return /^\(.*\)$/.test(s) ? -n : n; };
const cents = (n) => Math.round(n * 100);

/** "Entergy Louisiana-Schedule RS-G (Legacy EGSL)" → utility and schedule, as printed. */
export function splitName(name) {
  const m = /^(.*?)\s*-\s*(Schedule .*)$/.exec(name.trim());
  return m ? { utility: m[1].trim(), schedule: m[2].trim() } : { utility: name.trim(), schedule: null };
}
const keyOf = (name) => name.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Method A: the layout text. A block starts at a line naming the schedule followed by eleven "Kwh" headers;
 * each following line is a label, an optional rate, and eleven amounts, until "Total".
 * @param {string} text pdftotext -layout output
 * @returns {Array<{page: number, name: string, lines: Array<{label: string, rate: string | null, amounts: number[]}>, total: number[]}>}
 */
export function readByLines(text) {
  const out = [];
  text.split('\f').forEach((pg, i) => {
    let block = null;
    for (const raw of pg.split('\n')) {
      const head = /^(\S.*?)\s{2,}Kwh(?:\s+Kwh){10}\s*$/.exec(raw);
      if (head) { block = { page: i + 1, name: head[1].trim(), lines: [], total: null }; continue; }
      if (!block) continue;
      const chunks = raw.trim().split(/\s{2,}/);
      const figures = chunks.slice(-LEVELS.length);
      if (chunks.length < LEVELS.length + 1 || !figures.every((f) => AMOUNT.test(f))) continue;
      const [label, rate = null] = chunks.slice(0, chunks.length - LEVELS.length);
      const amounts = figures.map(amount);
      if (label === 'Total') { block.total = amounts; out.push(block); block = null; continue; }
      block.lines.push({ label, rate, amounts });
    }
  });
  return out;
}

/**
 * Method B: word positions. On each page, words sharing a baseline form a row; a row with eleven "Kwh" words
 * opens a block and gives the column centers; every amount below is placed in the column whose center is
 * nearest, and a word left of the first column is the rate or part of the label. Independent of the line
 * layout method A relies on.
 * @param {string} bbox pdftotext -bbox output
 */
export function readByPositions(bbox) {
  const out = [];
  bbox.split('<page').slice(1).forEach((pg, i) => {
    const words = [...pg.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map((w) => ({ x0: +w[1], y0: +w[2], x1: +w[3], t: w[5].replace(/&amp;/g, '&').replace(/&#39;/g, '\'') }));
    const rows = [];
    for (const w of words) {
      const row = rows.find((r) => Math.abs(r.y - w.y0) <= 2);
      if (row) row.words.push(w); else rows.push({ y: w.y0, words: [w] });
    }
    rows.sort((a, b) => a.y - b.y);
    let block = null; let centers = null;
    for (const { words: ws } of rows) {
      ws.sort((a, b) => a.x0 - b.x0);
      const kwh = ws.filter((w) => w.t === 'Kwh');
      if (kwh.length === LEVELS.length) {
        const name = ws.filter((w) => w.x1 < kwh[0].x0).map((w) => w.t).join(' ');
        centers = kwh.map((w) => (w.x0 + w.x1) / 2);
        block = name ? { page: i + 1, name, lines: [], total: null } : null;
        continue;
      }
      if (!block) continue;
      const half = (centers[1] - centers[0]) / 2;
      const amounts = Array(LEVELS.length).fill(undefined);
      const left = [];
      for (const w of ws) {
        const c = (w.x0 + w.x1) / 2;
        const k = centers.reduce((best, x, j) => (Math.abs(x - c) < Math.abs(centers[best] - c) ? j : best), 0);
        if (AMOUNT.test(w.t) && Math.abs(centers[k] - c) <= half) amounts[k] = amount(w.t);
        else left.push(w);
      }
      if (amounts.some((a) => a === undefined)) continue;
      // The rate is the rightmost word left of the columns when it stands apart from the label.
      const gap = left.length > 1 ? left.at(-1).x0 - left.at(-2).x1 : 0;
      const rateWord = left.length > 1 && gap > 20 ? left.at(-1) : null;
      const label = left.filter((w) => w !== rateWord).map((w) => w.t).join(' ');
      if (label === 'Total') { block.total = amounts; out.push(block); block = null; continue; }
      block.lines.push({ label, rate: rateWord?.t ?? null, amounts });
    }
  });
  return out;
}

/**
 * The summary table that restates every schedule's total at each level, in dollars.
 * @param {string} text pdftotext -layout output
 * @returns {Map<string, number[]>} keyed by the schedule's name, letters and digits only
 */
export function readSummary(text) {
  const out = new Map();
  const pg = text.split('\f').find((p) => /^\s+Company\s+250\s+500/m.test(p)) ?? '';
  for (const m of pg.matchAll(/^(\S.*?)\s{2,}((?:\$[\d,]+\.\d\d\s+){10}\$[\d,]+\.\d\d)\s*$/gm)) out.set(keyOf(m[1]), m[2].trim().split(/\s+/).map(amount));
  return out;
}

/** The summary's figures for a block: by its full name, or by its utility when only one schedule bears it. */
function summaryFor(name, summary, blocks) {
  if (summary.has(keyOf(name))) return { figures: summary.get(keyOf(name)), by: 'name' };
  const { utility } = splitName(name);
  if (blocks.filter((b) => splitName(b.name).utility === utility).length !== 1) return null;
  const hits = [...summary.entries()].filter(([k]) => k.startsWith(keyOf(utility)) && k.slice(keyOf(utility).length).startsWith('SCHEDULE'));
  return hits.length === 1 ? { figures: hits[0][1], by: 'utility' } : null;
}

/**
 * Both readings compared figure by figure, with the summary table and the block's own line items as checks.
 * Every agreed total becomes a row with its line items; every disputed one is excluded and listed with why.
 */
export function reconcile(a, b, summary) {
  const bMap = new Map(b.map((r) => [`${r.page}|${keyOf(r.name)}`, r]));
  const rows = []; const excluded = []; const notes = [];
  for (const r of a) {
    const other = bMap.get(`${r.page}|${keyOf(r.name)}`);
    const sum = summaryFor(r.name, summary, a);
    if (sum?.by === 'utility') notes.push(`${r.name}: the summary table names it differently; matched by utility`);
    const { utility, schedule } = splitName(r.name);
    LEVELS.forEach((kwh, i) => {
      const x = r.total[i]; const y = other?.total[i];
      const restated = sum?.figures[i];
      const items = r.lines.filter((l) => l.label !== 'Subtotal');
      const itemSum = items.reduce((s, l) => s + cents(l.amounts[i]), 0);
      // Each printed item is rounded to the cent, so the items may miss the total by half a cent each.
      const itemsAgree = Math.abs(itemSum - cents(x)) <= Math.ceil(items.length / 2);
      const linesAgree = !!other && other.lines.length === r.lines.length && r.lines.every((l, j) => cents(l.amounts[i]) === cents(other.lines[j].amounts[i]));
      const why = y === undefined ? 'not read by word positions' : cents(x) !== cents(y) ? 'the two methods disagree'
        : restated === undefined ? 'not in the summary table' : cents(restated) !== cents(x) ? 'the summary table disagrees'
          : !itemsAgree ? 'the line items do not add up to the total' : null;
      if (why) { excluded.push({ utility, schedule, page: r.page, kwh, lines: x, positions: y ?? null, summary: restated ?? null, itemSum: itemSum / 100, why }); return; }
      rows.push({ page: r.page, utility, schedule, kwh, bill: x, checkedAgainst: 'summary table',
        ...(linesAgree ? { lines: r.lines.map((l) => ({ label: l.label, rate: l.rate, amount: l.amounts[i] })) } : {}) });
    });
  }
  const total = rows.length + excluded.length;
  return { rows, excluded, notes: [...new Set(notes)], extraction: { methods: ['layout text, line by line', 'word positions under the column headers'], figures: total, agreed: rows.length, disagreed: excluded.length, disagreementRate: total ? excluded.length / total : 0 } };
}
