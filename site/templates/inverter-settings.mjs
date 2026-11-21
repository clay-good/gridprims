// The certification and settings reference page (add-interconnection-screens 5.5; interconnect/equipment-
// reference): the certification generations and the mismatch question first, then published defaults in our
// own grouping, each cited to the sheet that prints it, the jurisdictions whose rule points elsewhere, and the
// parameters omitted for want of a free source, with where they are defined.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';

export const SETTINGS_PATH = '/interconnect/inverter-settings/';

const cite = (c, t) => html`<p class="unit-hint" data-cite>${t('inv.source')} <a href="${c.url}">${c.publisher}, ${c.document}</a>, ${c.locator}.</p>`;

/** @param {{data: typeof import('../../data/curated/inverter-settings.mjs'), i18n: any}} p */
export function inverterSettingsPage({ data, i18n }) {
  const { t, date } = i18n;
  const body = html`<h1>${t('inv.title')}</h1>
<p class="purpose">${t('inv.intro')}</p>
<p class="strip" data-not-reproduced>${t('inv.notReproduced')}</p>
<section data-certification><h2 id="certification">${t('inv.certTitle')}</h2>
${data.CERTIFICATION.explained.map((p) => html`<p>${p}</p>`)}
<p data-mismatch><strong>${t('inv.mismatchLead')}</strong> ${data.CERTIFICATION.mismatch}</p>
${data.CERTIFICATION.cites.map((c) => cite(c, t))}
</section>
<section><h2 id="defaults">${t('inv.defaultsTitle')}</h2>
<p>${t('inv.defaultsIntro')}</p>
${data.SETTINGS.map((g) => html`<div class="panel" data-setting-group="${g.id}"><h3>${g.group} <span class="mono">${g.jurisdiction}</span></h3>
<dl>${g.rows.map((r) => html`<div><dt>${r.what}</dt><dd>${r.value}</dd></div>`)}</dl>
${cite(g.cite, t)}</div>`)}
</section>
<section><h2 id="elsewhere">${t('inv.elsewhereTitle')}</h2>
${data.POINTS_ELSEWHERE.map((e) => html`<div data-points-elsewhere="${e.jurisdiction}"><p><strong>${e.utility} (${e.jurisdiction}).</strong> ${e.says}</p>${cite(e.cite, t)}</div>`)}
</section>
<section><h2 id="omitted">${t('inv.omittedTitle')}</h2>
<ul>${data.OMITTED.map((o) => html`<li data-omitted><strong>${o.what}.</strong> ${t('inv.definedIn', { where: o.where })} ${o.why}</li>`)}</ul>
</section>
<p class="unit-hint">${t('inv.checked', { date: date(data.CHECKED) })}</p>`;
  return layout({ i18n, title: pageTitle(t('inv.title')), description: t('inv.description'), path: SETTINGS_PATH, body, section: 'grid' });
}
