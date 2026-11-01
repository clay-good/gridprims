// The scenario page: fetches the region's fleet and its EIA-930 hours, runs
// the unmodified dispatch and its backtest on this device and shows them, and
// only then opens the controls. A change is dispatched here too; nothing
// about it leaves the tab, except in a share link the visitor copies.

import { getJson } from './zip-utilities.js';
import { readShard } from '../../core/lib/shard.mjs';
import { applyEdits, dispatch } from '../../core/lib/dispatch.mjs';
import { againstBias, backtest } from '../../core/lib/backtest.mjs';
import { html } from '../lib/html.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';
import { backtestTable, changeTable, pct, scenarioCard } from '../ui/scenario.mjs';
import { DISPATCHED, expandUnit } from '../../core/lib/fleet.mjs';

const i18n = createI18n(strings, 'en-US');
const { t } = i18n;
const root = document.querySelector('[data-scenario]');
const form = root.querySelector('[data-scenario-form]');
const out = root.querySelector('[data-scenario-result]');
const marginal = root.querySelector('[data-marginal]');
const HOUR = 3_600_000;
const whole = (x) => Math.round(x).toLocaleString('en-US');
const money = (x) => x.toFixed(2);
const signed = (x) => `${x < 0 ? '−' : ''}${whole(Math.abs(x))}`;
const SOLAR = ['gen_sun', 'gen_snb'];
const WIND = ['gen_wnd', 'gen_wnb'];

let fleet; let rows; let units; let base; let bt; let localKeys;

/** Each row's local date and hour in the region's zone, as "YYYY-MM-DD|H". */
function keys(zone) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', hourCycle: 'h23' });
  return rows.map((r) => { const p = Object.fromEntries(f.formatToParts(new Date(r.hour * HOUR)).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}|${Number(p.hour)}`; });
}

function showMarginal() {
  const k = `${marginal.querySelector('[name="day"]').value}|${marginal.querySelector('[name="hour"]').value}`;
  const h = localKeys.indexOf(k);
  const when = `${k.split('|')[0]} ${k.split('|')[1]}:00 (${fleet.zone})`;
  const el = marginal.querySelector('[data-marginal-hour]');
  if (h < 0 || rows[h].demand === null) { el.textContent = t('scenario.marginalNone', { when, why: t('scenario.marginalExcluded') }); return; }
  const u = base.marginalUnit(h);
  if (!u) { el.textContent = t('scenario.marginalNone', { when, why: base.residual[h] <= 0 ? t('scenario.marginalSurplus') : t('scenario.marginalUnmet') }); return; }
  const m = new Date(rows[h].hour * HOUR).getUTCMonth();
  const c = u.cost[m];
  const p = u.price?.[m];
  el.textContent = t('scenario.marginalHour', {
    when, name: `${u.plant_name} ${u.id}`, fuel: t(`scenario.fuel.${u.class}`), mw: whole(u.capacity_mw), cost: money(c.value), low: money(c.low), high: money(c.high),
    co2: u.co2_t_per_mwh.toFixed(3), hr: u.heat_rate.value.toFixed(2), method: t(`scenario.method.${u.heat_rate.method}`), price: p ? money(p[0]) : '', source: p ? t(`scenario.source.${p[3]}`) : '',
  });
}

/** Marginal fuel by local hour of day, as a share of each hour's reported days. */
function marginalMix() {
  const counts = Array.from({ length: 24 }, () => Object.fromEntries([...DISPATCHED, 'none'].map((c) => [c, 0])));
  rows.forEach((r, h) => { if (r.demand === null) return; const u = base.marginalUnit(h); counts[Number(localKeys[h].split('|')[1])][u ? u.class : 'none']++; });
  return html`<h4>${t('scenario.marginalMix')}</h4><div class="table-wrap"><table data-marginal-mix-table><thead><tr><th scope="col">${t('scenario.marginalPick')}</th>${DISPATCHED.map((c) => html`<th scope="col" class="num">${t(`scenario.fuel.${c}`)}</th>`)}</tr></thead>
  <tbody>${counts.map((c, hr) => { const n = Object.values(c).reduce((a, b) => a + b, 0) || 1; return html`<tr><th scope="row">${hr}:00</th>${DISPATCHED.map((f) => html`<td class="num">${Math.round((c[f] / n) * 100)}%</td>`)}</tr>`; })}</tbody></table></div>`;
}

/** The form's change as edits and scales; refused inputs come back as a reason. */
function readForm() {
  const edits = [...form.retire.selectedOptions].map((o) => ({ kind: 'retire', id: o.value }));
  const mw = Number(form.addMw.value);
  const cost = Number(form.addCost.value);
  if (form.addMw.value) {
    if (!(mw > 0) || !(cost >= 0) || form.addCost.value === '') return { refused: t('scenario.addCost') };
    edits.push({ kind: 'add', unit: { id: 'added-1', name: form.addName.value || t('scenario.add'), capacity_mw: mw, class: form.addFuel.value, cost, co2_t_per_mwh: Number(form.addCo2.value) || 0 } });
  }
  const solar = Number(form.solar.value || 1);
  const wind = Number(form.wind.value || 1);
  return { edits, solar, wind, floor: form.floor.value === '' ? null : Number(form.floor.value), outage: form.outage.value === '' ? null : Number(form.outage.value) };
}

function fragment(f) {
  const p = new URLSearchParams();
  const retire = f.edits.filter((e) => e.kind === 'retire').map((e) => e.id);
  if (retire.length) p.set('retire', retire.join(','));
  const add = f.edits.find((e) => e.kind === 'add')?.unit;
  if (add) p.set('add', [add.name, add.capacity_mw, add.class, add.cost, add.co2_t_per_mwh].join('|'));
  if (f.solar !== 1) p.set('solar', String(f.solar));
  if (f.wind !== 1) p.set('wind', String(f.wind));
  if (f.floor !== null) p.set('floor', String(f.floor));
  return `#${p}`;
}

function fromFragment() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (![...p.keys()].length) return false;
  for (const id of (p.get('retire') ?? '').split(',').filter(Boolean)) { const o = [...form.retire.options].find((x) => x.value === id); if (o) o.selected = true; }
  const add = p.get('add')?.split('|');
  if (add?.length === 5) [form.addName.value, form.addMw.value, form.addFuel.value, form.addCost.value, form.addCo2.value] = add;
  if (p.has('solar')) form.solar.value = p.get('solar');
  if (p.has('wind')) form.wind.value = p.get('wind');
  if (p.has('floor')) form.floor.value = p.get('floor');
  return true;
}

function run() {
  const f = readForm();
  if (f.refused) { out.innerHTML = String(html`<p class="errors">${f.refused}</p>`); return; }
  const { units: edited, edits } = applyEdits(units, f.edits);
  const scale = Object.fromEntries([...SOLAR.map((c) => [c, f.solar]), ...WIND.map((c) => [c, f.wind])]);
  const sc = dispatch({ units: edited, rows, scale });
  const cmp = againstBias(base, sc, bt);
  const listed = [
    ...edits.map((e) => (e.kind === 'retire' ? t('scenario.edit.retire', { name: e.name, id: e.id, was: whole(e.was) }) : t('scenario.edit.add', { name: e.name, now: whole(e.now), fuel: t(`scenario.fuel.${e.class}`), cost: money(e.cost) }))),
    ...(f.solar !== 1 ? [t('scenario.edit.scale', { what: t('scenario.solar').replace(/ × $/, ''), now: f.solar })] : []),
    ...(f.wind !== 1 ? [t('scenario.edit.scale', { what: t('scenario.wind').replace(/ × $/, ''), now: f.wind })] : []),
  ];
  const co2 = t('scenario.co2', { t: signed(sc.co2_t - base.co2_t), pct: pct(base.co2_t ? (sc.co2_t - base.co2_t) / base.co2_t : 0), base: whole(base.co2_t), now: whole(sc.co2_t) });
  const added = edits.find((e) => e.kind === 'add');
  const addedMwh = added ? sc.unit.get(added.id) : null;
  // Net load against the floor: hours whose residual falls below it, and the energy that would not fit.
  let below = 0; let over = 0;
  if (f.floor !== null) for (let h = 0; h < rows.length; h++) { if (rows[h].demand === null) continue; if (sc.residual[h] < f.floor) { below++; over += f.floor - sc.residual[h]; } }
  const card = scenarioCard({ region: fleet, cmp, edits: listed, co2, bt }, i18n);
  out.innerHTML = String(html`<h3>${t('scenario.edits')}</h3><ul data-scenario-edits>${listed.map((x) => html`<li>${x}</li>`)}</ul>
  <h3>${t('scenario.result')}</h3>${changeTable(cmp, i18n)}
  <p class="sentence" data-scenario-co2>${co2}</p>
  <p data-scenario-unmet-change>${t('scenario.unmetChange', { base: whole(base.unmet.hours), now: whole(sc.unmet.hours) })} <a href="/limits/#adequacy">${t('scenario.adequacyLink')}</a></p>
  ${added ? html`<p data-scenario-added>${addedMwh > 0 ? t('scenario.ran', { name: added.name, gwh: (addedMwh / 1000).toFixed(1) }) : t('scenario.didNotRun', { name: added.name, cost: money(added.cost) })}</p>` : ''}
  ${f.floor !== null ? html`<p data-scenario-netload>${t('scenario.netLoad', { floor: whole(f.floor), hours: whole(below), gwh: (over / 1000).toFixed(1) })}</p>` : ''}
  ${f.outage !== null ? html`<p data-scenario-outage>${t('scenario.outageResult', { rate: f.outage, mw: whole((fleet.summary.placed_mw * f.outage) / 100), placed: whole(fleet.summary.placed_mw) })}</p><p>${t('scenario.noAdequacy')}</p>` : ''}
  <p class="strip">${t('scenario.label')}</p>
  <p><button class="button" type="button" data-scenario-copy>${t('scenario.copy')}</button> <button class="button" type="button" data-scenario-share>${t('scenario.share')}</button></p>
  <p class="unit-hint" data-share-warning>${t('scenario.shareWarning')}</p>`);
  out.querySelector('[data-scenario-copy]').addEventListener('click', async (e) => { await navigator.clipboard?.writeText(card).catch(() => {}); e.target.textContent = t('scenario.copied'); });
  out.querySelector('[data-scenario-share]').addEventListener('click', async (e) => {
    const url = `${location.origin}${location.pathname}${fragment(f)}`;
    history.replaceState(null, '', fragment(f));
    await navigator.clipboard?.writeText(url).catch(() => {});
    e.target.textContent = t('scenario.copied');
  });
  root.dataset.ran = String(Number(root.dataset.ran ?? 0) + 1);
  out.dataset.card = card;
}

async function start() {
  const [f, buf] = await Promise.all([getJson(root.dataset.fleet), fetch(root.dataset.shard).then((r) => r.arrayBuffer())]);
  fleet = f;
  rows = readShard(new Uint8Array(buf)).rows();
  units = fleet.units.map(expandUnit);
  base = dispatch({ units, rows });
  bt = backtest({ rows, run: base });
  // The device's own backtest replaces the build's, and only then do the controls open.
  root.closest('main').querySelector('[data-backtest-result]').innerHTML = String(backtestTable(bt, i18n));
  root.dataset.backtestShown = 'true';
  for (const u of [...units].sort((a, b) => b.capacity_mw - a.capacity_mw)) form.retire.append(Object.assign(document.createElement('option'), { value: u.id, textContent: `${u.plant_name} ${u.id} · ${whole(u.capacity_mw)} MW ${t(`scenario.fuel.${u.class}`)}` }));
  form.hidden = false;
  root.querySelector('[data-scenario-waiting]').hidden = true;
  localKeys = keys(fleet.zone);
  marginal.hidden = false;
  marginal.querySelector('[data-marginal-mix]').innerHTML = String(marginalMix());
  marginal.addEventListener('change', showMarginal);
  showMarginal();
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  form.addEventListener('reset', () => { out.innerHTML = ''; history.replaceState(null, '', location.pathname); });
  if (fromFragment()) run();
}

start().catch(() => {});
