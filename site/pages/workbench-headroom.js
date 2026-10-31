// The service headroom panel: the loaded file's maximum 15-minute demand over
// the data period it qualifies for, and the room left on the service.

import { fifteenMinute, headroomReport, maxDemand, sufficiency } from '../../core/lib/service-headroom.mjs';
import { readNumber } from '../../core/lib/bill-totals.mjs';
import { renderHeadroom } from '../ui/workbench-headroom.mjs';

const TOOL_URL = '/tools/electrify/service-headroom/check/';

/** @param {{i18n: any, view: () => any, when: (ms: number, zone: string) => string}} p */
export function setupHeadroom({ i18n, view, when }) {
  const { t } = i18n;
  const panel = document.querySelector('[data-headroom]');
  const form = panel.querySelector('[data-headroom-form]');
  const out = panel.querySelector('[data-headroom-result]');
  let last = null;
  let params = null;
  const show = (r, o = {}) => {
    last = r;
    out.innerHTML = String(renderHeadroom(r, i18n, { toolUrl: TOOL_URL, ...o }));
    panel.dataset.ran = String(Number(panel.dataset.ran ?? 0) + 1);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = view();
    if (!v) return;
    const volts = readNumber(form.volts.value);
    const ratingA = readNumber(form.rating.value);
    const powerFactor = readNumber(form.pf.value);
    if (!form.edition.value) return show({ status: 'refused', reason: t('headroom.needEdition') });
    if (!(volts > 0) || !(ratingA > 0) || !(powerFactor > 0 && powerFactor <= 1)) return show({ status: 'refused', reason: t('headroom.needInputs') });
    const q = fifteenMinute(v.series);
    if (q.status === 'refused') return show({ ...q, bills: true });
    const s = sufficiency(q.series, v.zone);
    if (s.status === 'refused') return show(s);
    const received = v.result.series.find((x) => x.meter === v.series.meter && x.channel === 'received' && x !== v.series);
    const exported = received ? received.kwh.some((k) => k > 0) : false;
    const md = maxDemand(q.series, s.fromMs, s.toMs);
    const period = s.period === '12-month' ? t('headroom.period12', { from: s.from, to: s.to }) : t('headroom.period30', { days: s.days, from: when(s.fromMs, v.zone), to: when(s.toMs - 1, v.zone) });
    const phase = form.phase.value === '3' ? 3 : 1;
    params = { powerFactor, volts, phase, ratingA, hasGeneration: form.generation.checked || exported, edition: form.edition.value };
    const r = headroomReport({ maxKw: md.kw, period: s.period, ...params, source: t('headroom.source', { period }) });
    if (r.status === 'refused' && exported) r.reason = `${t('headroom.exported')} ${r.reason}`;
    show(r, { when: when(md.atMs, v.zone), period, phase });
    panel.querySelector('[data-headroom-print]')?.addEventListener('click', () => {
      // A page of its own, made here, so only the report prints: every input and step for the electrician.
      const inputs = [[t('headroom.volts'), `${volts} V`], [t('headroom.phase'), form.phase.selectedOptions[0].textContent], [t('headroom.rating'), `${ratingA} A`], [t('headroom.pf'), String(powerFactor)], [t('headroom.edition'), form.edition.selectedOptions[0].textContent], [t('headroom.periodLabel'), period]];
      const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
      const page = `<!doctype html><meta charset="utf-8"><title>${esc(t('headroom.title'))}</title><body style="font:11pt/1.45 Georgia,serif;max-width:7in;margin:0.5in auto"><h1 style="font-size:16pt">${esc(t('headroom.title'))}</h1><table>${inputs.map(([k, x]) => `<tr><th style="text-align:left;padding-right:1em">${esc(k)}</th><td>${esc(x)}</td></tr>`).join('')}</table>${out.innerHTML.replace(/<button[\s\S]*?<\/button>/g, '')}<p>gridprims.com</p><script>print()</script>`;
      open(URL.createObjectURL(new Blob([page], { type: 'text/html' })));
    });
  });
  panel.dataset.ready = 'true';
  return { state: () => last, params: () => params };
}
