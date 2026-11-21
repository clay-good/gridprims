// The accuracy scorecard page (add-tariff-conformance-suite 3.1 to 3.4 and 3.6): why there is no single
// score, our engine's counts beside the open tariff database's with the same breakdowns, every compared
// schedule in alphabetical order (never ranked) with both figures, the difference, the arithmetic, and
// neutral wording, and every untestable schedule with why.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { GROUND_TRUTH_PATH } from '../entities/ground-truth.mjs';
import { BINS } from '../../pipeline/lib/scorecard.mjs';

export const SCORECARD_PATH = `${GROUND_TRUTH_PATH}scorecard/`;
const usd = (n) => `$${n.toFixed(2)}`;
const signed = (n, f) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${f(Math.abs(n))}`;

/** @param {{card: any, engine: any, versions: any, i18n: any}} p */
export function scorecardPage({ card, engine, versions, i18n }) {
  const { t, date } = i18n;
  const row = (label, a, b) => html`<tr><th scope="row">${label}</th><td class="num mono">${a}</td><td class="num mono">${b}</td></tr>`;
  const c = card.counts;
  const entry = (e) => {
    const shown = e.levels.find((l) => l.kwh === 1000) ?? e.levels[0];
    return html`<section class="panel" data-scorecard-entry="${e.state}|${e.utility}|${e.schedule ?? ''}" data-wording="${e.wording.kind}">
<h3>${e.utility}${e.schedule ? `, ${e.schedule}` : ''} <span class="mono">${e.state}</span></h3>
<p data-wording-text>${e.wording.text}</p>
<p class="unit-hint">${t('sc.sources', { publisher: e.publisher })} <a href="${e.documentUrl}">${e.document}</a>. ${t('sc.record')} <a href="${e.urdb.url}">${e.urdb.name}</a> (${e.urdb.effective ? t('sc.effective', { date: date(e.urdb.effective) }) : t('sc.noEffective')}). ${e.why}.</p>
<div class="table-wrap"><table data-levels><caption>${t('sc.levelsCaption', { month: e.month })}</caption>
<thead><tr><th scope="col" class="num">${t('sc.kwh')}</th><th scope="col" class="num">${t('sc.commission')}</th><th scope="col" class="num">${t('sc.database')}</th><th scope="col" class="num">${t('sc.difference')}</th><th scope="col" class="num">${t('sc.percent')}</th><th scope="col">${t('sc.within')}</th></tr></thead>
<tbody>${e.levels.map((l) => html`<tr data-kwh="${l.kwh}" data-agree="${l.agree}"><th scope="row" class="num mono">${l.kwh.toLocaleString('en-US')}</th><td class="num mono">${usd(l.commission)}</td><td class="num mono">${usd(l.database)}</td><td class="num mono">${signed(l.difference, usd)}</td><td class="num mono">${signed(l.percent, (x) => `${x.toFixed(1)}%`)}</td><td>${l.agree ? t('sc.yes') : t('sc.no')}</td></tr>`)}</tbody>
</table></div>
<details><summary>${t('sc.arithmetic', { kwh: shown.kwh.toLocaleString('en-US') })}</summary>
<div class="picker-row">
<div><h4>${t('sc.databaseLines')}</h4><ul data-arithmetic>${shown.arithmetic.map((a) => html`<li class="mono">${a.label}${a.kwh !== undefined ? `: ${a.kwh.toLocaleString('en-US')} kWh × $${a.rate}` : ''} = ${usd(a.amount)}</li>`)}</ul>${e.notes.length ? html`<p class="unit-hint">${e.notes.join(' ')}</p>` : ''}</div>
${shown.commissionLines ? html`<div><h4>${t('sc.commissionLines', { page: shown.page })}</h4><ul data-commission-lines>${shown.commissionLines.map((a) => html`<li class="mono">${a.label} = ${usd(a.amount)}</li>`)}</ul></div>` : ''}
</div></details>
${e.finding?.reported ? html`<p class="unit-hint" data-reported>${t('sc.reported', { date: date(e.finding.reported.date) })}</p>` : ''}
</section>`;
  };
  const body = html`<h1>${t('sc.title')}</h1>
<p class="purpose">${t('sc.intro')}</p>
<p class="strip" data-limits>${t('gt.limits')}</p>
<p data-no-composite>${t('sc.noComposite')}</p>
<div class="table-wrap"><table data-side-by-side><caption>${t('sc.sideCaption')}</caption>
<thead><tr><th scope="col"></th><th scope="col" class="num">${t('sc.colDatabase')}</th><th scope="col" class="num">${t('sc.colEngine')}</th></tr></thead>
<tbody>
${row(t('sc.rowTested'), c.schedules.tested, engine.schedules.tested)}
${row(t('sc.rowUntestable'), c.schedules.untestable, engine.schedules.untestable)}
${row(t('sc.rowFigures'), c.figures.figures, engine.figures.figures)}
${row(t('sc.rowAgree'), c.figures.agree, engine.figures.agree)}
${row(t('sc.rowDisagree'), c.figures.disagree, engine.figures.disagree)}
${row(t('sc.rowHigher'), c.direction.higher, engine.direction.higher)}
${row(t('sc.rowLower'), c.direction.lower, engine.direction.lower)}
${BINS.map(([b, label]) => row(t('sc.rowBin', { bin: label }), c.size[b], engine.size[b]))}
${Object.keys(c.byChargeType).map((type) => row(t('sc.rowType', { type: t(`gt.type.${type}`) }), `${c.byChargeType[type].disagree} / ${c.byChargeType[type].figures}`, `${engine.byChargeType[type].disagree} / ${engine.byChargeType[type].figures}`))}
</tbody></table></div>
<p class="unit-hint">${t('sc.engineNote')}</p>
<p class="unit-hint">${t('sc.versions', { urdb: versions.urdb, release: versions.vectors ?? '' })} <a href="${SCORECARD_PATH}scorecard.json">${t('sc.download')}</a> <a href="${SCORECARD_PATH}results.csv" download>${t('sc.resultsCsv')}</a> <a href="${SCORECARD_PATH}rates.csv" download>${t('sc.ratesCsv')}</a></p>
<p class="unit-hint">${t('sc.rerun')}</p>
<h2 id="schedules">${t('sc.schedules')}</h2>
<p class="strip" data-limits>${t('gt.limits')}</p>
${card.entries.map(entry)}
<h2 id="untestable">${t('sc.untestable', { n: card.untestable.length })}</h2>
<ul data-untestable>${card.untestable.map((u) => html`<li>${u.state}, ${u.utility}${u.schedule ? `, ${u.schedule}` : ''}: ${u.why}</li>`)}</ul>`;
  return layout({ i18n, title: pageTitle(t('sc.title')), description: t('sc.description'), path: SCORECARD_PATH, body, section: 'data' });
}
