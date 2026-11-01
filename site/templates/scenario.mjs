// The scenario model's pages (add-grid-scenario-model): one per balancing
// authority, with the screening label and omissions first, the backtest
// rendered at build and again on the device, the fleet with its gaps and
// downloads, and the what-if controls, which open only after the device's
// own backtest has been shown. The index publishes the fit table.

import { html } from '../lib/html.mjs';
import { layout } from './layout.mjs';
import { pageTitle } from '../lib/meta.mjs';
import { balancingPath } from './balancing.mjs';
import { PLAUSIBLE } from '../../core/lib/fleet.mjs';
import { clock } from '../ui/cleanest-picker.mjs';
import { PUBLISHED_MARGINAL, SCENARIO_INDEX, backtestTable, causesList, pct, scenarioPath, screeningBlock, share } from '../ui/scenario.mjs';

const whole = (x) => Math.round(x).toLocaleString('en-US');

/** @param {{region: any, year: number, versions: any, i18n: any}} p */
export function scenarioPage({ region: r, year, versions, i18n }) {
  const { t } = i18n;
  const s = r.fleet.summary;
  const body = html`<p class="cell-section">${t('scenario.kicker', { code: r.ba, year })}</p>
<h1>${t('scenario.pageTitle', { name: r.name })}</h1>
${screeningBlock(i18n)}
<section data-backtest-section><h2>${t('scenario.backtest', { year })}</h2>
<p>${t('scenario.backtestIntro', { year })}</p>
<div data-backtest-result>${backtestTable(r.backtest, i18n)}</div>
<p>${t('scenario.hours', { hours: whole(r.backtest.hours), excluded: whole(r.backtest.excluded) })}</p>
${r.unmet.hours ? html`<p data-scenario-unmet>${t('scenario.unmet', { hours: whole(r.unmet.hours), max: whole(r.unmet.max) })}</p>` : ''}
<p class="unit-hint">${t('scenario.time', { zone: r.zone })}</p>
<p class="unit-hint">${t('scenario.unverified')}</p>
${causesList(r, i18n)}
</section>
<section data-scenario data-ba="${r.ba}" data-zone="${r.zone}" data-shard="${r.shard.path}" data-fleet="${scenarioPath(r.ba)}fleet.json"><h2>${t('scenario.try')}</h2>
<p data-scenario-waiting>${t('scenario.waiting')}</p>
<form data-scenario-form hidden novalidate>
  <fieldset><legend>${t('scenario.retire')}</legend>
    <div class="field"><label for="sc-retire">${t('scenario.retire')}</label><select id="sc-retire" name="retire" multiple size="6"></select></div>
  </fieldset>
  <fieldset><legend>${t('scenario.add')}</legend><div class="picker-row">
    <div class="field"><label for="sc-name">${t('scenario.addName')}</label><input id="sc-name" name="addName"></div>
    <div class="field"><label for="sc-mw">${t('scenario.addMw')}</label><input id="sc-mw" name="addMw" inputmode="decimal" class="mono"></div>
    <div class="field"><label for="sc-fuel">${t('scenario.addFuel')}</label><select id="sc-fuel" name="addFuel"><option value="gas">${t('scenario.fuel.gas')}</option><option value="coal">${t('scenario.fuel.coal')}</option><option value="oil">${t('scenario.fuel.oil')}</option></select></div>
    <div class="field"><label for="sc-cost">${t('scenario.addCost')}</label><input id="sc-cost" name="addCost" inputmode="decimal" class="mono"></div>
    <div class="field"><label for="sc-co2">${t('scenario.addCo2')}</label><input id="sc-co2" name="addCo2" inputmode="decimal" class="mono"></div>
  </div></fieldset>
  <div class="picker-row">
    <div class="field"><label for="sc-solar">${t('scenario.solar')}</label><input id="sc-solar" name="solar" inputmode="decimal" class="mono" value="1"></div>
    <div class="field"><label for="sc-wind">${t('scenario.wind')}</label><input id="sc-wind" name="wind" inputmode="decimal" class="mono" value="1"></div>
    <div class="field"><label for="sc-floor">${t('scenario.floor')}</label><input id="sc-floor" name="floor" inputmode="decimal" class="mono"></div>
    <div class="field"><label for="sc-outage">${t('scenario.outageRate')}</label><input id="sc-outage" name="outage" inputmode="decimal" class="mono"></div>
  </div>
  <p><button class="button" type="submit">${t('scenario.run')}</button> <button class="button" type="reset">${t('scenario.reset')}</button></p>
</form>
<div data-scenario-result aria-live="polite"></div>
<section data-marginal hidden><h3>${t('scenario.marginalTitle')}</h3>
  <div class="picker-row"><div class="field"><label for="sc-day">${t('scenario.marginalDay')}</label><input id="sc-day" name="day" type="date" min="${year}-01-01" max="${year}-12-31" value="${year}-07-15"></div>
  <div class="field"><label for="sc-hour">${t('scenario.marginalPick')}</label><select id="sc-hour" name="hour">${Array.from({ length: 24 }, (_, h) => html`<option value="${h}" ${h === 18 ? 'selected' : ''}>${clock(h)}</option>`)}</select></div></div>
  <p data-marginal-hour></p>
  <div data-marginal-mix></div>
  <p class="unit-hint">${t('scenario.marginalPublished')} <a href="${PUBLISHED_MARGINAL}">${t('scenario.cambium')}</a></p>
</section>
<p class="unit-hint">${t('scenario.noAdequacy')} <a href="/limits/#adequacy">${t('scenario.adequacyLink')}</a></p>
</section>
<section><h2>${t('scenario.fleet')}</h2>
<p data-fleet-summary>${t('scenario.fleetSummary', { units: whole(r.fleet.units.length), placed: whole(s.placed_mw), coal: whole(s.by_class.coal), gas: whole(s.by_class.gas), oil: whole(s.by_class.oil), recorded: whole(s.recorded_mw) })}</p>
<p data-fleet-shares>${t('scenario.shares', { plant: share(s.plant_rate_share), group: share(s.derived_share), substituted: share(s.substituted_share) })}</p>
${r.fleet.unplaceable.length ? html`<p>${t('scenario.unplaceable', { count: whole(r.fleet.unplaceable.length), mw: whole(s.unplaceable_mw) })}</p>
<ul data-unplaceable>${r.fleet.unplaceable.map((u) => html`<li>${t('scenario.missing', { name: u.plant_name, id: u.id, mw: whole(u.capacity_mw ?? 0), missing: u.missing.join(', ') })}</li>`)}</ul>` : ''}
<p><a href="${scenarioPath(r.ba)}fleet.csv" download>${t('scenario.download')}</a> <a href="${scenarioPath(r.ba)}fleet.json">${t('scenario.downloadJson')}</a></p>
<details><summary>${t('scenario.method')}</summary><p>${t('scenario.methodText', { low: PLAUSIBLE.lowCombinedCycle, high: PLAUSIBLE.high })}</p></details>
<p class="unit-hint">${t('scenario.versions', { eia860: versions['eia-860'], eia923: versions['eia-923'], eia930: versions['eia-930'] })}</p>
<p><a href="${balancingPath(r.ba)}">${r.name}</a> · <a href="${SCENARIO_INDEX}">${t('scenario.fit')}</a></p>
</section>`;
  return layout({ i18n, title: pageTitle(t('scenario.docTitle', { code: r.ba })), description: t('scenario.description', { name: r.name, code: r.ba, year }), path: scenarioPath(r.ba), body, section: 'grid', modules: ['/site/pages/scenario.js'] });
}

/** @param {{data: any, i18n: any}} p */
export function scenarioIndexPage({ data, i18n }) {
  const { t } = i18n;
  const v = data.versions;
  const body = html`<h1>${t('scenario.title')}</h1>
<p class="sentence">${t('scenario.indexDescription', { year: data.year })}</p>
${screeningBlock(i18n)}
<section><h2>${t('scenario.fit')}</h2>
<p>${t('scenario.fitIntro', { year: data.year })}</p>
<div class="table-wrap"><table data-fit>
  <thead><tr><th scope="col">${t('scenario.col.region')}</th><th scope="col" class="num">${t('scenario.col.placed')}</th><th scope="col" class="num">${t('scenario.col.coalBias')}</th><th scope="col" class="num">${t('scenario.col.gasBias')}</th><th scope="col" class="num">${t('scenario.col.maeAll')}</th><th scope="col" class="num">${t('scenario.col.marginal')}</th><th scope="col" class="num">${t('scenario.col.substituted')}</th></tr></thead>
  <tbody>${data.regions.map((r) => html`<tr data-fit-row="${r.ba}"><th scope="row"><a href="${scenarioPath(r.ba)}">${r.name}</a> <span class="mono">${r.ba}</span></th><td class="num">${whole(r.fleet.summary.placed_mw)}</td>
    <td class="num">${pct(r.backtest.fuels.coal.bias) ?? t('scenario.noPercent')}</td><td class="num">${pct(r.backtest.fuels.gas.bias) ?? t('scenario.noPercent')}</td><td class="num">${r.backtest.overall.mae === null ? '' : share(r.backtest.overall.mae)}</td>
    <td class="num">${r.backtest.marginalMatch === null ? '' : share(r.backtest.marginalMatch)}</td><td class="num">${share(r.fleet.summary.substituted_share)}</td></tr>`)}</tbody>
</table></div>
<ul class="unit-hint"><li>${t('scenario.def.bias')}</li><li>${t('scenario.def.mae')}</li><li>${t('scenario.def.marginal')}</li></ul>
<p class="unit-hint">${t('scenario.versions', { eia860: v['eia-860'], eia923: v['eia-923'], eia930: v['eia-930'] })} <a href="${SCENARIO_INDEX}fit.json">${t('scenario.fitJson')}</a></p>
<p class="unit-hint">${t('scenario.unverified')}</p>
</section>`;
  return layout({ i18n, title: pageTitle(t('scenario.title')), description: t('scenario.indexDescription', { year: data.year }), path: SCENARIO_INDEX, body, section: 'grid' });
}
