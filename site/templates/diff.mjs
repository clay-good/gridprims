// A dataset version's diff page (add-data-continuity-ledger: snapshot diffs):
// files by checksum, columns, rows, keyed changes, the largest changes, and
// how far revised values moved, against the version before, in neutral words.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const diffPath = (id, version) => `/data/${id}/${version}/diff/`;
const whole = (x) => (x === null || x === undefined ? '' : Math.round(x).toLocaleString('en-US'));
const num = (x) => (typeof x === 'number' ? x.toLocaleString('en-US', { maximumSignificantDigits: 6 }) : String(x ?? ''));

/** @param {{diff: any, entry: any, i18n: any}} p */
export function diffPage({ diff: d, entry, i18n }) {
  const { t, date } = i18n;
  const f = d.files;
  const policy = entry?.revisionPolicy ?? entry?.sourceUrl;
  const body = html`<p class="cell-section">${t('diff.kicker', { id: d.dataset })}</p>
<h1>${t('diff.title', { from: d.from.version, to: d.to.version })}</h1>
<p class="sentence" data-diff-files>${t('diff.files', { added: whole(f.added.length), removed: whole(f.removed.length), changed: whole(f.changed.length), unchanged: whole(f.unchanged) })}</p>
<p class="unit-hint">${t('diff.dates', { fromAsOf: date(d.from.asOf), toAsOf: date(d.to.asOf) })} <a href="/data/${d.dataset}/${d.to.version}/diff.json">${t('diff.json')}</a></p>
<p>${t('diff.neutral')} <a href="${policy}">${t('diff.policy')}</a></p>
${d.tables.map((tb) => html`<section data-diff-table="${tb.name}"><h2>${tb.name}</h2>
<p>${t('diff.rows', { before: whole(tb.rows.before), after: whole(tb.rows.after), delta: tb.rows.delta === null ? '' : `${tb.rows.delta >= 0 ? '+' : '−'}${whole(Math.abs(tb.rows.delta))}` })}</p>
${tb.changes && !tb.changes.first ? html`<p>${t('diff.keyed', { added: whole(tb.changes.added), removed: whole(tb.changes.removed), changed: whole(tb.changes.changed) })}</p>` : ''}
${tb.columns.added.length ? html`<p data-diff-added>${t('diff.colsAdded', { list: tb.columns.added.join(', ') })}</p>` : ''}
${tb.columns.removed.length ? html`<p data-diff-removed>${t('diff.colsRemoved', { list: tb.columns.removed.join(', ') })}</p>` : ''}
${tb.columns.renamed.map((r) => html`<p data-diff-renamed>${t('diff.colRenamed', { from: r.from, to: r.to })}</p>`)}
${tb.columns.unit.map((u) => html`<p data-diff-unit>${t('diff.colUnit', { name: u.name, from: u.from ?? '', to: u.to ?? '' })}</p>`)}
${tb.changes?.revisions?.count ? html`<p data-diff-revisions>${t('diff.revisions', { count: whole(tb.changes.revisions.count), median: num(tb.changes.revisions.median), p90: num(tb.changes.revisions.p90), max: num(tb.changes.revisions.max) })}${tb.changes.revisions.periods?.length ? ` ${t('diff.periods', { list: tb.changes.revisions.periods.join(', ') })}` : ''}</p>` : ''}
${tb.changes?.largest?.length ? html`<ul>${tb.changes.largest.map((x) => html`<li class="mono">${t('library.largest', { key: x.key, from: x.from ?? '', to: x.to ?? '' })}</li>`)}</ul>` : ''}
${tb.changes?.by?.length ? html`<ul>${tb.changes.by.map((g) => html`<li class="mono">${t('library.revisedBy', { group: g.group, changed: whole(g.changed), added: whole(g.added), removed: whole(g.removed), first: g.first, last: g.last })}</li>`)}</ul>` : ''}
</section>`)}
${d.tablesRemoved.length ? html`<p data-diff-tables-removed>${t('diff.tablesRemoved', { list: d.tablesRemoved.join(', ') })}</p>` : ''}`;
  return layout({ i18n, title: pageTitle(t('diff.title', { from: d.from.version, to: d.to.version })), description: t('diff.description', { id: d.dataset }), path: diffPath(d.dataset, d.to.version), body, section: 'data' });
}
