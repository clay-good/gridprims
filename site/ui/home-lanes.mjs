// The home page's two lanes (site/home-and-navigation, "Command-first home
// with two doors"), in the order the spec names them. A cell shows only once
// its tool or page exists; nothing unbuilt appears, not even as "coming
// soon". A lane holds at most five cells: a new tool reaches the home page by
// replacing one, never by adding a row.

export const LANE_MAX = 5;

/** @type {Record<'home' | 'work', Array<{id: string, tool?: string, path?: string, needs: 'none' | 'zip' | 'bill' | 'file', data?: string[]}>>} */
export const LANES = {
  home: [
    { id: 'bill-check', tool: 'household.bill-totals.check', needs: 'bill' },
    { id: 'use-high', tool: 'household.usage-benchmark.compare', needs: 'bill' },
    { id: 'cheapest-plan', path: '/files/#plans', needs: 'file', data: ['urdb'] },
    { id: 'find-utility', path: '/lookup/', needs: 'zip', data: ['census-zcta-county', 'eia-861', 'egrid'] },
    { id: 'cleanest-hours', tool: 'carbon.cleanest-hours', needs: 'zip' },
  ],
  work: [
    { id: 'workbench', path: '/files/', needs: 'file' },
    { id: 'entity-data', path: '/states/', needs: 'none', data: ['eia-861', 'eia-860', 'eia-923'] },
    { id: 'hourly-emissions', tool: 'carbon.hourly-emissions', needs: 'file' },
    { id: 'library', path: '/data/', needs: 'none' },
    { id: 'agent-server', path: '/developers/', needs: 'none' },
  ],
};

/**
 * Pages that are not tools but belong on a section page (site/home-and-navigation, "Growth replaces, it
 * does not accumulate"): the entity families, the scenario model, the terms table, and the Learn pages. A
 * cell shows only once its page exists. The home page stays free of cells; these are the way in from a
 * section, so nothing we build is reachable only by its address.
 */
export const PAGE_CELLS = {
  grid: [
    { id: 'scenario', path: '/scenario/', needs: 'none', data: ['eia-930', 'eia-923'] },
    { id: 'entity-data', path: '/states/', needs: 'none', data: ['eia-861', 'eia-860', 'eia-923'] },
    { id: 'queue', path: '/queue/', needs: 'none', data: ['lbnl-queued-up'] },
    { id: 'large-load-terms', path: '/large-load/terms/', needs: 'none' },
  ],
  data: [
    { id: 'ledger', path: '/ledger/', needs: 'none' },
    { id: 'checks', path: '/ledger/checks/', needs: 'none' },
  ],
  learn: [
    { id: 'glossary', path: '/learn/glossary/', needs: 'none' },
    { id: 'qualifying-facility', path: '/learn/qualifying-facility/', needs: 'none' },
  ],
  bills: [],
  carbon: [],
};

/** The most sections the top rail may show. */
export const SECTION_MAX = 6;

/**
 * The simplicity budget the build enforces: at most six sections and five cells a lane.
 * @returns {string[]} problems, empty when within budget
 */
export function checkSimplicity(sections, lanes = LANES) {
  const problems = [];
  if (sections.length > SECTION_MAX) problems.push(`${sections.length} sections in the top rail, at most ${SECTION_MAX}`);
  for (const [lane, cells] of Object.entries(lanes)) if (cells.length > LANE_MAX) problems.push(`the ${lane} lane has ${cells.length} cells, at most ${LANE_MAX}; replace one instead of adding`);
  return problems;
}
