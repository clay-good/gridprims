// The carbon panel: the loaded file's hourly CO2 in its balancing authority,
// with an optional clean supply profile matched hour by hour. The region
// comes from the bill panel's utility when it reports one; the grid data are
// the region's EIA-930 shards for the years the file covers, and the file
// and any supply profile stay on this device.

import { getJson } from './zip-utilities.js';
import { NO_HOURLY_STATES as NO_HOURLY, alignSupply, assignRegion, flatBlock, gridHours, hourlyEmissions, matchShares, readSupply, toHours, yearMeans } from '../../core/lib/hourly-carbon.mjs';
import { alignSolar, readPvwatts } from '../../core/lib/storage-screen.mjs';
import { readShard } from '../../core/lib/shard.mjs';
import { carbonCard } from '../../core/lib/result-cards.mjs';
import { EDITION, RATES } from '../../core/tools/calc.energy-units.emissions/rates.mjs';
import { renderCarbon } from '../ui/workbench-carbon.mjs';

const HOUR = 3_600_000;

/** @param {{i18n: any, view: () => any, version: string}} p */
export function setupCarbon({ i18n, view, version }) {
  const { t } = i18n;
  const panel = document.querySelector('[data-carbon]');
  const form = panel.querySelector('[data-carbon-form]');
  const out = panel.querySelector('[data-carbon-result]');
  const assigned = panel.querySelector('[data-carbon-assigned]');
  let regions = null;
  let utility = null;
  let last = null;
  const show = (r) => { out.innerHTML = String(renderCarbon(r, i18n)); panel.dataset.ran = String(Number(panel.dataset.ran ?? 0) + 1); };
  const ready = getJson('/carbon/regions.json').then((r) => {
    regions = r;
    for (const x of [...r.regions].filter((y) => !y.generationOnly).sort((a, b) => a.name.localeCompare(b.name))) form.region.append(Object.assign(document.createElement('option'), { value: x.ba, textContent: `${x.name} (${x.ba})` }));
  }).catch(() => {});

  form.supply.addEventListener('change', () => {
    panel.querySelectorAll('[data-carbon-supply]').forEach((el) => { el.hidden = !el.dataset.carbonSupply.split(' ').includes(form.supply.value); });
  });

  /** The bill panel found a utility: its regions (choose when there are several) and its ZIP's eGRID subregion. */
  async function preselect(u) {
    await ready;
    utility = u;
    const a = assignRegion(u, new Set((regions?.regions ?? []).filter((x) => !x.generationOnly).map((x) => x.ba)));
    // Several regions: none is chosen for the user, who picks before computing.
    form.region.value = a.status === 'assigned' ? a.ba : '';
    if (u.subregions?.length) form.subregion.value = u.subregions[0];
    assigned.textContent = a.status === 'choose' ? t('carbon.assignedMany', { utility: u.name, list: a.choices.join(', ') })
      : a.status === 'assigned' ? t('carbon.assigned', { utility: u.name, ba: a.ba })
        : a.noHourly ? t('carbon.noHourly', { state: u.state }) : t('carbon.assignedNone', { utility: u.name });
    panel.dataset.assigned = a.status === 'assigned' ? a.ba : (a.choices ?? []).join(' ');
  }

  async function supplyHours(v, load) {
    const kind = form.supply.value;
    if (kind === 'none') return null;
    if (kind === 'block') {
      const mw = Number(form.mw.value);
      if (!(mw >= 0)) return { status: 'refused', reason: t('carbon.badMw') };
      const from = Number(form.from.value);
      const to = Number(form.to.value);
      return { status: 'ok', supply: flatBlock(load.keys(), mw, { zone: v.zone, from, to }), steps: [t('carbon.blockStep', { mw, hours: from === to ? t('carbon.allDay') : `${from}:00–${to}:00` })] };
    }
    const f = form.file.files[0];
    if (!f) return { status: 'refused', reason: t('added.noFile') };
    const text = await f.text();
    if (kind === 'pvwatts') {
      const pv = readPvwatts(text);
      if (pv.status !== 'ok') return pv;
      const systemKw = Number(form.systemKw.value) || undefined;
      const solar = alignSolar(v.series, pv, { zone: v.zone, systemKw });
      const supply = new Map();
      for (let i = 0; i < v.series.startMs.length; i++) { const h = Math.floor(v.series.startMs[i] / HOUR); supply.set(h, (supply.get(h) ?? 0) + solar.kwh[i]); }
      return { status: 'ok', supply, steps: solar.notes };
    }
    const s = readSupply(text, { zone: v.zone, basis: form.basis.value, unit: form.unit.value || undefined });
    if (s.status !== 'ok') return s;
    return { status: 'ok', ...alignSupply(load.keys(), s, v.zone) };
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = view();
    if (!v) return;
    await ready;
    const sub = form.subregion.value;
    const egrid = sub ? { subregion: sub, lbPerMwh: RATES[sub].co2, edition: EDITION.name } : undefined;
    const region = regions?.regions.find((x) => x.ba === form.region.value);
    const hours = toHours(v.series);
    if (hours.status !== 'ok') return show(hours);
    if (!region) {
      // No hourly data for the region (Alaska, Hawaii, or none chosen): the eGRID annual result alone.
      if (!egrid) return show({ status: 'refused', reason: t('carbon.chooseRegion') });
      const kwh = [...hours.hours.values()].reduce((a, b) => a + b, 0);
      const lb = (kwh / 1000) * egrid.lbPerMwh;
      return show({ status: 'ok', egridOnly: { ...egrid, t: lb / 2204.62262185 }, reason: utility && NO_HOURLY.has(utility.state) ? t('carbon.noHourly', { state: utility.state }) : t('carbon.noRegion') });
    }
    const years = [...new Set([...hours.hours.keys()].map((h) => new Date(h * HOUR).getUTCFullYear()))].filter((y) => region.shards[y]);
    const rows = [];
    for (const y of years) {
      const res = await fetch(region.shards[y].path);
      if (res.ok) for (const r of readShard(await res.arrayBuffer()).rows()) rows.push(r);
    }
    const grid = gridHours(rows);
    const result = hourlyEmissions({ load: hours.hours, grid, means: yearMeans(grid), zone: v.zone, ba: region.ba, egrid });
    const steps = [...hours.steps, t('carbon.snapshot', { version: regions.version, years: years.join(', ') || t('carbon.noYears') })];
    let m;
    const notes = [];
    const supply = await supplyHours(v, hours.hours);
    if (supply && supply.status !== 'ok') return show(supply);
    if (supply) {
      steps.push(...supply.steps);
      m = matchShares({ load: hours.hours, supply: supply.supply, grid, zone: v.zone });
      // EIA's "Other" mixes geothermal, oil, and biomass, so geothermal is not counted as carbon-free.
      if (region.ba === 'CISO' || rows.some((r) => r.gen_geo > 0)) notes.push(t('carbon.geothermal', { ba: region.ba }));
    }
    last = { e: result, m };
    show({ status: 'ok', e: result, m, steps, notes });
  });

  // The result card: the result, the method, the caveat, and the labels, never the file's readings.
  panel.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-copy-card="carbon"]');
    const v = view();
    if (!b || !v || !last) return;
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: v.zone });
    const text = carbonCard(last.e, last.m, { period: `${f.format(new Date(v.series.startMs[0]))} to ${f.format(new Date(v.series.startMs[v.series.startMs.length - 1]))}`, version, eia930: regions.version });
    panel.dataset.card = text;
    await navigator.clipboard?.writeText(text).catch(() => {});
    b.textContent = t('answer.copied');
  });
  panel.dataset.ready = 'true';
  return { preselect, state: () => last };
}
