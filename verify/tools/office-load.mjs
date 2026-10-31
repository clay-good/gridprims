// Writes the synthetic office load used by the bill engine cross-check
// (add-load-and-bill-analyzer task 3.5): 8,760 hourly kW for 2018, a year that
// starts on a Monday, from a stated formula, so anyone may redistribute it.
// A 40 kW base; 60 kW more from 8 am to 6 pm on weekdays; summer cooling up to
// 50 kW on weekday afternoons; winter heating up to 20 kW on weekday mornings.
//   node verify/tools/office-load.mjs > verify/fixtures/bill/office-2018-hourly.csv

const lines = ['hour_start_utc,kw'];
for (let h = 0; h < 8760; h++) {
  const t = new Date(Date.UTC(2018, 0, 1) + h * 3_600_000);
  const hour = t.getUTCHours();
  const weekday = t.getUTCDay() >= 1 && t.getUTCDay() <= 5;
  const dayOfYear = Math.floor(h / 24);
  const summer = Math.max(0, Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI)); // peaks late June
  const winter = Math.max(0, -Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI));
  let kw = 40;
  if (weekday && hour >= 8 && hour < 18) kw += 60;
  if (weekday && hour >= 12 && hour < 18) kw += 50 * summer * (1 - Math.abs(hour - 15) / 4);
  if (weekday && hour >= 7 && hour < 11) kw += 20 * winter;
  lines.push(`${t.toISOString().slice(0, 19)}Z,${kw.toFixed(3)}`);
}
console.log(lines.join('\n'));
