// The figures the large-load request card prefills (add-large-load-screen:
// request-context), from the same utility facts the utility pages show: the
// Form 714 annual peak, retail sales, and average residential use.

/**
 * The energy over a utility's own wires: bundled and delivery-only sales (the second is energy another
 * supplier sells to customers it serves). A retail marketer has no wires, so its energy-only sales count.
 * @param {any} u a utility from utilityPages
 */
export function retailBasis(u) {
  const sum = (kinds, f) => kinds.reduce((n, k) => n + (u.kinds[k] ? Object.values(u.kinds[k]).reduce((m, s) => m + f(s), 0) : 0), 0);
  const wires = ['bundled', 'delivery'].filter((k) => u.kinds[k]);
  const kinds = wires.length && sum(wires, (s) => s.sales) > 0 ? wires : ['energy'];
  const res = kinds.reduce((a, k) => ({ sales: a.sales + (u.kinds[k]?.res.sales ?? 0), customers: a.customers + (u.kinds[k]?.res.customers ?? 0) }), { sales: 0, customers: 0 });
  return { salesMwh: sum(kinds, (s) => s.sales), resKwh: res.customers ? Math.round((res.sales * 1000) / res.customers) : null, basis: kinds.join(' and ') };
}

/** @param {{utilities: any[], year: number}} p utilityPages's result */
export function largeLoadUtilities({ utilities, year }) {
  return utilities.map((u) => {
    const r = retailBasis(u);
    // Only 15 of 1,534 utilities file a Form 714 peak of their own, so the balancing
    // authority's peak travels too and the read-out says which one it used.
    return {
      id: u.id, name: u.name, state: u.homeState, year, salesMwh: Math.round(r.salesMwh), resKwh: r.resKwh, basis: r.basis,
      peak: u.peak?.mw ? { mw: u.peak.mw, year: u.peak.year } : null,
      baPeak: u.baPeak?.mw ? { mw: u.baPeak.mw, year: u.baPeak.year, code: u.baPeak.code, name: u.baPeak.name } : null,
      page: u.page,
    };
  }).filter((u) => u.salesMwh > 0);
}
