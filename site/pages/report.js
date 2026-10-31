// The problem-report dialog (platform/problem-reports): the user sees the
// exact payload, attaches inputs only by ticking a box, and nothing is sent
// until they press Send. File contents are never attached.

import { challenge, solve } from '../../core/contract/report.mjs';
import { createI18n } from '../lib/i18n.mjs';
import strings from '../strings/en-US.mjs';

const { t } = createI18n(strings, 'en-US');
const dialog = document.querySelector('[data-report-dialog]');
const q = (s) => dialog.querySelector(s);
let fromAgent = null;

/** The report as it will be sent, built from the page, never from a loaded file. */
export function currentPayload() {
  if (fromAgent) return { ...fromAgent, message: q('[data-report-message]').value };
  const tool = document.querySelector('[data-tool]');
  const p = {
    toolId: tool?.dataset.tool ?? '',
    toolVersion: tool?.dataset.toolVersion ?? '',
    datasets: [],
    pageUrl: `${location.origin}${location.pathname}`,
    message: q('[data-report-message]').value,
  };
  if (q('[data-report-attach]').checked && globalThis.gridprimsReportAttachment) p.attachment = globalThis.gridprimsReportAttachment();
  return p;
}

const preview = () => { q('[data-report-preview]').textContent = JSON.stringify(currentPayload(), null, 2); };

export function openReport(agentPayload = null) {
  fromAgent = agentPayload;
  q('[data-report-agent]').hidden = !agentPayload;
  q('[data-report-message]').value = agentPayload?.message ?? '';
  q('[data-report-attach-row]').hidden = Boolean(agentPayload) || !globalThis.gridprimsReportAttachment;
  q('[data-report-attach]').checked = false;
  q('[data-report-status]').textContent = '';
  preview();
  dialog.showModal();
}

q('[data-report-message]').addEventListener('input', preview);
q('[data-report-attach]').addEventListener('change', preview);
q('[data-report-close]').addEventListener('click', () => dialog.close());
q('[data-report-copy]').addEventListener('click', async () => {
  await navigator.clipboard?.writeText(JSON.stringify(currentPayload(), null, 2));
  q('[data-report-status]').textContent = t('report.copied');
});
q('[data-report-send]').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  const p = currentPayload();
  button.disabled = true;
  q('[data-report-status]').textContent = t('report.sending');
  try {
    const body = { ...p, website: q('[data-report-hp]').value, pow: solve(challenge(p)) };
    const res = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error ?? res.statusText);
    const status = q('[data-report-status]');
    status.textContent = `${t('report.sent', { id: out.id })} `;
    status.append(Object.assign(document.createElement('a'), { href: out.changelog, textContent: t('report.changelog') }), '.');
  } catch (err) {
    q('[data-report-status]').textContent = navigator.onLine === false ? t('report.offline') : t('report.failed', { error: err.message });
  } finally {
    button.disabled = false;
  }
});

// Every "Report a problem" link opens the dialog instead of leaving the page.
document.addEventListener('click', (e) => {
  const link = e.target.closest?.('[data-report]');
  if (!link) return;
  e.preventDefault();
  openReport();
});

// On /report/, open at once, with a payload an agent prepared if the fragment carries one.
if (document.querySelector('[data-report-page]')) {
  let agent = null;
  try {
    const raw = location.hash.slice(1);
    if (raw) agent = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
  } catch { agent = null; }
  openReport(agent && typeof agent === 'object' ? { toolId: String(agent.toolId ?? ''), toolVersion: String(agent.toolVersion ?? ''), datasets: Array.isArray(agent.datasets) ? agent.datasets : [], pageUrl: String(agent.pageUrl ?? ''), message: String(agent.message ?? ''), ...(agent.attachment ? { attachment: agent.attachment } : {}) } : null);
}
