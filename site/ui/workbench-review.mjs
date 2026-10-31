// The workbench's capabilities as docs/review-signoffs.md names them, so each
// carries "Review pending" until a practitioner in its field signs off
// (site/limitations, "Accuracy is never claimed beyond the evidence").

import { html } from '../lib/html.mjs';

/** [id in docs/review-signoffs.md, strings key of its name, the panel it labels] */
export const WORKBENCH_CAPABILITIES = [
  ['load.interval-insights', 'insights.title', 'data-insights'],
  ['load.bill-explainer', 'bill.title', 'data-bill'],
  ['load.tariff-comparison', 'compare.title', 'data-compare-field'],
  ['load.storage-screen', 'screen.title', 'data-screen-field'],
  ['load.coincident-peak', 'cp.title', 'data-cp'],
  ['electrify.service-headroom', 'headroom.title', 'data-headroom'],
];

/** The chip beside a capability's heading: "Review pending" or "Reviewed". */
export function reviewChip(id, reviewed, { t }) {
  return html`<span class="chip" data-review="${id}">${reviewed.has(id) ? t('limits.review.signed off') : t('strip.reviewPending')}</span>`;
}
