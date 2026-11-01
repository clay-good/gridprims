// The ledger's consistency checks page (add-data-continuity-ledger:
// consistency checks): each identity or coverage check with its citation,
// counts, and versions; what a residual means; the checks deferred and why;
// and no combined grade.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { tableView } from '../lib/chart.mjs';

export const CHECKS_PATH = '/ledger/checks/';
const pct = (x) => (x === null || x === undefined ? '' : `${x.toFixed(2)}%`);
const whole = (x) => (x === null || x === undefined ? '' : Math.round(x).toLocaleString('en-US'));

/** @param {{checks: any, i18n: any}} p */
export function checksPage({ checks: c, i18n }) {
  const { t } = i18n;
  const ic = c.interchange;
  const group = (g) => t(`checks.group.${g}`);
  const body = html`<h1>${t('checks.title')}</h1>
<p class="purpose">${t('checks.intro')}</p>
<p data-checks-no-index>${t('checks.noIndex')}</p>
<p><a href="/ledger/checks.json">${t('checks.json')}</a> · <a href="/ledger/">${t('ledger.title')}</a></p>
${ic ? html`<section data-checks-interchange><h2>${t('checks.interchange', { year: ic.year })}</h2>
<p>${ic.identity} <a href="${ic.cite}">${t('checks.cite')}</a></p>
<p class="strip" data-checks-meaning>${t('checks.meaning')}</p>
<h3>${t('checks.pairs')}</h3>
${tableView([t('checks.col.pair'), t('checks.col.tested'), t('checks.col.unavailable'), t('checks.col.residualPct'), t('checks.col.median'), t('checks.col.p90'), t('checks.col.max')], ic.pairs.map((p) => [`${p.ba} · ${p.neighbor}`, whole(p.hours_tested), whole(p.hours_unavailable), pct(p.residual_pct), whole(p.median_mwh), whole(p.p90_mwh), whole(p.max_mwh)]), t('checks.pairsCaption', { year: ic.year }))}
<h3>${t('checks.totals')}</h3>
<p>${t('checks.totalsNote')}</p>
${tableView([t('checks.col.ba'), t('checks.col.tested'), t('checks.col.unavailable'), t('checks.col.reported'), t('checks.col.adjusted'), t('checks.col.leading')], ic.totals.map((x) => [x.ba, whole(x.hours_tested), whole(x.hours_unavailable), pct(x.reported_residual_pct), pct(x.adjusted_residual_pct), x.leading_reading]), t('checks.totalsCaption', { year: ic.year }))}
<p class="unit-hint">${t('checks.files', { list: ic.raw.map((r) => `${r.name} (SHA-256 ${r.sha256})`).join('; '), version: ic.version })} ${ic.attribution}</p>
</section>` : ''}
${c.reliability ? html`<section data-checks-reliability><h2>${t('checks.reliability', { year: c.reliability.year })}</h2>
<p>${t('checks.reliabilityNote')} <a href="${c.reliabilityCite}">${t('checks.cite')}</a></p>
${tableView([t('checks.col.group'), t('checks.col.utilities'), t('checks.col.customers'), t('checks.col.share')], c.reliability.rows.map((r) => [group(r.group), whole(r.utilities), r.customers === null ? t('checks.notReported') : whole(r.customers), r.share === null ? '' : `${(r.share * 100).toFixed(1)}%`]), t('checks.reliabilityCaption', { year: c.reliability.year }))}
</section>` : ''}
<section data-checks-missing><h2>${t('checks.missing')}</h2>
${tableView([t('checks.col.dataset'), t('checks.col.field'), t('checks.col.rows'), t('checks.col.missingRows'), t('checks.col.share'), t('checks.col.tools')], c.missing.map((m) => [`${m.dataset} ${m.version}`, `${m.table}.${m.field}`, whole(m.rows), whole(m.missing), `${(m.share * 100).toFixed(2)}%`, m.tools.join('; ')]), t('checks.missingCaption'))}
</section>
<section data-checks-deferred><h2>${t('checks.deferred')}</h2>
<ul>${c.deferred.map((d) => html`<li><strong>${d.check}.</strong> ${d.reason} <a href="${d.url}">${d.benchmark}</a></li>`)}</ul>
</section>`;
  return layout({ i18n, title: pageTitle(t('checks.title')), description: t('checks.description'), path: CHECKS_PATH, body, section: 'data' });
}
