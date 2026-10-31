// A factual public comment draft (add-ratepayer-tools: comment-draft): only
// the docket and regulator the user enters, their customer type, the computed
// impact and the charges that drive it, the method, and the user's own words.
// gridprims adds no opinion, request, or claim, and submits nothing.

const money = (x) => `$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (x) => `${x >= 0 ? '+' : '−'}${money(x)}`;

/** The paragraph the user writes; the draft keeps a blank place for it. */
export const OWN_WORDS = '[Your own views go here.]';

/**
 * @param {{regulator: string, docket: string, customerType: string, utility: string, period: string, ownWords?: string}} who
 * @param {ReturnType<typeof import('./rate-impact.mjs').impactOnIntervals>} impact
 * @param {{version: string, source: 'intervals' | 'monthly'}} how
 */
export function commentDraft(who, impact, how) {
  const span = impact.label ? impact.label : 'a year';
  const perMonth = impact.diff / impact.months;
  const lines = [
    `To the ${who.regulator}, regarding docket ${who.docket}:`,
    '',
    `I am a ${who.customerType} customer of ${who.utility}. Using my own electricity use for ${who.period} (${span}), I priced my bills under the current rates and under the proposed rates.`,
    '',
    `Under the current rates, my bills come to ${money(impact.current)}. Under the proposed rates, they come to ${money(impact.proposed)}. That is ${signed(impact.diff)}${impact.pct === null ? '' : ` (${impact.pct >= 0 ? '+' : '−'}${Math.abs(impact.pct)}%)`} over ${span}, or about ${signed(perMonth)} a month.`,
    ...(impact.largest ? [`The largest part of the change is in ${impact.largest.label}: ${signed(impact.largest.diff)}.`] : []),
    '',
    who.ownWords?.trim() ? who.ownWords.trim() : OWN_WORDS,
    '',
    `Method: both bills were priced from my own ${how.source === 'intervals' ? 'meter data' : 'monthly bill totals'} by the same bill engine (gridprims ${how.version}, gridprims.com). Taxes and charges not in the rate schedules are left out.`,
  ];
  return lines.join('\n');
}
