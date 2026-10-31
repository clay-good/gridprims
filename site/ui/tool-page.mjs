// The parts of a tool page that show a result. The build prerenders them with
// the worked example, and the page module re-renders them on every change, so
// the first paint and every later answer come from the same code.

import { html } from '../lib/html.mjs';
import { GLYPHS } from './glyphs.mjs';

export const REPORT_URL = '/report/';
export const LIMITS_PATH = '/limits/';

/** @param {string} id e.g. calc.energy-units.convert */
export const toolPath = (id) => `/tools/${id.split('.').join('/')}/`;

/** Short publisher names for the source tab, from the manifest's citations. */
export function sourceTab(manifest) {
  const names = manifest.citations.map((c) => c.source.split(',')[0].replace(/^NIST Special Publication/, 'NIST SP'));
  return [...new Set(names)].join(' · ');
}

/**
 * The reasons that share the one work-zone strip, strongest first (DESIGN.md "Three axes, one strip").
 * @param {any} manifest
 * @param {{validationLevel?: number}} result
 * @param {boolean} isExample
 * @param {{t: (id: string, p?: any) => string}} i18n
 */
export function stripReasons(manifest, result, isExample, i18n) {
  const reasons = [];
  if (manifest.screeningLabel) reasons.push(manifest.screeningLabel);
  const level = result.validationLevel ?? manifest.validation.level;
  if (level === 0) reasons.push(i18n.t('strip.unvalidated'));
  if (level === 1) reasons.push(i18n.t('strip.selfChecked'));
  if (isExample) reasons.push(i18n.t('answer.example'));
  return reasons;
}

/**
 * The answer sign, validation stamp, and strip.
 * @param {any} manifest
 * @param {any} result a runTool result
 * @param {{t: Function}} i18n
 * @param {{isExample: boolean}} opts
 */
export function renderAnswer(manifest, result, i18n, { isExample }) {
  const { t } = i18n;
  const level = manifest.validation.level;
  const evidence = manifest.validation.evidence.map((e) => e.summary).join(' ');
  const out = manifest.outputs[0];
  let sign;
  if (result.status === 'ok') {
    const o = result.outputs[out.name];
    sign = html`<div class="sign" data-state="${isExample ? 'example' : 'live'}">
      <p class="label">${out.label}</p>
      <p class="number" data-output="${out.name}">${o.display}<span class="unit">${o.unit}</span></p>
      <p class="sentence">${result.sentence}</p>
      <span class="source-tab mono">${sourceTab(manifest)}</span>
    </div>`;
  } else if (result.status === 'refused') {
    sign = html`<div class="sign" data-state="refused">
      <p class="label">${t('answer.refused')}</p>
      <p class="sentence">${result.reason}</p>
      <p><a class="handoff" href="${result.limitsUrl}">${t('answer.refusedLink')}</a></p>
    </div>`;
  } else {
    sign = html`<div class="sign" data-state="invalid">
      <p class="label">${out.label}</p>
      <p class="sentence">${GLYPHS.octagon} ${t('answer.invalid')}</p>
    </div>`;
  }
  const reasons = stripReasons(manifest, result, isExample, i18n);
  return html`${sign}
    <p class="stamp mono"><span class="${level >= 2 ? 'ok' : 'diamond'}">${level >= 2 ? GLYPHS.check : GLYPHS.diamond}</span>
      ${t('validation.stamp', { level: t(`validation.${level}`), evidence })}
      <a href="${LIMITS_PATH}#${manifest.id}">${t('validation.limitsLink')}</a></p>
    ${reasons.length ? html`<p class="strip" data-strip>${GLYPHS.diamond} ${reasons.join(' · ')} <a href="${REPORT_URL}" data-report>${t('strip.report')}</a></p>` : ''}`;
}

/**
 * The "How we got this" panel's contents.
 * @param {any} manifest
 * @param {any} result
 * @param {{t: Function}} i18n
 */
export function renderWork(manifest, result, i18n) {
  const { t } = i18n;
  const w = result.work;
  if (!w) return html`<p>${manifest.method}</p>`;
  return html`<h3>${t('work.method')}</h3><p>${w.method}</p>
    ${w.steps.length ? html`<h3>${t('work.steps')}</h3><ol>${w.steps.map((s) => html`<li>${s}</li>`)}</ol>` : ''}
    ${w.constants.length ? html`<h3>${t('work.constants')}</h3><ul class="mono">${w.constants.map((c) => html`<li>${c.text} (${c.exact ? t('work.constantExact') : t('work.constantAverage')}${c.year ? `, ${c.year}` : ''}). ${c.source}</li>`)}</ul>` : ''}
    ${result.notes?.length ? html`<h3>${t('work.notes')}</h3><ul>${result.notes.map((n) => html`<li>${n}</li>`)}</ul>` : ''}
    ${w.assumptions.length ? html`<h3>${t('work.assumptions')}</h3><ul>${w.assumptions.map((a) => html`<li>${a}</li>`)}</ul>` : ''}
    <h3>${t('work.citations')}</h3>
    <ul class="mono">${w.citations.map((c) => html`<li>${c.url ? html`<a href="${c.url}">${c.source}</a>` : c.source}, ${c.edition}, ${c.locator}</li>`)}</ul>`;
}

/**
 * Plain text for "Copy result": the sentence, rounded exactly as shown, plus
 * the validation level and its meaning, so a pasted number is never stripped
 * of how well checked it is.
 * @param {any} manifest
 * @param {any} result
 * @param {{t: Function}} i18n
 * @param {string} url
 */
export function copyText(manifest, result, i18n, url) {
  const { t } = i18n;
  if (result.status !== 'ok') return '';
  const lines = [result.sentence];
  if (manifest.screeningLabel) lines.push(manifest.screeningLabel);
  lines.push(t('copy.level', { level: t(`validation.${result.validationLevel}`), meaning: result.validationMeaning }));
  lines.push(t('copy.source', { url }));
  return lines.join('\n');
}
