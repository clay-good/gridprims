// The added-load panel: a shape file or schedule on the loaded file, with the
// combined load priced on the bill panel's rate and checked against the
// headroom panel's inputs when those have run. The shape file stays on this device.

import { alignSchedule, alignShape, combined, readSchedule, readShape } from '../../core/lib/added-load.mjs';
import { fifteenMinute, headroomReport, maxDemand, sufficiency } from '../../core/lib/service-headroom.mjs';
import { intervalBills } from '../../core/lib/interval-bill.mjs';
import { renderAdded } from '../ui/workbench-added.mjs';

/** @param {{i18n: any, view: () => any, priced: () => any, headroom: {state: () => any, params: () => any}}} p */
export function setupAdded({ i18n, view, priced, headroom }) {
  const panel = document.querySelector('[data-added]');
  const form = panel.querySelector('[data-added-form]');
  const out = panel.querySelector('[data-added-result]');
  const show = (r) => { out.innerHTML = String(renderAdded(r, i18n)); panel.dataset.ran = String(Number(panel.dataset.ran ?? 0) + 1); };
  form.kind.addEventListener('change', () => {
    const file = form.kind.value === 'file';
    panel.querySelectorAll('[data-added-file]').forEach((el) => { el.hidden = !file; });
    panel.querySelector('[data-added-schedule]').hidden = file;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = view();
    if (!v) return;
    let aligned;
    if (form.kind.value === 'schedule') {
      const sched = readSchedule(form.schedule.value);
      if (sched.status !== 'ok') return show(sched);
      aligned = alignSchedule(v.series, sched, v.zone);
    } else {
      const f = form.file.files[0];
      if (!f) return show({ status: 'refused', reason: i18n.t('added.noFile') });
      const shape = readShape(await f.text(), { zone: v.zone, basis: form.basis.value, unit: form.unit.value || undefined });
      if (shape.status !== 'ok') return show(shape);
      aligned = alignShape(v.series, shape, v.zone);
    }
    const result = combined(v.series, aligned.added, v.zone);
    const r = { status: 'ok', steps: aligned.steps, result };
    const p = priced();
    if (p) {
      const total = (s) => intervalBills(s, p.rec, { zone: v.zone }).months.reduce((n, m) => n + m.total, 0);
      r.bills = { before: total(v.series), after: total(result.series) };
    }
    const params = headroom.params();
    if (params && headroom.state()?.status === 'ok') {
      const q = fifteenMinute(result.series);
      const s = q.status === 'ok' ? sufficiency(q.series, v.zone) : q;
      r.headroom = s.status === 'ok' ? { ...headroomReport({ maxKw: maxDemand(q.series, s.fromMs, s.toMs).kw, period: s.period, ...params }), beforeA: headroom.state().h.headroomA } : s;
    }
    show(r);
  });
  panel.dataset.ready = 'true';
}
