// Explainer: why is my bill so high (add-learn-and-data-guides 3.1). The
// national prices are generated from EIA-861 the way EIA's Table 2.10 computes
// them: revenue from every part over sales from parts A, B, and D.

const PART_C = 'C';
const cents = (rows) => {
  const rev = rows.reduce((n, r) => n + (r.res_revenue ?? 0), 0);
  const mwh = rows.filter((r) => r.part !== PART_C).reduce((n, r) => n + (r.res_sales ?? 0), 0);
  return (rev * 1000 * 100) / (mwh * 1000);
};

export default {
  id: 'bill-high',
  title: 'Why is my bill so high?',
  reviewed: '2026-11-14',
  summary: 'A bill can rise because you used more, because the price per kWh rose, or because the bill covered more days. Weather is the most common reason use changes. gridprims can check each one against your own bills.',
  sections: [
    { heading: 'The price went up', paragraphs: [
      'Across the country, homes paid an average of {priceNow} cents per kWh in {yearNow}, up from {priceThen} cents in {yearThen}. Your utility\'s own price is on its gridprims page, next to its state\'s average.',
    ] },
    { heading: 'You used more', paragraphs: [
      'A colder winter or a hotter summer raises use for heating and cooling. New equipment, more people at home, or a failing appliance can too. gridprims\' weather check splits a change in use into what the weather explains and what it does not, and never guesses the cause.',
    ] },
    { heading: 'The bill covered more days, or a charge changed', paragraphs: [
      'A 35-day bill costs more than a 28-day bill at the same daily use. Fuel adjustments and riders can change between bills without a rate case. The bill check prices your bill line by line from its printed totals, so you can see which part moved.',
    ] },
  ],
  cited: [{ text: '35', example: true }, { text: '28', example: true }],
  /** @param {{history: any}} d */
  figures({ history }) {
    const years = [...new Set(history.rows.map((r) => r.data_year))].sort((a, b) => a - b);
    const [then, now] = [years[0], years.at(-1)];
    const source = `EIA-861 (sales to ultimate customers), served version ${history.manifest.version}, every utility, as EIA's Table 2.10 computes it`;
    const at = (y) => cents(history.rows.filter((r) => r.data_year === y)).toFixed(2);
    return {
      priceNow: { display: at(now), source }, yearNow: { display: String(now), source },
      priceThen: { display: at(then), source }, yearThen: { display: String(then), source },
    };
  },
  tryIt: { href: '/tools/household/bill-totals/check/', label: 'Check a bill from its printed totals, with example values' },
};
