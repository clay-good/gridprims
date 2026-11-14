// Peer comparison for published reliability (add-reliability-tools: peer
// comparison). A utility's EIA-861 figure is placed among utilities of the same
// ownership type, then size, then census division, and reported as a percentile
// with the cohort's median and quartiles. Figures are never compared across
// bases (with or without major event days) or across methods (the IEEE
// standard or a utility's own) without saying so, and nothing here ranks,
// grades, or explains a position.

/** The Census Bureau's nine divisions. */
export const DIVISIONS = {
  'New England': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'],
  'Middle Atlantic': ['NJ', 'NY', 'PA'],
  'East North Central': ['IL', 'IN', 'MI', 'OH', 'WI'],
  'West North Central': ['IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'South Atlantic': ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV'],
  'East South Central': ['AL', 'KY', 'MS', 'TN'],
  'West South Central': ['AR', 'LA', 'OK', 'TX'],
  Mountain: ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY'],
  Pacific: ['AK', 'CA', 'HI', 'OR', 'WA'],
};
const DIVISION_OF = Object.fromEntries(Object.entries(DIVISIONS).flatMap(([d, sts]) => sts.map((s) => [s, d])));
export const divisionOf = (state) => DIVISION_OF[state] ?? null;

/** EIA-861 ownership types, grouped. */
export const OWNERSHIP = {
  'Investor Owned': 'investor-owned', Cooperative: 'cooperative',
  Municipal: 'public power', 'Political Subdivision': 'public power', State: 'public power', Federal: 'public power', 'Municipal Mktg Authority': 'public power',
};

/** Ours, disclosed: customer-count classes, and the fewest utilities a cohort may hold. */
export const SIZE_CLASSES = [
  { id: 'under-10k', label: 'under 10,000 customers', max: 10_000 },
  { id: '10k-100k', label: '10,000 to 99,999 customers', max: 100_000 },
  { id: '100k-1m', label: '100,000 to 999,999 customers', max: 1_000_000 },
  { id: '1m-plus', label: '1,000,000 customers or more', max: Infinity },
];
export const MIN_COHORT = 10;
export const sizeClassOf = (customers) => SIZE_CLASSES.find((s) => customers < s.max) ?? null;

export const BASES = { 'with-med': 'including major event days', 'without-med': 'excluding major event days' };
export const METHODS = { ieee: 'the IEEE 1366 standard method', other: 'the utility\'s own method' };
export const METRICS = { saidi: { label: 'minutes without power per customer', unit: 'min' }, saifi: { label: 'interruptions per customer', unit: 'interruptions' } };

/** The choices behind every comparison, said once. */
export const OURS = 'The size classes, the ten-utility minimum, the cohort order (ownership, then size, then census division), and the quartile rule (linear interpolation between ranks) are our choices; EIA publishes the figures, not the cohorts.';

/**
 * One figure per utility, state, method, and basis that EIA-861 reports.
 * Coverage is the reliability report's customers over the customers the sales
 * schedule counts for the same utility and state; the two schedules count
 * differently, so it can exceed 100%.
 * @param {any[]} reliability rows of the EIA-861 reliability table
 * @param {any[]} [sales] rows of the EIA-861 sales table
 */
export function figures(reliability, sales = []) {
  const served = new Map();
  for (const s of sales) {
    if (s.service_type === 'Energy' || !(s.tot_customers > 0)) continue;
    const k = `${s.utility_id}|${s.state}`;
    served.set(k, (served.get(k) ?? 0) + s.tot_customers);
  }
  const out = [];
  for (const r of reliability) {
    const ownership = OWNERSHIP[r.ownership] ?? null;
    const division = divisionOf(r.state);
    for (const method of ['ieee', 'other']) {
      const customers = r[`${method}_customers`];
      if (!(customers > 0)) continue;
      const salesCustomers = served.get(`${r.utility_id}|${r.state}`) ?? null;
      for (const [basis, key] of [['with-med', 'with_med'], ['without-med', 'without_med']]) {
        const saidi = r[`${method}_${key}_saidi`];
        const saifi = r[`${method}_${key}_saifi`];
        if (saidi === null && saifi === null) continue;
        out.push({
          utilityId: r.utility_id, name: r.utility_name, state: r.state, year: r.data_year,
          ownership, division, size: sizeClassOf(customers)?.id ?? null, customers, method, basis, saidi, saifi,
          coverage: salesCustomers ? customers / salesCustomers : null,
        });
      }
    }
  }
  return out;
}

/** Quantile by linear interpolation between order statistics (R's type 7, NumPy's default). */
export function quantile(sorted, q) {
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
}

/** n, quartiles, and median of a list of numbers. */
export function stats(values) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return { n: 0, q1: null, median: null, q3: null };
  return { n: s.length, q1: quantile(s, 0.25), median: quantile(s, 0.5), q3: quantile(s, 0.75) };
}

/** The cohorts a figure belongs to, narrowest first; each step drops one key. */
const LEVELS = [['ownership', 'size', 'division'], ['ownership', 'size'], ['ownership']];
const keyOf = (f, keys) => keys.map((k) => `${k}=${f[k]}`).join('&');

/** Describe a cohort in words, for the result and the downloadable table. */
export function cohortName(f, keys, method, basis) {
  const size = SIZE_CLASSES.find((s) => s.id === f.size)?.label;
  return [`${f.ownership} utilities`, keys.includes('size') ? `with ${size}` : null, keys.includes('division') ? `in the ${f.division} division` : null]
    .filter(Boolean).join(' ') + `, reporting by ${METHODS[method]} and ${BASES[basis]}`;
}

/**
 * Every cohort's statistics, for every method, basis, and level: the table
 * anyone can download to check a percentile.
 * @param {ReturnType<typeof figures>} figs
 */
export function cohortTable(figs) {
  const rows = new Map();
  for (const f of figs) {
    if (!f.ownership || !f.size || !f.division) continue;
    for (const keys of LEVELS) {
      const id = `${f.method}|${f.basis}|${keyOf(f, keys)}`;
      const row = rows.get(id) ?? rows.set(id, { id, method: f.method, basis: f.basis, ownership: f.ownership, size: keys.includes('size') ? f.size : null, division: keys.includes('division') ? f.division : null, name: cohortName(f, keys, f.method, f.basis), saidi: [], saifi: [] }).get(id);
      if (Number.isFinite(f.saidi)) row.saidi.push(f.saidi);
      if (Number.isFinite(f.saifi)) row.saifi.push(f.saifi);
    }
  }
  return [...rows.values()].map(({ saidi, saifi, ...r }) => ({ ...r, saidi: stats(saidi), saifi: stats(saifi) })).sort((a, b) => a.id.localeCompare(b.id));
}

const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Where one utility's figure sits among its peers.
 * @param {ReturnType<typeof figures>[number]} target the utility's figure
 * @param {ReturnType<typeof figures>} figs every figure, the target's included
 * @param {{metric?: 'saidi' | 'saifi', cohortBasis?: string, cohortMethod?: string, min?: number}} [o]
 */
export function compare(target, figs, o = {}) {
  const metric = o.metric ?? 'saidi';
  const basis = o.cohortBasis ?? target.basis;
  const method = o.cohortMethod ?? target.method;
  // Never across bases: a figure with major event days and one without measure different things.
  if (basis !== target.basis) {
    return {
      status: 'refused',
      reason: `This figure is ${BASES[target.basis]}; the cohort you chose is ${BASES[basis]}. Those measure different things, so they are not compared.`,
      offer: { cohortBasis: target.basis },
    };
  }
  const x = target[metric];
  if (!Number.isFinite(x)) return { status: 'refused', reason: `This utility reports no ${METRICS[metric].label} ${BASES[basis]}.` };
  const min = o.min ?? MIN_COHORT;
  const pool = figs.filter((f) => f.basis === basis && f.method === method && Number.isFinite(f[metric]) && f.ownership === target.ownership);
  let chosen = null;
  const widened = [];
  for (const keys of LEVELS) {
    const members = pool.filter((f) => keys.every((k) => f[k] === target[k]));
    if (members.length >= min) { chosen = { keys, members }; break; }
    widened.push({ name: cohortName(target, keys, method, basis), n: members.length });
  }
  if (!chosen) return { status: 'refused', reason: `Fewer than ${min} ${target.ownership} utilities report ${METRICS[metric].label} by ${METHODS[method]} ${BASES[basis]}, so there is no cohort to compare with.` };
  const values = chosen.members.map((f) => f[metric]).sort((a, b) => a - b);
  const below = values.filter((v) => v < x).length;
  const equal = values.filter((v) => v === x).length;
  // Mid-rank percentile: the share below, plus half the share equal (the utility itself included).
  const percentile = (100 * (below + equal / 2)) / values.length;
  const s = stats(values);
  const name = cohortName(target, chosen.keys, method, basis);
  const unit = METRICS[metric].unit;
  return {
    status: 'ok', metric, basis, method, value: x, percentile, below, n: values.length, ...s, cohort: name,
    widened: widened.length ? widened : null,
    coverage: target.coverage,
    sentence: `${n1(x)} ${unit} ${BASES[basis]}. ${below} of the ${values.length} ${name} reported less; the median is ${n1(s.median)} ${unit}, and the middle half runs from ${n1(s.q1)} to ${n1(s.q3)}.`,
    widenedNote: widened.length ? `${widened.map((w) => `The narrower cohort, ${w.name}, has ${w.n} ${w.n === 1 ? 'utility' : 'utilities'}`).join('; ')}, fewer than ${min}, so the comparison uses the wider one.` : null,
    coverageNote: target.coverage === null ? null : `The report covers ${n1(target.coverage * 100)}% of the customers EIA's sales schedule counts for this utility here. The two schedules count customers differently, so this can exceed 100%.`,
    methodNote: method === 'other' ? 'These utilities report by their own method, not the IEEE standard, and many define major events themselves, so their figures are not comparable with standard-method figures or always with one another.' : null,
    ours: OURS,
  };
}

/**
 * Two figures side by side: refused across bases, and labeled by method when
 * the methods differ.
 */
export function pair(a, b) {
  if (a.basis !== b.basis) return { status: 'refused', reason: `One figure is ${BASES[a.basis]} and the other ${BASES[b.basis]}; those measure different things.`, offer: { basis: a.basis } };
  const labels = a.method !== b.method ? [`${a.name}: ${METHODS[a.method]}`, `${b.name}: ${METHODS[b.method]}`] : null;
  return { status: 'ok', labels, note: labels ? 'The two use different methods. Self-declared major events are not comparable with the IEEE standard\'s.' : null };
}
