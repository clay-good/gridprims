// Published residential bill examples the bill check's totals path must reproduce to the cent
// (add-household-bill-check 2.4; household/bill-totals, "five published residential bill examples"). Each is a
// bill test vector cut from the Louisiana Public Service Commission's November 2026 Residential Bill
// Comparison, at a consumption level the commission publishes; the vector carries the citation (document,
// page, address, SHA-256) and the tariff as the commission itemizes it. Five schedules, three levels.

export const PUBLISHED_EXAMPLES = [
  'la-beauregard-rs-2026-11-250kwh',
  'la-concordia-a-2026-11-1000kwh',
  'la-northeast-a-2026-11-1000kwh',
  'la-slemco-05-2026-11-1000kwh',
  'la-jefferson-davis-a-2026-11-5000kwh',
];
