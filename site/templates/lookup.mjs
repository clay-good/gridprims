// The ZIP and county lookup page (add-public-grid-data: utility lookup). The
// form works on the device: the page script fetches the prefix table and only
// the state shard a ZIP needs, so the ZIP is never sent.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { sourceStamp } from '../ui/source-stamp.mjs';
import { STATE_NAMES } from '../entities/regions.mjs';

export const LOOKUP_PATH = '/lookup/';

/** @param {{i18n: any, sources: any}} p */
export function lookupPage({ i18n, sources }) {
  const { t } = i18n;
  const body = html`<h1>${t('lookup.title')}</h1>
<p class="purpose">${t('lookup.purpose')}</p>
<form class="panel" data-lookup-zip novalidate>
  <label for="lookup-zip">${t('lookup.zipLabel')}</label>
  <input id="lookup-zip" name="zip" class="mono" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="lookup-zip-hint lookup-zip-error">
  <p id="lookup-zip-hint" class="unit-hint">${t('lookup.zipHint')}</p>
  <p id="lookup-zip-error" class="field-error" data-zip-error role="alert"></p>
  <button class="button" type="submit">${t('lookup.find')}</button>
</form>
<form class="panel" data-lookup-county novalidate>
  <label for="lookup-state">${t('lookup.stateLabel')}</label>
  <select id="lookup-state" name="state"><option value="">${t('lookup.chooseState')}</option>${Object.entries(STATE_NAMES).map(([code, name]) => html`<option value="${code}">${name}</option>`)}</select>
  <label for="lookup-county">${t('lookup.countyLabel')}</label>
  <select id="lookup-county" name="county" disabled><option value="">${t('lookup.chooseStateFirst')}</option></select>
  <button class="button" type="submit">${t('lookup.find')}</button>
</form>
<section data-lookup-result aria-live="polite"></section>
<p class="strip">${t('lookup.privacy')}</p>
${sourceStamp(sources.zcta, sources.zcta.tables[0], i18n)}
${sourceStamp(sources.eia861, sources.eia861.tables.find((x) => x.name === 'service_territory'), i18n)}
${sources.egrid ? sourceStamp(sources.egrid, sources.egrid.tables.find((x) => x.name === 'zip_subregions'), i18n) : ''}`;
  return layout({ i18n, title: `${t('lookup.title')} · ${t('site.name')}`, description: t('lookup.purpose'), path: LOOKUP_PATH, body, section: 'bills', modules: ['/site/pages/lookup.js'] });
}
