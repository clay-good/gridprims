// Explainer: demand charges (add-learn-and-data-guides 3.1). The worked
// numbers are example values, labeled as such.

export default {
  id: 'demand-charges',
  title: 'Demand charges explained',
  reviewed: '2026-11-14',
  summary: 'A demand charge prices your highest use over a short window, not your total use. One busy quarter hour can set it for the whole month. Some rates carry that peak forward for months.',
  sections: [
    { heading: 'What it measures', paragraphs: [
      'Your meter records how much you draw in each short interval. The demand charge takes the highest interval in the billing month, in kW, and multiplies it by a price per kW. Energy charges, in kWh, price the total you used.',
    ] },
    { heading: 'A worked example', paragraphs: [
      'Say a shop draws 40 kW most of the month, but 100 kW for one quarter hour when two machines start together. At $12 per kW, demand costs $1,200 that month. Had the peak stayed at 40 kW, it would have cost $480.',
    ] },
    { heading: 'Ratchets and windows', paragraphs: [
      'Some rates bill at least a share of the highest peak of the past several months, called a ratchet. Some count only peaks inside set hours. The tariff sheet says which, and gridprims reads both from the rate.',
    ] },
    { heading: 'What lowers it', paragraphs: [
      'Starting machines apart, moving a load out of the window, or a battery that covers the peak. The workbench shows which interval set each month\'s demand, on the chart.',
    ] },
  ],
  cited: [
    { text: '40', example: true }, { text: '100', example: true }, { text: '12', example: true },
    { text: '1,200', example: true }, { text: '480', example: true },
  ],
  tryIt: { href: '/files/#plans&utility=1015&state=TX', label: 'Price the sample office on Austin Energy\'s rates, with example values' },
};
