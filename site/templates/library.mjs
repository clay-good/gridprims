// The data library's parts (add-public-grid-data: data library): the list of
// every dataset with its status, and, on each dataset page, its versions,
// changelog, per-file licenses, stable URLs, and a citation to copy.

import { html } from '../lib/html.mjs';
import { GLYPHS } from '../ui/glyphs.mjs';
import { lateness } from '../../core/lib/lateness.mjs';
import { ORIGIN } from '../config.mjs';

const whole = (x) => Math.round(x).toLocaleString('en-US');
const periods = (m) => [...new Set(m.tables.map((t) => t.dataPeriod))].join(', ');

/** "Waiting on publisher", revealed on the device once the next release is late. */
function waiting(m, { t, date }) {
  const late = lateness(m);
  return html`<p class="warning-chip" data-late-from="${late.lateFrom}" hidden>${GLYPHS.diamond} ${t(late.posted ? 'library.waitingPosted' : 'library.waiting', { due: date(late.due), checked: date(m.retrieved) })}</p>`;
}

/** @param {{datasets: any[], entries: Map<string, any>, i18n: any}} p */
export function libraryList({ datasets, entries, i18n }) {
  const { t, date } = i18n;
  return html`<ul class="tool-list">${datasets.map((m) => {
    const e = entries.get(m.dataset);
    const rows = m.tables.reduce((n, x) => n + x.rows, 0);
    return html`<li class="tool-cell" data-library="${m.dataset}"><p class="cell-section">${m.publisher}</p><a href="/data/${m.dataset}/">${m.title}</a>
  <p>${e?.description?.contains ?? ''}</p>
  <dl class="facts mono">
    <div><dt>${t('library.license')}</dt><dd>${[...new Set(m.tables.map((x) => x.license))].join(', ')}</dd></div>
    <div><dt>${t('library.period')}</dt><dd>${periods(m)}</dd></div>
    <div><dt>${t('library.asOf')}</dt><dd>${date(m.asOf)}</dd></div>
    <div><dt>${t('library.retrieved')}</dt><dd>${date(m.retrieved)}</dd></div>
    <div><dt>${t('library.cadence')}</dt><dd>${t(`library.every.${m.cadence.every}`)}</dd></div>
    <div><dt>${t('library.rows')}</dt><dd>${whole(rows)}</dd></div>
  </dl>
  <p class="unit-hint">${t('library.credit', { credit: m.attribution })}</p>
  ${waiting(m, i18n)}</li>`;
  })}</ul>`;
}

/** A citation naming the publisher first, then gridprims as the redistributor, with the version and checksum. */
export function citation(m, sha, { t, date }) {
  return t('library.cite', { publisher: m.publisher, title: m.title, period: periods(m), asOf: date(m.asOf), version: m.version, sha, url: `${ORIGIN}/data/${m.dataset}/${m.version}/` });
}

/** The library parts of a dataset page. @param {{manifest: any, entry: any, versions: any[], shas: Record<string, string>, i18n: any}} p */
export function libraryParts({ manifest: m, entry, versions, shas, i18n }) {
  const { t, date } = i18n;
  const change = (c) => (c.first ? t('library.first') : t('library.changes', { from: c.from, added: whole(c.added), removed: whole(c.removed), changed: whole(c.changed) }));
  return {
    // The page's own source stamp carries the late note; "waiting on publisher" is the library list's.
    about: html`${entry?.description ? html`<p>${entry.description.contains}</p><p>${t('library.excludes', { what: entry.description.excludes })}</p>` : ''}`,
    perTable: (tb) => html`<p class="unit-hint">${t('library.fileLicense', { license: tb.license })} ${tb.credits.map((c) => c.attribution).join(' ')}</p>
<p class="unit-hint" data-changes>${change(tb.changes ?? { first: true })}</p>
${tb.changes?.largest?.length ? html`<ul>${tb.changes.largest.map((x) => html`<li class="mono">${t('library.largest', { key: x.key, from: x.from ?? '', to: x.to ?? '' })}</li>`)}</ul>` : ''}
${tb.changes?.by?.length ? html`<ul data-revised-by>${tb.changes.by.map((g) => html`<li class="mono">${t('library.revisedBy', { group: g.group, changed: whole(g.changed), added: whole(g.added), removed: whole(g.removed), first: g.first, last: g.last })}</li>`)}</ul>` : ''}`,
    urls: html`<h3>${t('library.urlsTitle')}</h3>
<p class="mono">${t('library.urls', { permanent: `/data/${m.dataset}/${m.version}/<file>`, latest: `/data/${m.dataset}/latest/<file>` })}</p>
<p>${t('library.urlsNote')} <a href="/developers/#data-api">${t('library.urlsDocs')}</a></p>`,
    cite: html`<h3>${t('library.citeTitle')}</h3><pre class="mono report-preview" data-citation>${citation(m, shas[m.version], i18n)}</pre>`,
    versions: html`<section><h2>${t('library.versions')}</h2>
<div class="table-wrap"><table><caption>${t('library.versions')}</caption>
<thead><tr><th scope="col">${t('library.version')}</th><th scope="col">${t('library.period')}</th><th scope="col">${t('library.retrieved')}</th><th scope="col">${t('library.manifest')}</th></tr></thead>
<tbody>${versions.map((v) => html`<tr><th scope="row">${v.version}${v.version === m.version ? html` <span class="unit-hint">${t('library.current')}</span>` : ''}</th><td>${periods(v)}</td><td>${date(v.retrieved)}</td><td class="mono"><a href="/data/${m.dataset}/${v.version}/manifest.json">${t('library.manifestFile')}</a> ${shas[v.version]}${v.previousVersion ? html`<br><a href="/data/${m.dataset}/${v.version}/diff/">${t('diff.link')}</a>` : ''}</td></tr>`)}</tbody>
</table></div></section>`,
  };
}

/**
 * schema.org Dataset markup for a library page: the creator, license, data period, and each download
 * with its SHA-256, all of which the page shows. No ratings, reviews, or prices.
 */
export function datasetLd(m, manifestSha, publishes = true) {
  const years = [...new Set(m.tables.flatMap((t) => t.dataPeriod.split('-').filter((x) => /^\d{4}$/.test(x))))].sort();
  return {
    '@context': 'https://schema.org', '@type': 'Dataset', name: m.title, url: `${ORIGIN}/data/${m.dataset}/`, version: m.version,
    creator: { '@type': 'Organization', name: m.publisher }, publisher: { '@type': 'Organization', name: 'gridprims' },
    license: m.tables[0].license === 'CC-BY-4.0' ? 'https://creativecommons.org/licenses/by/4.0/' : m.license,
    temporalCoverage: years.length > 1 ? `${years[0]}/${years.at(-1)}` : years[0] ?? m.tables[0].dataPeriod,
    dateModified: m.retrieved, isBasedOn: m.sourceUrl, identifier: `sha256:${manifestSha}`,
    // Under the link posture no file is offered, so none is listed.
    distribution: !publishes ? undefined : m.tables.filter((t) => t.download).map((t) => ({ '@type': 'DataDownload', name: t.title ?? t.name, encodingFormat: 'text/csv', contentUrl: `${ORIGIN}/data/${m.dataset}/${m.version}/${t.download.path}`, sha256: t.download.sha256 })),
  };
}
