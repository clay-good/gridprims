// One page per power plant (add-public-grid-data: plant pages): what it is,
// what it made, what it emitted, and what is planned. County-level location
// only. Every figure carries its dataset's source stamp.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { tableView } from '../lib/chart.mjs';
import { METRIC_TONS_PER_SHORT_TON } from '../../core/lib/plant-math.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mw = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
const whole = (x) => Math.round(x).toLocaleString('en-US');

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
export function plantPage({ plant: p, sources, i18n, utilityPath = () => null }) {
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

<section><h2>${t('plant.generators')}</h2>
${tableView([t('plant.gen.id'), t('plant.gen.technology'), t('plant.gen.fuel'), t('plant.gen.nameplate'), t('plant.gen.year'), t('plant.gen.status')],
  p.generators.map((g) => [g.id, g.technology ?? '', g.energySource ?? '', g.nameplateMw === null ? '' : `${mw(g.nameplateMw)} MW`, g.operatingYear ?? '', statusLine(g, i18n, monthLabel)]), t('plant.generatorsCaption', { name: p.name }))}
${sources.eia860m ? sourceStamp(sources.eia860m, sources.eia860m.tables[0], i18n) : ''}
</section>`;
  return layout({ i18n, title: `${p.name} · ${t('site.name')}`, description: t('plant.description', { name: p.name, county: p.county ?? '', state: p.state }), path: plantPath(p.id), body, section: 'grid' });
}
