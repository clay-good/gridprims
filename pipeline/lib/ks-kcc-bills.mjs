// Kansas Corporation Commission residential electric bill comparison (add-tariff-conformance-suite 1.2 and 1.3):
// the "Residential Electric Bill Comparison | July 2024 - June 2025" table of the Commission's 2026 Utilities and
// Common Carriers Report, each investor-owned utility's monthly bill at the average residential use of 899 kWh,
// itemized by charge. Read twice by independent methods, from the layout text line by line and from the words
// on each company's row; the row's charges must also add up to its total. A disputed figure is excluded and
// counted, never guessed.

export const KWH = 899;
/** The charge columns, in the table's order, then the total without tax. */
export const CHARGES = ['Customer Charge', 'Energy Charge', 'ECA', 'Winter Storm Uri', 'Energy Efficiency Rider', 'Transmission Delivery Charge', 'Property Tax Surcharge', 'Tax Change Rider'];
const AMOUNT = /^\(?\$(-|[\d,]+\.\d\d)\)?$/;
const money = (s) => (s === '$-' ? 0 : (/^\(.*\)$/.test(s) ? -1 : 1) * Number(s.replace(/[$,()]/g, '')));
const COMPANIES = ['Empire', 'Evergy Metro', 'Evergy Central'];

/** One company's figures from its row's tokens: the eight charges and the total, in order. */
const parse = (tokens) => {
  const amounts = tokens.filter((t) => AMOUNT.test(t)).slice(0, CHARGES.length + 1).map(money);
  return amounts.length === CHARGES.length + 1 ? { lines: amounts.slice(0, -1), total: amounts.at(-1) } : null;
};

/**
 * Method A: the layout text, each company's line after the table's heading.
 * @param {string} text pdftotext -layout output of the report
 */
export function readByLines(text) {
  const pages = text.split('\f');
  const i = pages.findIndex((p) => p.includes('RESIDENTIAL ELECTRIC BILL COMPARISON | JULY 2024 - JUNE 2025'));
  if (i < 0) return [];
  const out = [];
  for (const line of pages[i].split('\n')) {
    const name = COMPANIES.find((c) => new RegExp(`^\\s*${c}\\s+\\$`).test(line));
    const p = name && parse(line.trim().slice(name.length).trim().split(/\s+/));
    if (p) out.push({ page: i + 1, company: name, ...p });
  }
  return out;
}

/**
 * Method B: word positions. On the table's page, each company's words share a baseline; its amounts are read
 * left to right.
 * @param {string} bbox pdftotext -bbox output of the table's page
 * @param {number} page that page's number
 */
export function readByPositions(bbox, page) {
  const words = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map((w) => ({ x: +w[1], y: +w[2], t: w[5] }));
  const out = [];
  for (const name of COMPANIES) {
    const last = name.split(' ').at(-1);
    const label = words.find((w) => w.t === last && words.some((v) => AMOUNT.test(v.t) && Math.abs(v.y - w.y) < 2 && v.x > w.x));
    if (!label) continue;
    const row = words.filter((w) => Math.abs(w.y - label.y) < 2 && w.x > label.x).sort((a, b) => a.x - b.x);
    const p = parse(row.map((w) => w.t));
    if (p) out.push({ page, company: name, ...p });
  }
  return out;
}

/** Both readings compared, and each row's charges summed against its total. */
export function reconcile(a, b) {
  const rows = []; const excluded = [];
  for (const r of a) {
    const o = b.find((x) => x.company === r.company);
    const sum = Math.round(r.lines.reduce((t, x) => t + x, 0) * 100);
    const why = !o ? 'not read by word positions'
      : o.total !== r.total || o.lines.some((x, i) => x !== r.lines[i]) ? 'the two methods disagree'
        : sum !== Math.round(r.total * 100) ? 'the charges do not add up to the total' : null;
    if (why) { excluded.push({ utility: r.company, kwh: KWH, why }); continue; }
    rows.push({ page: r.page, utility: r.company, schedule: 'Residential', kwh: KWH, bill: r.total, lines: CHARGES.map((label, i) => ({ label, rate: null, amount: r.lines[i] })).filter((l) => l.amount !== 0) });
  }
  for (const r of b.filter((x) => !a.some((y) => y.company === x.company))) excluded.push({ utility: r.company, kwh: KWH, why: 'not read from the layout text' });
  const total = rows.length + excluded.length;
  return { rows, excluded, extraction: { methods: ['layout text, line by line', 'word positions on each company\'s row'], figures: total, agreed: rows.length, disagreed: excluded.length, disagreementRate: total ? excluded.length / total : 0 } };
}
