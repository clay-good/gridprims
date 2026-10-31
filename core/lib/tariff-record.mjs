// The bill engine's tariff record (add-load-and-bill-analyzer D2, task 3.1):
// any URDB rate, or the manual form, as one record of fixed and minimum
// charges, energy periods and tiers on 12 × 24 weekday and weekend
// schedules, time-of-use and flat demand, ratchets, and the demand window.
// Every unit is converted explicitly and the conversion is written down; a
// charge in a unit the engine does not support becomes a named unmodeled
// item, never a guess.

const json = (s) => (typeof s === 'string' ? JSON.parse(s) : s ?? null);
const money = (x) => `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
// URDB stores a few rates as text ("8.18"), so every rate is read as a number.
const rateOf = (t) => Number(t?.rate ?? 0) + Number(t?.adj ?? 0);
const nonzero = (strux) => (strux ?? []).flat().some((p) => Object.values(p).flat().some((t) => rateOf(t) !== 0));
const ENERGY_BASIS = { kWh: 'kWh', 'kWh daily': 'kWh per day', 'kWh/kW': 'kWh per kW' };
const DEMAND_UNITS = { kW: ['kW', false], kVA: ['kVA', false], 'kW daily': ['kW', true], 'kVA daily': ['kVA', true] };

/** Tiers with URDB's cumulative max turned into each tier's own allowance, and adj added to rate. */
function tiersOf(list) {
  let below = 0;
  return (list ?? []).map((t) => {
    const tier = { rate: Number(rateOf(t).toFixed(8)) };
    if (t.max !== undefined && t.max !== null) {
      tier.upTo = Number((Number(t.max) - below).toFixed(6));
      below = Number(t.max);
    }
    return tier;
  });
}

/**
 * @param {any} r a row of the urdb rates table
 * @returns {any} the tariff record
 */
export function fromUrdb(r) {
  const unmodeled = [];
  const conversions = [];
  const rec = {
    id: r.label, name: r.rate_name, utility: r.utility_name, utilityId: r.utility_id, state: r.state, sector: r.sector,
    serviceType: r.service_type, source: r.source_reference, effective: r.effective_date, end: r.end_date, lastRevised: r.last_revised,
    fixed: null, minimum: null, energy: null, demand: null, flatDemand: null, ratchet: null,
    demandWindowMinutes: 15, demandWindowStated: false, reactivePowerCharge: null, unmodeled, conversions,
  };

  if (r.fixed_charge) {
    const per = { '$/month': 'month', '$/day': 'day' }[r.fixed_charge_units ?? '$/month'];
    if (!r.fixed_charge_units) conversions.push('Fixed charge units are not stated; URDB\'s default, $ a month, is used.');
    if (per) {
      rec.fixed = { amount: r.fixed_charge, per };
      if (per === 'day') conversions.push(`Fixed charge: ${money(r.fixed_charge)} a day, times the days in each billing period.`);
    } else unmodeled.push(`fixed charge in ${r.fixed_charge_units}`);
  }
  if (r.min_charge) {
    const per = { '$/month': 'month', '$/day': 'day', '$/year': 'year' }[r.min_charge_units ?? '$/month'];
    if (per) {
      rec.minimum = { amount: r.min_charge, per };
      if (per === 'day') conversions.push(`Minimum charge: ${money(r.min_charge)} a day, times the days in each billing period.`);
      if (per === 'year') conversions.push(`Minimum charge: ${money(r.min_charge)} a year, one twelfth (${money(Math.round((r.min_charge / 12) * 1e6) / 1e6)}) each month.`);
    } else unmodeled.push(`minimum charge in ${r.min_charge_units}`);
  }

  const energy = json(r.energy_rate_structure);
  if (energy?.length) {
    const units = new Set(energy.flat().flatMap((p) => (p.energyRateTiers ?? []).map((t) => t.unit ?? 'kWh')));
    const bad = [...units].filter((u) => !ENERGY_BASIS[u]);
    if (bad.length) unmodeled.push(...bad.map((u) => `energy tiers in ${u}`));
    else {
      rec.energy = {
        periods: energy.map((p) => ({ tiers: tiersOf(p.energyRateTiers).map((t, i) => ({ ...t, basis: ENERGY_BASIS[p.energyRateTiers[i].unit ?? 'kWh'] })) })),
        weekday: json(r.energy_weekday_schedule), weekend: json(r.energy_weekend_schedule) ?? json(r.energy_weekday_schedule),
      };
      if (units.has('kWh daily')) conversions.push('Energy tiers in kWh per day: each allowance times the days in the billing period.');
      if (units.has('kWh/kW')) conversions.push('Energy tiers in kWh per kW: each allowance times the month\'s billing demand.');
    }
    if (energy.flat().some((p) => (p.energyRateTiers ?? []).some((t) => t.sell))) unmodeled.push('export (sell) rates');
  }

  const demandUnit = (u, what) => {
    const known = DEMAND_UNITS[u ?? 'kW'];
    if (!u) conversions.push(`${what} units are not stated; URDB's default, $ per kW, is used.`);
    if (known?.[1]) conversions.push(`${what} is a daily demand charge: each day's highest demand, summed over the billing period.`);
    if (known?.[0] === 'kVA') conversions.push(`${what} is billed per kVA of apparent power, which needs kVA (or kW and power factor) from the meter.`);
    return known;
  };
  const tou = json(r.demand_rate_structure);
  if (tou?.length && nonzero(tou)) {
    const u = demandUnit(r.demand_rate_units, 'Time-of-use demand');
    if (u) rec.demand = { unit: u[0], daily: u[1], periods: tou.map((p) => ({ tiers: tiersOf(p.demandRateTiers) })), weekday: json(r.demand_weekday_schedule), weekend: json(r.demand_weekend_schedule) ?? json(r.demand_weekday_schedule) };
    else unmodeled.push(`time-of-use demand charge in ${r.demand_rate_units}`);
  }
  const flat = json(r.flat_demand_structure);
  if (flat?.length && nonzero(flat)) {
    const u = demandUnit(r.flat_demand_units, 'Monthly demand');
    if (u) rec.flatDemand = { unit: u[0], daily: u[1], periods: flat.map((p) => ({ tiers: tiersOf(p.flatDemandTiers) })), months: json(r.flat_demand_months) ?? Array(12).fill(0) };
    else unmodeled.push(`monthly demand charge in ${r.flat_demand_units}`);
  }
  if (nonzero(json(r.coincident_rate_structure))) unmodeled.push('coincident demand charge');

  const ratchet = json(r.demand_ratchet_percentage);
  if ((ratchet ?? []).some((x) => x > 0) || r.lookback_percent > 0) {
    rec.ratchet = {
      percentByMonth: ratchet ?? Array(12).fill(0),
      lookbackPercent: r.lookback_percent ?? 0,
      lookbackMonths: json(r.lookback_months),
      lookbackRange: r.lookback_range ?? null,
    };
  }
  if (r.demand_window) {
    rec.demandWindowMinutes = r.demand_window;
    rec.demandWindowStated = true;
  } else if (rec.demand || rec.flatDemand) conversions.push('URDB does not state the demand window; 15 minutes is assumed. Check the tariff and change it if it says 30 or 60.');
  if (r.reactive_power_charge) rec.reactivePowerCharge = r.reactive_power_charge;
  if (json(r.fuel_adjustments_monthly)?.some?.((x) => x)) unmodeled.push('monthly fuel adjustments');
  return rec;
}

/**
 * The fixed charge for one billing period, with the conversion written out.
 * @returns {{amount: number, text: string} | null}
 */
export function fixedFor(rec, days) {
  if (!rec.fixed) return null;
  if (rec.fixed.per === 'day') return { amount: Math.round(rec.fixed.amount * days * 1e6) / 1e6, text: `${days} days × ${money(rec.fixed.amount)}/day` };
  return { amount: rec.fixed.amount, text: `${money(rec.fixed.amount)} a month` };
}

/** The minimum charge for one billing period, with the conversion written out. */
export function minimumFor(rec, days) {
  if (!rec.minimum) return null;
  const m = rec.minimum;
  if (m.per === 'day') return { amount: Math.round(m.amount * days * 1e6) / 1e6, text: `${days} days × ${money(m.amount)}/day` };
  if (m.per === 'year') return { amount: Math.round((m.amount / 12) * 1e6) / 1e6, text: `${money(m.amount)} a year ÷ 12` };
  return { amount: m.amount, text: `${money(m.amount)} a month` };
}

const FLAT_SCHEDULE = () => Array.from({ length: 12 }, () => Array(24).fill(0));

/**
 * The manual tariff form as a tariff record: a fixed charge, one energy rate (or two, split at a monthly
 * kWh allowance), and an optional monthly demand charge.
 * @param {{name?: string, fixedMonthly?: number, energyRate: number, tierKwh?: number, energyRate2?: number, demandRate?: number, demandWindowMinutes?: number}} f rates in $
 */
export function fromManual(f) {
  const tiers = f.tierKwh > 0 && f.energyRate2 !== undefined
    ? [{ rate: f.energyRate, upTo: f.tierKwh, basis: 'kWh' }, { rate: f.energyRate2, basis: 'kWh' }]
    : [{ rate: f.energyRate, basis: 'kWh' }];
  return {
    id: 'manual', name: f.name ?? 'Entered by hand', utility: null, utilityId: null, state: null, sector: null, serviceType: null, source: null, effective: null, end: null, lastRevised: null,
    fixed: f.fixedMonthly ? { amount: f.fixedMonthly, per: 'month' } : null,
    minimum: null,
    energy: { periods: [{ tiers }], weekday: FLAT_SCHEDULE(), weekend: FLAT_SCHEDULE() },
    demand: null,
    flatDemand: f.demandRate ? { unit: 'kW', daily: false, periods: [{ tiers: [{ rate: f.demandRate }] }], months: Array(12).fill(0) } : null,
    ratchet: null,
    demandWindowMinutes: f.demandWindowMinutes ?? 15, demandWindowStated: f.demandWindowMinutes !== undefined, reactivePowerCharge: null,
    unmodeled: [], conversions: [],
  };
}
