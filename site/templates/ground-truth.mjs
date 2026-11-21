// The regulator ground-truth page (add-tariff-conformance-suite 1.4 and 1.5):
// the limits sentence first, then coverage by state with every absence and
// its reason, then each commission's figures by utility and consumption
// level, each row with its page and the document linked, and the downloads.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { GROUND_TRUTH_PATH } from '../entities/ground-truth.mjs';
import { REPO_URL } from '../config.mjs';
import { releaseFile } from '../../pipeline/lib/vector-releases.mjs';

const usd = (n) => (n == null ? '' : n.toFixed(2));

/** @param {{documents: any[], coverage: ReturnType<typeof import('../entities/ground-truth.mjs').coverage>, release?: any, releases?: any[], i18n: any}} p */
export function groundTruthPage({ documents, coverage, release = null, releases = [], i18n }) {
  const { t, date } = i18n;
  const { totals, extraction } = coverage;
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const absent = coverage.states.filter((s) => s.status !== 'used');
  const doc = (d) => {
    const levels = [...new Set(d.rows.map((r) => r.kwh))].sort((a, b) => a - b);
    const key = (r) => `${r.utility}|${r.schedule ?? ''}`;
    const utilities = [...new Map(d.rows.map((r) => [key(r), r])).values()];
    const bill = (u, kwh) => d.rows.find((r) => key(r) === key(u) && r.kwh === kwh);
    return html`<section data-ground-truth-document="${d.state}">
<h2 id="${d.state.toLowerCase()}">${d.document.publisher}</h2>
<p class="strip" data-limits>${t('gt.limits')}</p>
<p><a href="${d.document.url}">${d.document.title}</a> (${t('gt.retrieved', { date: date(d.document.retrieved) })}, <span class="mono">${t('gt.sha256', { sha: d.document.sha256.slice(0, 12) })}</span>)</p>
<p>${t(`gt.taxes.${d.document.taxes ?? 'unstated'}`)} ${t('gt.assumptions')} ${d.document.assumptions ?? t('gt.unstated')}</p>${d.rows.some((r) => r.lines) ? html`<p class="unit-hint">${t('gt.lines')}</p>` : ''}
<p data-extraction>${t('gt.extraction', { figures: d.extraction.figures, disagreed: d.extraction.disagreed, rate: pct(d.extraction.disagreementRate), methods: d.extraction.methods.join('; ') })}</p>
${d.excluded.length ? html`<p>${t('gt.excluded')}</p><ul>${d.excluded.map((x) => html`<li>${x.utility ?? ''} ${x.kwh ?? ''} ${x.reason ?? ''}</li>`)}</ul>` : ''}
<div class="table-wrap"><table data-ground-truth-table><caption>${t('gt.caption', { publisher: d.document.publisher, date: date(d.document.asOf) })}</caption>
<thead><tr><th scope="col">${t('gt.utility')}</th><th scope="col">${t('gt.page')}</th>${levels.map((k) => html`<th scope="col" class="num">${t('gt.kwh', { kwh: k.toLocaleString('en-US') })}</th>`)}</tr></thead>
<tbody>${utilities.map((u) => html`<tr><th scope="row">${u.utility}${u.schedule ? html`, ${u.schedule}` : ''}${u.websiteSourced ? html` <span class="unit-hint" data-website-sourced>${t('gt.websiteSourced')}</span>` : ''}</th><td class="mono">${u.page}</td>${levels.map((k) => html`<td class="num mono">${usd(bill(u, k)?.bill)}</td>`)}</tr>`)}</tbody>
</table></div>
</section>`;
  };
  const body = html`<h1>${t('gt.title')}</h1>
<p class="purpose">${t('gt.intro')}</p>
<p class="strip" data-limits>${t('gt.limits')}</p>
<p class="sentence" data-coverage-totals>${t('gt.totals', { states: totals.states, commissions: totals.commissions, utilities: totals.utilities, levels: totals.levels.map((k) => k.toLocaleString('en-US')).join(', '), figures: totals.figures, absent: totals.absent })}</p>
<p data-error-rate>${t('gt.errorRate', { figures: extraction.figures, disagreed: extraction.disagreed, rate: pct(extraction.rate) })}</p>
<p><a href="${GROUND_TRUTH_PATH}ground-truth.csv" download>${t('gt.download')}</a> <a href="${GROUND_TRUTH_PATH}ground-truth.json">${t('gt.downloadJson')}</a> ${t('gt.license')}</p>
${documents.map(doc)}
${release ? html`<section data-vectors>
<h2 id="vectors">${t('gt.vectors')}</h2>
<p class="strip" data-limits>${t('gt.limits')}</p>
<p>${t('gt.vectorsIntro', { vectors: release.coverage.vectors, schedules: release.coverage.schedules, untestable: release.coverage.untestable })}</p>
<div class="table-wrap"><table data-vector-coverage><caption>${t('gt.vectorsCaption')}</caption>
<thead><tr><th scope="col">${t('gt.chargeType')}</th><th scope="col" class="num">${t('gt.vectorCount')}</th></tr></thead>
<tbody>${Object.entries(release.coverage.byChargeType).map(([type, n]) => html`<tr data-charge-type="${type}"><th scope="row">${t(`gt.type.${type}`)}</th><td class="num mono">${n}</td></tr>`)}</tbody>
</table></div>
${release.coverage.uncovered.length ? html`<p data-uncovered>${t('gt.uncovered', { types: release.coverage.uncovered.map((x) => t(`gt.type.${x}`)).join(', ') })}</p>` : ''}
${release.untestable.length ? html`<details><summary>${t('gt.untestable', { n: release.untestable.length })}</summary><ul>${release.untestable.map((u) => html`<li data-untestable>${u.utility}, ${u.schedule}: ${u.why.join('; ')}</li>`)}</ul></details>` : ''}
<p><a href="${GROUND_TRUTH_PATH}vectors.json">${t('gt.vectorsDownload')}</a> <a href="${REPO_URL}/blob/main/docs/formats/bill-test-vector.md">${t('gt.vectorsFormat')}</a></p>
<p>${t('gt.releasesIntro')}</p>
${releases.length ? html`<h3>${t('gt.releasesCaption')}</h3>
<ul data-releases>${[...releases].reverse().map((e) => html`<li data-release="${e.version}"><a href="${GROUND_TRUTH_PATH}vectors/${releaseFile(e.version)}">${e.version}</a>, ${date(e.date)}, ${t('gt.releaseVectors', { n: e.vectors })}: ${e.summary} <span class="mono unit-hint">${t('gt.sha256', { sha: e.sha256.slice(0, 12) })}</span></li>`)}</ul>
<p><a href="${GROUND_TRUTH_PATH}vectors/changelog.json">${t('gt.changelogJson')}</a></p>` : ''}
</section>` : ''}
<section>
<h2 id="coverage">${t('gt.coverage')}</h2>
<p class="strip" data-limits>${t('gt.limits')}</p>
<div class="table-wrap"><table data-coverage><caption>${t('gt.coverageCaption', { absent: absent.length })}</caption>
<thead><tr><th scope="col">${t('gt.state')}</th><th scope="col">${t('gt.commission')}</th><th scope="col">${t('gt.status')}</th><th scope="col">${t('gt.why')}</th><th scope="col">${t('gt.lastLooked')}</th></tr></thead>
<tbody>${coverage.states.map((s) => html`<tr data-state="${s.state}" data-status="${s.status ?? ''}"><th scope="row">${s.stateName}</th><td>${s.commission}</td><td>${s.status === 'used' ? html`<a href="#${s.state.toLowerCase()}">${t('gt.used', { utilities: s.utilities, figures: s.figures })}</a>` : s.absence}</td><td>${s.url && s.status !== 'used' ? html`<a href="${s.url}">${s.title ?? s.url}</a>. ` : ''}${s.reason ?? ''}</td><td>${s.checked ? date(s.checked) : ''}</td></tr>`)}</tbody>
</table></div>
</section>`;
  return layout({ i18n, title: pageTitle(t('gt.title')), description: t('gt.description'), path: GROUND_TRUTH_PATH, body, section: 'data' });
}
