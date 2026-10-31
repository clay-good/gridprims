// Writes two more synthetic hourly loads for 2018 beside the office load, from
// stated formulas so anyone may redistribute them (add-ratepayer-tools task
// 1.2's PySAM check): a home (1 kW overnight, morning and evening peaks,
// summer cooling) and a two-shift plant (300 kW base, 900 kW from 6 am to
// 10 pm on weekdays).
//   node verify/tools/more-loads.mjs

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '../fixtures/bill');
const write = (name, kwOf) => {
  const lines = ['hour_start_utc,kw'];
  for (let h = 0; h < 8760; h++) {
    const t = new Date(Date.UTC(2018, 0, 1) + h * 3_600_000);
    lines.push(`${t.toISOString().slice(0, 19)}Z,${kwOf(t, h).toFixed(3)}`);
  }
  writeFileSync(join(DIR, name), lines.join('\n') + '\n');
};
const summer = (h) => Math.max(0, Math.sin(((Math.floor(h / 24) - 80) / 365) * 2 * Math.PI));
write('home-2018-hourly.csv', (t, h) => {
  const hr = t.getUTCHours();
  return 1 + (hr >= 6 && hr < 9 ? 1.5 : 0) + (hr >= 17 && hr < 22 ? 2.5 : 0) + (hr >= 13 && hr < 20 ? 3 * summer(h) : 0);
});
write('plant-2018-hourly.csv', (t) => {
  const wd = t.getUTCDay() >= 1 && t.getUTCDay() <= 5;
  const hr = t.getUTCHours();
  return 300 + (wd && hr >= 6 && hr < 22 ? 600 : 0);
});
