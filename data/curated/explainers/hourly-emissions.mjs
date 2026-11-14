// Explainer: hourly versus annual emissions (add-learn-and-data-guides 3.1).
// The annual rate is EPA eGRID's; the hourly range is gridprims' typical hours
// from EIA-930, both generated at build.

const SUBREGION = 'ERCT';
const BA = 'ERCO';
const MONTH = 7;
const hour = (h) => `${h % 12 || 12} ${h < 12 ? 'a.m.' : 'p.m.'}`;
const lb = (x) => Math.round(x).toLocaleString('en-US');

export default {
  id: 'hourly-emissions',
  title: 'Hourly versus annual emissions',
  reviewed: '2026-11-14',
  summary: 'Most reports count the emissions from your power with one yearly average for your region. The grid\'s real emissions change hour by hour, with the plants that are running. Using power in cleaner hours lowers your real emissions even when your total use stays the same.',
  sections: [
    { heading: 'The yearly average', paragraphs: [
      'EPA\'s eGRID gives each region one rate for the year. For its {subregion} subregion, the rate for {egridYear} is {annual} lb of CO₂ per MWh.',
    ] },
    { heading: 'Hour by hour', paragraphs: [
      'In {month}, a typical day in {baName} ran from about {low} lb per MWh at {lowHour} to about {high} lb per MWh at {highHour}, taking the middle value for each hour over {years} from EIA\'s hourly grid data.',
    ] },
    { heading: 'When it matters', paragraphs: [
      'Hourly figures matter when a load can move: charging a car, heating water, running a pump, or a battery. They also matter to buyers who match their use with clean power hour by hour rather than over the year.',
    ] },
  ],
  cited: [],
  /** @param {{egrid: any, carbon: any}} d */
  figures({ egrid, carbon }) {
    const sub = egrid.rows.find((r) => r.subregion === SUBREGION);
    const egridSource = `EPA eGRID${egrid.manifest.tables[0].dataPeriod}, served version ${egrid.manifest.version}`;
    const t = carbon.typical.get(BA);
    const m = t.months.find((x) => x.month === MONTH);
    const hours = m.hours.filter((h) => h.median !== null);
    const lo = hours.reduce((a, b) => (b.median < a.median ? b : a));
    const hi = hours.reduce((a, b) => (b.median > a.median ? b : a));
    const ts = `EIA-930 hourly grid data, served version ${carbon.regions.version}, typical hours for ${t.years.join(', ')}`;
    return {
      subregion: { display: sub.subregion_name, source: egridSource },
      annual: { display: lb(sub.co2_rate_lb_mwh), source: egridSource },
      egridYear: { display: String(egrid.manifest.tables[0].dataPeriod), source: egridSource },
      month: { display: new Date(Date.UTC(2025, MONTH - 1, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }), source: ts },
      baName: { display: t.name, source: ts },
      low: { display: lb(lo.median), source: ts }, lowHour: { display: hour(lo.hour), source: ts },
      high: { display: lb(hi.median), source: ts }, highHour: { display: hour(hi.hour), source: ts },
      years: { display: t.years.length === 1 ? String(t.years[0]) : `${t.years[0]} to ${t.years.at(-1)}`, source: ts },
    };
  },
  tryIt: { href: '/tools/carbon/load-shift/estimate/', label: 'Find the cleanest hours where you live, and what moving a load saves' },
};
