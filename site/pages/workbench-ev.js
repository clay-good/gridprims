// The EV charging panel: vehicle groups on the loaded file, unmanaged and
// managed, priced on the bill panel's rate and checked against the headroom
// panel's result when those have run.

import { managed, monthlyPeaks, parseGroups, serviceCheck, sessions, unmanaged } from '../../core/lib/ev-fleet.mjs';
import { intervalBills } from '../../core/lib/interval-bill.mjs';
import { renderEv } from '../ui/workbench-ev.mjs';

/** @param {{i18n: any, view: () => any, priced: () => any, headroom: () => any}} p */
export function setupEv({ i18n, view, priced, headroom }) {
  const panel = document.querySelector('[data-ev]');
  const form = panel.querySelector('[data-ev-form]');
  const out = panel.querySelector('[data-ev-result]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = view();
    if (!v) return;
    const { groups, errors } = parseGroups(form.groups.value);
    let r = { errors };
    if (!errors.length) {
      const s = v.series;
      const list = sessions(s, groups, v.zone);
      const u = unmanaged(s, list);
      const m = managed(s, list);
      const fits = groups.map((g, i) => {
        const one = list.find((x) => x.group === i);
        return { label: g.label, maxKwh: one ? one.capKw / g.count * one.hours : 0, shortfallKwh: one ? one.shortfallKwh / g.count : 0 };
      });
      r = { fits, peaks: list.length ? monthlyPeaks(s, v.zone, u, m) : [] };
      const p = priced();
      if (p && list.length) {
        const with_ = (added) => ({ ...s, kwh: Float64Array.from(s.kwh, (k, i) => k + added[i]) });
        const bill = (series) => intervalBills(series, p.rec, { zone: v.zone }).months;
        const total = (ms) => ms.reduce((n, mo) => n + mo.total, 0);
        const demand = (ms) => ms.reduce((n, mo) => n + mo.lines.filter((l) => l.kind === 'demand').reduce((a, l) => a + l.amount, 0), 0);
        const b = bill(s);
        const bu = bill(with_(u));
        const bm = bill(with_(m));
        r.bills = { building: total(b), unmanaged: total(bu), managed: total(bm), demandSaved: demand(bu) - demand(bm) };
      }
      const h = headroom();
      if (h?.status === 'ok' && list.length) r.service = [['unmanaged', u], ['managed', m]].map(([scenario, added]) => ({ scenario, headroomKva: h.h.headroomKva, ...serviceCheck(s, added, h.h.headroomKva) }));
    }
    out.innerHTML = String(renderEv(r, i18n));
    panel.dataset.ran = String(Number(panel.dataset.ran ?? 0) + 1);
  });
  panel.dataset.ready = 'true';
}
