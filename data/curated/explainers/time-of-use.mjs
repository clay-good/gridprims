// Explainer: flat versus time-of-use rates (add-learn-and-data-guides 3.1).
// The rate example is cited from docs/research/09, which read PG&E's page.

export default {
  id: 'time-of-use',
  title: 'Flat versus time-of-use rates',
  reviewed: '2026-11-14',
  summary: 'A flat rate charges the same for each kWh at any hour. A time-of-use rate charges more in a few busy hours and less the rest of the day. Which costs less depends on when you use power, not only how much.',
  sections: [
    { heading: 'How time-of-use works', paragraphs: [
      'The day is split into periods, such as a late-afternoon peak and everything else, often with different summer and winter prices. Each kWh is priced by the period it falls in.',
    ] },
    { heading: 'An example', paragraphs: [
      'On PG&E\'s EV2 rate in June 2026, a kWh cost about $0.538 in the summer peak and about $0.226 off-peak. Charging a car overnight instead of in the evening cuts what that energy costs by more than half.',
    ] },
    { heading: 'Default plans', paragraphs: [
      'Some utilities now put homes on time-of-use unless they choose otherwise, among them the three large California utilities, DTE in Michigan, and Xcel Energy in Colorado.',
    ] },
    { heading: 'Which is cheaper for you', paragraphs: [
      'Price your own hours on both. gridprims\' plan finder prices your meter file on each residential rate your utility offers and ranks them by what they would have cost over the past year.',
    ] },
  ],
  cited: [
    { text: '0.538', source: 'PG&E\'s EV2 rate page, as read for docs/research/09 §3', date: '2026-10-29' },
    { text: '0.226', source: 'PG&E\'s EV2 rate page, as read for docs/research/09 §3', date: '2026-10-29' },
  ],
  tryIt: { href: '/files/#plans', label: 'Compare rates on the sample file' },
};
