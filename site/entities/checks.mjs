// The ledger's consistency checks (add-data-continuity-ledger: consistency
// checks): identities and coverage the publishers' own definitions imply,
// each published on its own with its counts, the versions it used, and the
// publisher's documentation, and never combined into a grade.

import { served } from './plants.mjs';

/** The checks considered and not published, with why. */
export const DEFERRED = [
  { check: 'EIA-930 against EIA-923 monthly generation by balancing authority', reason: 'EIA-923 reports plants by the balancing authority the respondent names, and no maintained crosswalk ties every plant to the EIA-930 region that meters it; a residual would mostly measure the crosswalk.', benchmark: 'EIA, "About the EIA-930 data": hourly values are preliminary and are not reconciled to EIA-923.', url: 'https://www.eia.gov/electricity/930-content/about.html' },
  { check: 'Hourly CO₂ estimate against EPA CAMPD measured emissions', reason: 'Waits on the measured plant emissions dataset, whose bulk files need an agency key the pipeline does not yet hold.', benchmark: 'EPA Clean Air Markets Program Data, hourly unit emissions.', url: 'https://campd.epa.gov/' },
  { check: 'EIA-861 sales against FERC Form 1 revenue by utility', reason: 'The two forms define revenue and sales differently (bundled and unbundled service, fiscal and calendar years), so a residual has no single published identity to test.', benchmark: 'PUDL documentation of the FERC Form 1 and EIA-861 tables.', url: 'https://catalystcoop-pudl.readthedocs.io/' },
];

/** Who reported reliability to EIA-861 and under which method, with the share of customers each group covers. */
function reliabilityCoverage(dataDir) {
  const rel = served(dataDir, 'eia-861', 'reliability');
  const sales = served(dataDir, 'eia-861', 'sales');
  const territory = served(dataDir, 'eia-861', 'service_territory');
  if (!rel || !sales) return null;
  const key = (r) => `${r.utility_id}|${r.state}`;
  // Reliability is reported for distribution systems: the conservative reading counts only utilities that
  // deliver power (bundled or delivery service), not retail marketers selling energy over others' wires.
  const customers = new Map();
  for (const r of sales.rows) if (r.service_type === 'Bundled' || r.service_type === 'Delivery') customers.set(key(r), (customers.get(key(r)) ?? 0) + (r.tot_customers ?? 0));
  const reported = new Map(rel.rows.map((r) => [key(r), r]));
  const groups = { ieee: 0, other: 0, both: 0, empty: 0, short: 0, absent: 0 };
  const cust = { ieee: 0, other: 0, both: 0, empty: 0, short: null, absent: 0 };
  for (const [k, c] of customers) {
    const r = reported.get(k);
    const g = !r ? 'absent'
      : r.ieee_without_med_saidi !== null && r.other_without_med_saidi !== null ? 'both'
        : r.ieee_without_med_saidi !== null ? 'ieee' : r.other_without_med_saidi !== null ? 'other' : 'empty';
    groups[g]++;
    cust[g] += c;
  }
  // Short-form filers are exempt from the reliability schedule and report no customers on the long form.
  groups.short = new Set((territory?.rows ?? []).filter((r) => r.short_form === 'Y' && !customers.has(key(r))).map(key)).size;
  const total = Object.values(cust).reduce((a, b) => a + (b ?? 0), 0);
  return {
    year: rel.rows[0]?.data_year ?? null, version: rel.manifest.version, sha: rel.table.shards.map((s) => s.sha256),
    rows: Object.keys(groups).map((g) => ({ group: g, utilities: groups[g], customers: cust[g], share: cust[g] === null ? null : total ? cust[g] / total : 0 })),
  };
}

/** The share of rows missing a field a tool needs, by dataset and field, and what cannot use them. */
function missingFields(dataDir) {
  const SPEC = [
    { dataset: 'eia-861', table: 'sales', field: 'res_customers', tools: ['household.usage-benchmark.compare (the utility average)'] },
    { dataset: 'eia-861', table: 'sales', field: 'res_sales', tools: ['household.usage-benchmark.compare (the utility average)'] },
    { dataset: 'eia-860', table: 'generators', field: 'nameplate_mw', tools: ['plant pages (capacity factor)'] },
    { dataset: 'eia-923', table: 'generation', field: 'net_generation_mwh', tools: ['plant pages (generation and capacity factor)'] },
    { dataset: 'eia-930', table: 'hourly', field: 'intensity_consumed', tools: ['the workbench\'s hourly emissions', 'carbon.load-shift.estimate (typical hours)'] },
    { dataset: 'eia-930', table: 'hourly', field: 'demand', tools: ['balancing authority pages', 'the grid pulse'] },
    { dataset: 'ghcn-daily', table: 'daily', field: 'tmax', tools: ['weather.change.explain'] },
  ];
  return SPEC.map((s) => {
    const t = served(dataDir, s.dataset, s.table);
    if (!t) return null;
    const missing = t.rows.filter((r) => r[s.field] === null || r[s.field] === undefined).length;
    return { ...s, version: t.manifest.version, rows: t.rows.length, missing, share: t.rows.length ? missing / t.rows.length : 0 };
  }).filter(Boolean);
}

/** @param {string} dataDir */
export function consistencyChecks(dataDir) {
  const pairs = served(dataDir, 'eia-930-interchange', 'pair_residuals');
  const totals = served(dataDir, 'eia-930-interchange', 'total_residuals');
  return {
    interchange: pairs ? {
      version: pairs.manifest.version, year: 2025, attribution: pairs.manifest.attribution,
      raw: pairs.manifest.raw.map((r) => ({ name: r.name, sha256: r.sha256 })),
      identity: 'EIA defines interchange as the net metered flow between directly interconnected balancing authorities, positive for a net outflow, and a balancing authority\'s total interchange as the sum over its neighbors (Form EIA-930 instructions and "About the EIA-930 data").',
      cite: 'https://www.eia.gov/electricity/930-content/about.html',
      pairs: [...pairs.rows].sort((a, b) => (b.residual_pct ?? 0) - (a.residual_pct ?? 0)),
      totals: [...(totals?.rows ?? [])].sort((a, b) => (b.reported_residual_pct ?? 0) - (a.reported_residual_pct ?? 0)),
    } : null,
    reliability: reliabilityCoverage(dataDir),
    reliabilityCite: 'https://www.eia.gov/survey/form/eia_861/instructions.pdf',
    missing: missingFields(dataDir),
    deferred: DEFERRED,
  };
}
