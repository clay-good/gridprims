// Result cards (add-load-and-bill-analyzer: handoff-and-report, task 7.2):
// each workbench result as plain text to paste anywhere, with the result, the
// key inputs, the method in one line, the sources, the screening label, and
// the version, and never the file's contents.

export const SCREENING = 'gridprims gives screening estimates, not utility studies.';
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const footer = ({ version, urdbAsOf }) => [
  SCREENING,
  `Sources: OpenEI Utility Rate Database (URDB), snapshot of ${urdbAsOf}.`,
  `gridprims.com · workbench ${version}`,
];

/**
 * The rate comparison card: the top three rates with their costs on the file.
 * @param {{ranked: any[], current: any}} r from compareRates or findPlans
 * @param {{utility: string, period: string, version: string, urdbAsOf: string}} ctx period: the file's first and last day
 */
export function rankingCard(r, ctx) {
  return [
    `What this load would have cost on ${ctx.utility}'s rates, ${ctx.period}:`,
    ...r.ranked.slice(0, 3).map((p, i) => `${i + 1}. ${p.rec.name}: ${money(p.annual)}${p === r.current ? ' (current rate)' : p.diff !== undefined ? ` (${p.diff < 0 ? '−' : '+'}${money(Math.abs(p.diff))} against the current rate)` : ''}`),
    'Method: every interval priced on each rate by calendar month, summed over the file.',
    'Based on past use; savings depend on future use and each rate\'s terms.',
    ...footer(ctx),
  ].join('\n');
}

/** The bill card: each month's total on one rate. */
export function billCard(rec, bills, ctx) {
  const total = bills.months.reduce((n, m) => n + m.total, 0);
  return [
    `${rec.name} (${rec.utility ?? 'entered by hand'}, URDB ${rec.id}) on this load, ${ctx.period}: ${money(total)}.`,
    ...bills.months.map((m) => `${m.month}: ${money(m.total)}`),
    ...(rec.unmodeled.length ? [`Not modeled: ${rec.unmodeled.join(', ')}.`] : []),
    'Method: line-by-line bills by calendar month from the intervals; taxes and riders not in the rate database are left out.',
    ...footer(ctx),
  ].join('\n');
}

/** The battery and solar screen card, with its upper-bound label and the effects it leaves out. */
export function screenCard(input, result, ctx) {
  return [
    `Battery and solar screen on ${ctx.rate}, ${ctx.period}: ${money(result.saved.total)} saved (${money(result.saved.demand)} demand, ${money(result.saved.energy)} energy).`,
    `Inputs: ${[input.powerKw && `${input.powerKw} kW / ${input.energyKwh} kWh battery, ${Math.round(input.roundTrip * 100)}% round trip, ${Math.round(input.socMin * 100)}–${Math.round(input.socMax * 100)}% charge window`, input.solar && 'solar from a PVWatts export'].filter(Boolean).join('; ')}.`,
    ...(result.back.years !== null ? [`Simple payback: ${result.back.years.toFixed(1)} years.`] : []),
    'Method: monthly threshold peak shaving with perfect foresight; savings from the bill engine.',
    result.upperBound,
    `Not modeled: ${result.excluded.join(', ')}.`,
    ...footer(ctx),
  ].join('\n');
}
