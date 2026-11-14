// Explainer: where does my power come from (add-learn-and-data-guides 3.1).
// The national mix is generated from EIA-923 generation by energy source.

const GROUPS = {
  gas: ['NG'], coal: ['BIT', 'SUB', 'LIG', 'ANT', 'RC', 'WC', 'SC'], nuclear: ['NUC'],
  wind: ['WND'], solar: ['SUN'], hydro: ['WAT'],
};
const pct = (x) => (Math.round(x * 10) / 10).toFixed(1);

export default {
  id: 'power-sources',
  title: 'Where does my power come from?',
  reviewed: '2026-11-14',
  summary: 'There are two answers. One is the plants that make the power on your part of the grid, which changes by the hour. The other is what your utility paid for, which some states report on a power content label.',
  sections: [
    { heading: 'What the grid makes', paragraphs: [
      'Power flows from every plant on the grid to every user, so no one gets electrons from one plant. In {year}, plants that report to EIA made {gas}% of US power from natural gas, {coal}% from coal, {nuclear}% from nuclear, {wind}% from wind, {solar}% from solar, and {hydro}% from hydro.',
    ] },
    { heading: 'What your utility paid for', paragraphs: [
      'A utility can buy power under contract or buy credits for clean power, and count those as its supply. Some states require a power content label that lists those sources. It can differ from the plants running near you.',
    ] },
    { heading: 'Your region, hour by hour', paragraphs: [
      'The mix in your region changes through the day: more solar at midday, more gas in the evening in many places. gridprims\' balancing authority pages show it by the hour, and the load-shift tool finds the cleanest hours to use power.',
    ] },
  ],
  cited: [],
  /** @param {{regions: any}} d */
  figures({ regions }) {
    const total = {};
    for (const s of regions.states) for (const [code, mwh] of Object.entries(s.generation ?? {})) total[code] = (total[code] ?? 0) + mwh;
    const all = Object.values(total).filter((x) => x > 0).reduce((a, b) => a + b, 0);
    const share = (codes) => pct((codes.reduce((n, c) => n + Math.max(0, total[c] ?? 0), 0) / all) * 100);
    const year = regions.states[0]?.year;
    const source = `EIA-923 net generation by energy source, summed over every state, data year ${year}`;
    return Object.fromEntries([['year', String(year)], ...Object.entries(GROUPS).map(([k, codes]) => [k, share(codes)])].map(([k, v]) => [k, { display: v, source }]));
  },
  tryIt: { href: '/lookup/', label: 'Find your utility and its balancing authority' },
};
