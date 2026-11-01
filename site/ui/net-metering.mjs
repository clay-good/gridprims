// The net metering section of state and utility pages: capacity by the
// survey's technology groups each year, installations and energy sold back,
// the latest year by sector, distributed generation that is not net metered
// apart, and links to the rules instead of a summary of them.

import { html } from '../lib/html.mjs';
import { tableView } from '../lib/chart.mjs';
import { sourceStamp } from './source-stamp.mjs';

const mw = (x) => (x ? x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '');
const whole = (x) => (x ? Math.round(x).toLocaleString('en-US') : '');

/** @param {{data: any, nm: any, i18n: any, regulator?: {name: string, home: string} | null, state?: string, stateLink?: string, utility?: string}} p */
export function netMeteringSection({ data, nm, i18n, regulator, state, stateName = state, stateLink, utility }) {
  const { t } = i18n;
  const who = utility ?? stateName;
  // Every technology any year reported (EIA renamed "Storage" to "Battery" in 2023).
  const nonNetTechs = data.nonNet ? [...new Set(data.nonNet.flatMap((y) => Object.keys(y.techs)))] : [];
  const latest = data.years.at(-1);
  const any = data.years.some((y) => y.all || y.pv);
  const head = [t('nm.col.year'), t('nm.col.pv'), t('nm.col.battery'), t('nm.col.wind'), t('nm.col.other'), t('nm.col.all'), t('nm.col.installations'), t('nm.col.soldBack')];
  const rules = html`<p data-nm-rules>${t('nm.rules')} ${regulator ? html`<a href="${regulator.home}">${regulator.name}</a> · ` : ''}<a href="https://programs.dsireusa.org/system/program?state=${state}">${t('nm.dsire')}</a></p>`;
  return html`<section data-net-metering><h2>${t('nm.title')}</h2>
${any ? html`${tableView(head, data.years.map((y) => [String(y.year), mw(y.pv), mw(y.battery), mw(y.wind), mw(y.other), mw(y.all), whole(y.installations), whole(y.soldBack)]), t('nm.caption', { who }))}
${data.years.some((y) => y.batteryInPv) ? html`<p class="unit-hint">${t('nm.batteryNote')}</p>` : ''}
${latest.sectors.length ? tableView([t('utility.col.sector'), t('nm.col.all'), t('nm.col.installations'), t('nm.col.soldBack')], latest.sectors.map((s) => [t(`nm.sector.${s.sector}`), mw(s.mw), whole(s.installations), whole(s.soldBack)]), t('nm.sectorCaption', { year: latest.year })) : ''}`
    : html`<p data-nm-none>${t('nm.none', { who, year: latest.year })}</p>`}
${data.nonNet ? html`<h3>${t('nm.nonNetTitle')}</h3><p>${t('nm.nonNetNote')}</p>
${tableView([t('nm.col.year'), ...nonNetTechs, t('nm.col.all')], data.nonNet.map((y) => [String(y.year), ...nonNetTechs.map((k) => mw(y.techs[k])), mw(y.total)]), t('nm.nonNetCaption', { who: stateName }))}` : ''}
${stateLink ? html`<p><a href="${stateLink}">${t('nm.stateLink', { state: data.states?.join(', ') ?? '' })}</a></p>` : ''}
${rules}
${sourceStamp(nm, nm.tables[0], i18n)}
</section>`;
}
