// The workbench's coincident-peak panel: ERCOT's intervals come from the
// site's snapshot; other operators' peaks are typed in from their lists.

import { ERCOT_NOTE, exposure, peakCost, programFor, PROGRAMS } from '../../core/lib/coincident-peak.mjs';
import { readNumber } from '../../core/lib/bill-totals.mjs';
import { renderCp, stampFields } from '../ui/workbench-cp.mjs';
import { getJson } from './zip-utilities.js';

/** @param {{i18n: any, view: () => any, when: (ms: number, zone: string) => string}} p */
export function setupCp({ i18n, view, when }) {
  const { t } = i18n;
  const panel = document.querySelector('[data-cp]');
  const form = panel.querySelector('[data-cp-form]');
  const out = panel.querySelector('[data-cp-result]');
  const program = () => PROGRAMS.find((p) => p.id === form.program.value);
  let last = null;

  function years() {
    const v = view();
    if (!v) return;
    const ys = [...new Set(Array.from(v.series.startMs, (ms) => new Date(ms).getUTCFullYear()))].sort((a, b) => b - a);
    form.year.replaceChildren(...ys.map((y) => Object.assign(document.createElement('option'), { value: String(y), textContent: String(y) })));
  }
  function fields() {
    const p = program();
    panel.querySelector('[data-cp-capacity]').hidden = p.charge !== 'capacity';
    form.querySelector('label[for=cp-rate]').textContent = p.charge === 'capacity' ? t('cp.ratePrice') : t('cp.rate');
    panel.querySelector('[data-cp-stamps]').innerHTML = p.ships ? '' : String(stampFields(p, i18n));
  }
  form.program.addEventListener('change', fields);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = view();
    if (!v) return;
    const year = Number(form.year.value);
    const p = programFor(form.program.value, year);
    if (!p) { out.replaceChildren(Object.assign(document.createElement('p'), { textContent: t('cp.noRule', { year }) })); return; }
    let stamps;
    let source = null;
    if (p.id === 'ercot-4cp') {
      const snap = await getJson('/bills/ercot-4cp.json');
      const y = snap.years[year];
      if (!y) { last = { p, e: { status: 'not-posted', year } }; out.innerHTML = String(renderCp(p, last.e, null, i18n, { when: (ms) => when(ms, p.zone) })); return; }
      stamps = y.intervals.map((i) => ({ date: i.date, time: i.ends }));
      source = `${snap.publisher}, ${y.source.report}, posted ${y.source.posted}`;
    } else {
      stamps = Array.from({ length: p.peaks }, (_, i) => ({ date: form[`date-${i}`]?.value, time: form[`time-${i}`]?.value.trim() })).filter((x) => x.date && x.time);
      if (stamps.length < p.peaks) { out.replaceChildren(Object.assign(document.createElement('p'), { textContent: t('cp.fill', { count: p.peaks }) })); return; }
      source = t('cp.entered');
    }
    const ex = exposure(v.series, p, stamps);
    const rate = readNumber(form.rate.value);
    const reduction = readNumber(form.reduction.value) ?? 0;
    const cost = ex.status === 'ok' && ex.averageKw !== null && rate !== null
      ? peakCost(p, ex.averageKw, p.charge === 'capacity' ? { pricePerMwDay: rate, scaling: readNumber(form.scaling.value) ?? 1, days: 365, reductionKw: reduction } : { ratePerKwMonth: rate, reductionKw: reduction })
      : null;
    last = { p, e: ex, cost };
    out.innerHTML = String(renderCp(p, ex, cost, i18n, { when: (ms) => when(ms, p.zone), source, note: p.program === 'ercot' ? ERCOT_NOTE : null, reductionKw: reduction }));
    panel.dataset.ran = String(Number(panel.dataset.ran ?? 0) + 1);
  });

  fields();
  panel.dataset.ready = 'true';
  return { refresh: years, state: () => last, preselect: (id) => { form.program.value = id; fields(); } };
}
