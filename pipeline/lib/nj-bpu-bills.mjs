// New Jersey BPU average residential bills (add-tariff-conformance-suite 1.2 and 1.3): the "Monthly Impact of
// BGS Auction on Average Residential Accounts" table of the Board's release certifying the 2026 auction, each
// electric distribution company's bill at 650 kWh on the rates in force when it was issued and on the rates
// from June 1, 2026 (before credits or offsets). Read twice by independent methods, from the table's cells and
// from the page's text with the markup stripped, and checked against the table's own arithmetic: the current
// bill plus the change is the new bill, and the change over the current bill is the printed percent.

const money = (s) => { const n = Number(s.replace(/[$,]/g, '').replace('-$', '-')); return s.trim().startsWith('-') ? -Math.abs(n) : n; };
export const UTILITIES = { ACE: 'Atlantic City Electric', 'JCP&L': 'Jersey Central Power & Light', 'PSE&G': 'Public Service Electric and Gas', RECO: 'Rockland Electric' };
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#36;/g, '$');

/**
 * Method A: the table's cells, row by row.
 * @param {string} page the release's HTML
 * @returns {Array<{code: string, kwh: number, current: number, change: number, next: number, percent: number}>}
 */
export function readByCells(page) {
  const at = page.indexOf('Monthly Impact of BGS Auction');
  const table = page.slice(at, page.indexOf('</table>', at));
  const out = [];
  for (const tr of table.split(/<tr[\s>]/i).slice(1)) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => unescape(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
    if (cells.length < 6 || !(cells[0] in UTILITIES)) continue;
    out.push({ code: cells[0], kwh: Number(cells[1]), current: money(cells[2]), change: money(cells[3]), next: money(cells[4]), percent: Number(cells[5].replace('%', '')) });
  }
  return out;
}

/**
 * Method B: the page's text with all markup removed, each company's code followed by its five figures.
 * @param {string} page
 */
export function readByText(page) {
  const at = page.indexOf('Monthly Impact of BGS Auction');
  const text = unescape(page.slice(at, page.indexOf('</table>', at)).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const out = [];
  for (const m of text.matchAll(/(ACE|JCP&L|PSE&G|RECO) (\d+) (\$[\d,]+\.\d\d) (-?\$[\d,]+\.\d\d) (\$[\d,]+\.\d\d) (-?[\d.]+)%/g)) {
    out.push({ code: m[1], kwh: Number(m[2]), current: money(m[3]), change: money(m[4]), next: money(m[5]), percent: Number(m[6]) });
  }
  return out;
}

const cents = (n) => Math.round(n * 100);

/**
 * Both readings compared, and each row's own arithmetic checked; every agreed bill becomes a row with the date
 * of the rates it uses, and a row the readings or the arithmetic dispute is excluded with why.
 * @param {string} issued the release's date, when the current rates were in force
 * @param {string} from the date the new rates take effect
 */
export function reconcile(a, b, { issued, from }) {
  const rows = []; const excluded = [];
  for (const r of a) {
    const o = b.find((x) => x.code === r.code);
    const why = !o ? 'not read from the page text'
      : ['kwh', 'current', 'change', 'next', 'percent'].some((k) => o[k] !== r[k]) ? 'the two methods disagree'
        : cents(r.current) + cents(r.change) !== cents(r.next) ? 'the current bill and the change do not add up to the new bill'
          // The printed percent is rounded to its last decimal place, so it may be off by half of that place.
          : Math.abs((r.change / r.current) * 100 - r.percent) > 0.5 * 10 ** -((String(r.percent).split('.')[1] ?? '').length) + 1e-9 ? 'the change does not match the printed percent'
            : null;
    const name = UTILITIES[r.code];
    if (why) { excluded.push({ utility: name, kwh: r.kwh, why }); continue; }
    rows.push({ page: 1, utility: name, schedule: 'Residential (Basic Generation Service)', kwh: r.kwh, bill: r.current, month: issued.slice(0, 7), ratesAsOf: issued });
    rows.push({ page: 1, utility: name, schedule: 'Residential (Basic Generation Service)', kwh: r.kwh, bill: r.next, month: from.slice(0, 7), ratesAsOf: from, beforeCredits: true });
  }
  const figures = a.length * 2;
  return { rows, excluded, extraction: { methods: ['the table\'s cells', 'the page text with the markup removed'], figures, agreed: rows.length, disagreed: figures - rows.length, disagreementRate: figures ? (figures - rows.length) / figures : 0 } };
}
