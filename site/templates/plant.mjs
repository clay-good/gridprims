// One page per power plant (add-public-grid-data: plant pages): what it is,
// what it made, what it emitted, and what is planned. County-level location
// only. Every figure carries its dataset's source stamp.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { tableView } from '../lib/chart.mjs';
import { METRIC_TONS_PER_SHORT_TON } from '../../core/lib/plant-math.mjs';
import { pageTitle } from '../lib/meta.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mw = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
const whole = (x) => Math.round(x).toLocaleString('en-US');
const pct = (x) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

/**
 * What the monitors measured, where this plant carries them: the year's totals,
 * the share of the plant they cover, the months, and the units
 * (add-measured-plant-emissions: plant page section). Nothing here is an
 * estimate, and nothing here is the whole plant.
 */
function measuredSection(p, sources, { t, date }) {
  const m = p.measured;
  const camd = sources.camd;
  if (!m || !camd) return html`<section><h2>${t('plant.measured')}</h2><p>${t('plant.measured.notMonitored')}</p></section>`;
  const y = m.latest;
  const c = m.coverage;
  const table = camd.tables.find((x) => x.name === 'units_monthly');
  const measure = (row) => [
    whole(row.co2_tonnes), whole(row.so2_lbs), whole(row.nox_lbs), whole(row.heat_input_mmbtu),
    whole(row.gross_load_mwh), row.rate_lb_mwh === null ? '' : whole(row.rate_lb_mwh),
  ];
  const headers = ['co2', 'so2', 'nox', 'heat', 'load', 'rate'].map((k) => t(`plant.measured.th.${k}`));
  return html`<section><h2>${t('plant.measured')}</h2>
<dl class="facts">
  <div><dt>${t('plant.measured.co2', { year: y.year })}</dt><dd class="mono">${whole(y.co2_tonnes)} ${t('plant.metricTons')}</dd></div>
  <div><dt>${t('plant.measured.so2')}</dt><dd class="mono">${whole(y.so2_lbs)} ${t('plant.measured.pounds')}</dd></div>
  <div><dt>${t('plant.measured.nox')}</dt><dd class="mono">${whole(y.nox_lbs)} ${t('plant.measured.pounds')}</dd></div>
  <div><dt>${t('plant.measured.heat')}</dt><dd class="mono">${whole(y.heat_input_mmbtu)} MMBtu</dd></div>
  <div><dt>${t('plant.measured.load')}</dt><dd class="mono">${whole(y.gross_load_mwh)} MWh</dd></div>
  <div><dt>${t('plant.measured.rate')}</dt><dd class="mono" data-measured-rate>${y.rate_lb_mwh === null ? t('plant.notReported') : `${whole(y.rate_lb_mwh)} lb/MWh`}</dd></div>
</dl>
<p>${t('plant.measured.units', { count: y.units })} ${c.capacityShare === null ? '' : t('plant.measured.coverageCapacity', { monitored: mw(c.monitoredMw), nameplate: mw(c.nameplateMw), share: pct(c.capacityShare) })}</p>
${c.capacityShare !== null && c.capacityShare > 1 ? html`<p class="strip">${t('plant.measured.coverageWide', { monitored: mw(c.monitoredMw), nameplate: mw(c.nameplateMw) })}</p>` : ''}
<p data-measured-coverage>${c.generationShare === null ? t('plant.measured.coverageNoGeneration') : t('plant.measured.coverageGeneration', { share: pct(c.generationShare), measured: c.generationYears.measured, reported: c.generationYears.reported })}</p>
<p>${t('plant.measured.gross')}</p>
${m.apportioned ? html`<p class="strip">${t('plant.measured.apportioned')}</p>` : ''}
${p.emissions && p.emissions.co2MetricTons !== null ? html`<p class="strip">${t('plant.measured.vsEstimated', { measuredYear: y.year, edition: sources.egrid?.release ?? '', estimatedYear: p.emissions.year })}</p>` : ''}
<h3>${t('plant.measured.byMonth', { year: y.year })}</h3>
${tableView([t('plant.measured.month'), ...headers], m.monthly.map((row) => [MONTHS[row.month - 1], ...measure(row)]), t('plant.measured.byMonthCaption', { name: p.name, year: y.year }))}
<h3>${t('plant.measured.byUnit', { year: y.year })}</h3>
${tableView([t('plant.measured.unit'), t('plant.measured.unitType'), t('plant.measured.unitFuel'), t('plant.measured.unitNameplate'), t('plant.measured.unitApportioned'), ...headers],
    m.units.map((u) => [u.unit_id, u.unit_type ?? '', u.primary_fuel ?? '', u.nameplate_mw === null ? '' : `${mw(u.nameplate_mw)} MW`, u.apportioned ? t('plant.measured.yes') : t('plant.measured.no'), ...measure(u)]),
    t('plant.measured.byUnitCaption', { name: p.name, year: y.year }))}
<p><a href="/data/epa-camd/">${t('plant.measured.dataset')}</a></p>
${sourceStamp(camd, table, { t, date })}
</section>`;
}

export const plantPath = (id) => `/plants/${id}/`;

/** What a generator's row says about its status and plans. */
function statusLine(g, { t }, monthLabel) {
  const parts = [];
  if (g.category === 'proposed') parts.push(g.plannedOperationYear ? t('plant.gen.plannedStart', { year: g.plannedOperationYear }) : t('plant.gen.proposed'));
  else if (g.category === 'retired_or_canceled') parts.push(t('plant.gen.retired', { year: g.retirementYear }));
  else parts.push(t('plant.gen.operable'));
  if (g.plannedRetirementYear) parts.push(t('plant.gen.plannedRetirement', { year: g.plannedRetirementYear }));
  if (g.monthlyStatus && monthLabel) parts.push(t('plant.gen.monthly', { month: monthLabel, status: g.monthlyStatus.description ?? g.monthlyStatus.category }));
  return parts.join(' · ');
}

/** "2 planned retirements and 1 proposed generator", naming only the counts above zero. */
function plannedList(p, { t }) {
  const parts = [p.plannedRetirements && t('plant.plannedRetirements', { count: p.plannedRetirements }), p.proposed && t('plant.proposedGenerators', { count: p.proposed })].filter(Boolean);
  return parts.length === 2 ? t('plant.and', { a: parts[0], b: parts[1] }) : parts[0];
}

/**
 * @param {{plant: any, sources: any, i18n: any, utilityPath?: (id: number) => string | null}} p
 */
export function plantPage({ plant: p, sources, i18n, utilityPath = () => null, titleName = p.name }) {
  const { t } = i18n;
  const period = sources.eia860m?.tables[0].dataPeriod;
  const monthLabel = period ? `${MONTHS[Number(period.slice(5)) - 1]} ${period.slice(0, 4)}` : null;
  const operator = utilityPath(p.utilityId);
  const cf = p.capacityFactor;
  const cfText = !cf ? t('plant.cf.noGeneration', { year: p.year })
    : cf.reason === 'net-consumer' ? t('plant.cf.netConsumer')
      : cf.value === null ? t(`plant.cf.${cf.reason}`)
        : `${(cf.value * 100).toFixed(1)}%`;
  const e = p.emissions;
  const egridEdition = sources.egrid?.release ?? null;
  const body = html`<p class="cell-section">${t('plant.kicker', { id: p.id })}</p>
<h1>${p.name}</h1>
<dl class="facts">
  <div><dt>${t('plant.operator')}</dt><dd>${operator ? html`<a href="${operator}">${p.utilityName}</a>` : p.utilityName}</dd></div>
  <div><dt>${t('plant.location')}</dt><dd>${t('plant.locationValue', { county: p.county ?? t('plant.unknown'), state: p.state })}</dd></div>
  <div><dt>${t('plant.ba')}</dt><dd>${p.baName ? `${p.baName} (${p.baCode})` : t('plant.unknown')}</dd></div>
  <div><dt>${t('plant.nameplate')}</dt><dd class="mono">${mw(p.nameplateMw)} MW</dd></div>
  <div><dt>${t('plant.summer')}</dt><dd class="mono">${mw(p.summerMw)} MW</dd></div>
</dl>
${p.plannedRetirements || p.proposed ? html`<p class="strip">${t('plant.planned', { list: plannedList(p, i18n) })}</p>` : ''}
${sourceStamp(sources.eia860, sources.eia860.tables[0], i18n)}

<section><h2>${t('plant.generation', { year: p.year })}</h2>
<dl class="facts">
  <div><dt>${t('plant.netGeneration')}</dt><dd class="mono">${p.netMwh === null ? t('plant.notReported') : `${whole(p.netMwh)} MWh`}</dd></div>
  <div><dt>${t('plant.capacityFactor')}</dt><dd class="mono" data-cf>${cfText}</dd></div>
</dl>
${cf && cf.value > 1 ? html`<p class="warning-chip">${t('plant.cf.above')}</p>` : ''}
<p>${t('plant.cf.method')}</p>
${sources.eia923 ? sourceStamp(sources.eia923, sources.eia923.tables[0], i18n) : ''}
</section>

<section><h2>${t('plant.emissions')}</h2>
${e && e.co2MetricTons !== null ? html`<dl class="facts">
  <div><dt>${t('plant.co2', { year: e.year })}</dt><dd class="mono">${whole(e.co2MetricTons)} ${t('plant.metricTons')}</dd></div>
  <div><dt>${t('plant.co2Rate')}</dt><dd class="mono">${e.co2RateLbMwh === null ? t('plant.notReported') : `${whole(e.co2RateLbMwh)} lb/MWh`}</dd></div>
</dl>
<p>${t('plant.conversion', { shortTons: whole(e.co2ShortTons), factor: METRIC_TONS_PER_SHORT_TON })}</p>` : html`<p>${e ? t('plant.noCo2', { edition: egridEdition }) : t('plant.notInEgrid', { edition: egridEdition })}</p>`}
${e && e.year !== p.year ? html`<p class="strip">${t('plant.yearsDiffer', { egridYear: e.year, year: p.year })}</p>` : ''}
${sources.egrid ? sourceStamp(sources.egrid, sources.egrid.tables[0], i18n) : ''}
</section>

${measuredSection(p, sources, i18n)}

<section><h2>${t('plant.generators')}</h2>
${tableView([t('plant.gen.id'), t('plant.gen.technology'), t('plant.gen.fuel'), t('plant.gen.nameplate'), t('plant.gen.year'), t('plant.gen.status')],
  p.generators.map((g) => [g.id, g.technology ?? '', g.energySource ?? '', g.nameplateMw === null ? '' : `${mw(g.nameplateMw)} MW`, g.operatingYear ?? '', statusLine(g, i18n, monthLabel)]), t('plant.generatorsCaption', { name: p.name }))}
${sources.eia860m ? sourceStamp(sources.eia860m, sources.eia860m.tables[0], i18n) : ''}
</section>`;
  return layout({ i18n, title: pageTitle(t('plant.title', { name: titleName })), description: t('plant.description', { name: p.name, county: p.county ?? '', state: p.state }), path: plantPath(p.id), body, section: 'grid', card: 'data' });
}
