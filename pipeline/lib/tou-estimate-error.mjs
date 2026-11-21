// The error of the time-of-use estimate from totals (add-household-bill-check 3.3; plan-finder, "Estimate error
// published"): a home's year priced exactly from its hourly meter data, and again from its monthly totals spread by
// the state's typical pattern, on the same rate; the percent difference is the estimate's error for that home.

import { estimateTou } from '../../core/lib/typical-shape.mjs';
import { priceTotals } from '../../core/lib/bill-totals.mjs';
import { intervalBills } from '../../core/lib/interval-bill.mjs';
import { fromUrdb } from '../../core/lib/tariff-record.mjs';
import { toTariff } from '../../core/lib/urdb-tariff.mjs';

const HOUR = 3_600_000;
const pad = (n) => String(n).padStart(2, '0');

/**
 * @param {{state: string, zone: string, hourlyKwh: number[]}} home hourly kWh from 2018-01-01 00:00 in the zone's standard time
 * @param {any} row the URDB rate row
 * @param {number[][][]} shape the state's typical pattern
 * @returns {{exact: number, estimate: number, percent: number, months: Array<{month: string, exact: number, estimate: number}>}}
 */
export function touEstimateError(home, row, shape) {
  const offsetHours = -Number(/Etc\/GMT([+-]\d+)/.exec(home.zone)[1]);
  const t0 = Date.UTC(2018, 0, 1) - offsetHours * HOUR;
  const series = { startMs: Float64Array.from(home.hourlyKwh, (_, i) => t0 + i * HOUR), kwh: Float64Array.from(home.hourlyKwh), intervalMinutes: 60 };
  const exactBills = intervalBills(series, fromUrdb(row), { zone: home.zone });
  const { tariff, tou } = toTariff(row);
  const months = exactBills.months.map((m, i) => {
    const y = 2018; const mm = i + 1;
    const start = `${y}-${pad(mm)}-01`;
    const end = `${y}-${pad(mm)}-${pad(new Date(Date.UTC(y, mm, 0)).getUTCDate())}`;
    const kwh = Math.round(m.kwh);
    const period = { start, end, kwh, ...(tou ? { tou: estimateTou({ start, end, kwh }, shape, { weekday: JSON.parse(row.energy_weekday_schedule), weekend: JSON.parse(row.energy_weekend_schedule ?? row.energy_weekday_schedule) }) } : {}) };
    return { month: `${y}-${pad(mm)}`, exact: m.total, estimate: priceTotals(period, tariff).totalCents / 100 };
  });
  const exact = Math.round(months.reduce((t, m) => t + m.exact, 0) * 100) / 100;
  const estimate = Math.round(months.reduce((t, m) => t + m.estimate, 0) * 100) / 100;
  return { exact, estimate, percent: Math.round(((estimate - exact) / exact) * 1000) / 10, months };
}
