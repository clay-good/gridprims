// Tariffs written as URPX by core/lib/urpx.mjs and checked against the URPX
// v0.5.1 SHACL shapes by verify/tools/urpx-shacl.py. Each covers one shape the
// emitter writes: a flat rate, tiers with a monthly minimum, and seasonal tiers
// with a daily fixed charge, across a season that wraps the year.

export const URPX_CASES = {
  flat: { tariff: { fixedMonthly: 10, seasons: [{ name: 'all year', from: '01-01', tiers: [{ rate: 0.115 }] }] }, meta: { id: 'flat', name: 'Residential flat', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago' } },
  tiered: { tariff: { fixedMonthly: 10, minimumMonthly: 15, seasons: [{ name: 'all year', from: '01-01', tiers: [{ rate: 0.1, upTo: 500 }, { rate: 0.13 }] }] }, meta: { id: 'tiered', name: 'Residential tiered', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago' } },
  seasonal: { tariff: { fixedDaily: 0.5, seasons: [{ name: 'June to September', from: '06-01', tiers: [{ rate: 0.12, upTo: 600 }, { rate: 0.15 }] }, { name: 'October to May', from: '10-01', tiers: [{ rate: 0.1, upTo: 800 }, { rate: 0.11 }] }] }, meta: { id: 'seasonal', name: 'Residential seasonal', utility: 'Example Electric', effective: '2026-01-01', zone: 'America/Chicago', source: { url: 'https://example.com/tariff.pdf', retrieved: '2026-11-16' } } },
};
