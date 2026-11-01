// Net metering for state and utility pages (add-program-fact-pages: net
// metering): each year's net-metered capacity by the survey's technology
// groups, installations, and energy sold back, by sector, and distributed
// generation that is not net metered, shown apart as a different arrangement.

import { served } from './plants.mjs';

const CAPACITY = 'Capacity MW';

/** One year's figures from a set of rows. */
function summarize(rows) {
  const t = (tech, measure, sector = 'Total') => rows.filter((r) => r.technology === tech && r.measure === measure && r.sector === sector).reduce((n, r) => n + r.value, 0);
  const sectors = ['Residential', 'Commercial', 'Industrial', 'Transportation'];
  // Batteries: their own group from 2023; before that, storage paired with photovoltaic sat under photovoltaic.
  const battery = rows.filter((r) => r.sector === 'Total' && ((r.technology === 'Battery' && /Battery Capacity \(MW\)$/.test(r.measure)) || (r.technology === 'Photovoltaic' && r.measure === 'Storage Capacity (MW)'))).reduce((n, r) => n + r.value, 0);
  return {
    pv: t('Photovoltaic', CAPACITY), battery, batteryInPv: rows.some((r) => r.technology === 'Photovoltaic' && r.measure === 'Storage Capacity (MW)'),
    wind: t('Wind', CAPACITY), other: t('Other', CAPACITY), all: t('All Technologies', CAPACITY),
    installations: t('All Technologies', 'Installations'), soldBack: t('All Technologies', 'Energy Sold Back MWh'),
    sectors: sectors.map((s) => ({ sector: s, mw: t('All Technologies', CAPACITY, s), installations: t('All Technologies', 'Installations', s), soldBack: t('All Technologies', 'Energy Sold Back MWh', s) })).filter((s) => s.mw || s.installations),
  };
}

function nonNet(rows) {
  const techs = [...new Set(rows.filter((r) => r.measure === CAPACITY && r.sector === 'Total' && r.technology !== 'Total').map((r) => r.technology))];
  return { techs: Object.fromEntries(techs.map((x) => [x, rows.filter((r) => r.technology === x && r.measure === CAPACITY && r.sector === 'Total').reduce((n, r) => n + r.value, 0)])), total: rows.filter((r) => r.technology === 'Total' && r.measure === CAPACITY && r.sector === 'Total').reduce((n, r) => n + r.value, 0) };
}

/** @param {string} dataDir */
export function netMeteringData(dataDir) {
  const nm = served(dataDir, 'eia-861-net-metering', 'net_metering');
  const nn = served(dataDir, 'eia-861-net-metering', 'non_net');
  if (!nm) return null;
  const years = [...new Set(nm.rows.map((r) => r.data_year))].sort();
  const by = (rows, key) => Map.groupBy(rows, key);
  const nmState = by(nm.rows, (r) => r.state);
  const nnState = by(nn?.rows ?? [], (r) => r.state);
  const nmUtility = by(nm.rows, (r) => r.utility_id);
  const perYear = (rows, f) => years.map((y) => ({ year: y, ...f((rows ?? []).filter((r) => r.data_year === y)) }));
  return {
    years, manifest: nm.manifest,
    state: (st) => ({ years: perYear(nmState.get(st), summarize), nonNet: perYear(nnState.get(st), nonNet) }),
    utility: (id) => {
      const rows = nmUtility.get(id) ?? [];
      return { years: perYear(rows, summarize), states: [...new Set(rows.map((r) => r.state))].sort() };
    },
  };
}
