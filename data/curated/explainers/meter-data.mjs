// Explainer: how to read your meter data (add-learn-and-data-guides 3.1).

export default {
  id: 'meter-data',
  title: 'How to read your meter data',
  reviewed: '2026-11-14',
  summary: 'A meter data file lists how much power you used in each short interval, often every 15 minutes or every hour. Each row has a time and an amount. gridprims reads the common layouts and tells you what it assumed.',
  sections: [
    { heading: 'What is in it', paragraphs: [
      'Each row gives a start time, sometimes an end time, and the energy used in that interval, in kWh. Some files give demand in kW instead. Green Button is the standard format, in XML or CSV.',
    ] },
    { heading: 'What trips people up', paragraphs: [
      'Clocks: a file may use local time, with a missing hour each spring and a repeated hour each fall, or it may use UTC. Hour numbers: some files count hours 1 to 24, so hour 1 ends at 1 a.m. Totals: some files end with a total row. gridprims handles each one and lists what it did on the receipt.',
    ] },
    { heading: 'Getting the file', paragraphs: [
      'Most utilities with smart meters offer a download in your online account. The data guides list the steps for the largest utilities, and a request to send when there is none.',
    ] },
  ],
  cited: [
    { text: '15', source: 'interval lengths utilities offer, docs/research/09 §1a', date: '2026-10-29' },
    { text: '1', example: true }, { text: '24', example: true },
  ],
  tryIt: { href: '/files/', label: 'Open the workbench with a sample file' },
};
