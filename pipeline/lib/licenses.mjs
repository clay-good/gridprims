// The license of each output table, chosen from its inputs (platform/data-snapshots,
// "License per output table", "ISO data keeps its publisher's terms", "Credits
// travel with every file").

/**
 * @typedef {{id: string, publisher: string, license: 'public-domain' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'ODbL-1.0' | 'publisher-terms', attribution: string, notice?: string}} Input
 */

/**
 * @param {Input[]} inputs
 * @returns {{ok: true, license: string, credits: Array<{publisher: string, attribution: string, note: string}>, notices: string[]} | {ok: false, error: string}}
 */
export function tableLicense(inputs) {
  const kinds = new Set(inputs.map((i) => i.license));
  if (kinds.has('ODbL-1.0') && kinds.size > 1) return { ok: false, error: `ODbL data (${inputs.filter((i) => i.license === 'ODbL-1.0').map((i) => i.id).join(', ')}) must stay in its own file; split the table in two.` };
  if (kinds.has('CC-BY-SA-4.0') && kinds.has('publisher-terms')) return { ok: false, error: 'Share-alike data cannot be merged with data under a publisher\'s own terms; split the table in two.' };
  if (kinds.has('publisher-terms') && kinds.size > 1 && [...kinds].some((k) => k !== 'publisher-terms' && k !== 'public-domain')) return { ok: false, error: 'Data under a publisher\'s own terms keeps those terms; publish it in its own file.' };
  const license = kinds.has('ODbL-1.0') ? 'ODbL-1.0' : kinds.has('CC-BY-SA-4.0') ? 'CC-BY-SA-4.0' : kinds.has('publisher-terms') ? 'publisher-terms' : 'CC-BY-4.0';
  return {
    ok: true,
    license,
    credits: inputs.map((i) => ({ publisher: i.publisher, attribution: i.attribution, note: 'Modified by gridprims.' })),
    notices: inputs.filter((i) => i.notice).map((i) => i.notice),
  };
}
