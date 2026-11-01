// Normalize EIA-930's per-balancing-authority workbooks ("Published Hourly
// Data" sheet): one row per region and hour from 2018-07-01, when EIA's
// consumption-based CO2 intensity begins (add-hourly-carbon design D4).
// EIA labels each hour by its UTC end; every row here is converted to its UTC
// hour start on import (design D6), so tools only ever see hour-start values.
// Values are EIA's "Adjusted" series: reported, or imputed where EIA imputed.

/** The first hour kept: EIA's consumption-based intensity starts here. */
export const FIRST_HOUR = Date.UTC(2018, 6, 1) / 3_600_000;
const HOUR_MS = 3_600_000;
const EXCEL_EPOCH_DAYS = 25569; // 1970-01-01 as an Excel 1900-system serial

/** Fuel codes in EIA's column order. Battery storage (BAT) and solar or wind with batteries (SNB, WNB) start 2025-01-01. */
export const FUELS = ['COL', 'NG', 'NUC', 'OIL', 'GEO', 'WAT', 'PS', 'SUN', 'SNB', 'WND', 'WNB', 'BAT', 'OES', 'UES', 'OTH', 'UNK'];

/**
 * [output name, EIA header, unit, scale]. Megawatt-hours are whole numbers and ship as scaled int32 (scale 1,
 * docs/formats/column-shard.md). CO2 and intensity (scale null) ship as float32, seven significant digits
 * (intensity within 0.0001 lb/MWh of EIA's): EIA's files hold outliers no fixed scale fits, such as one hour
 * of 224 million metric tons consumed.
 */
const COLUMNS = [
  ['demand', 'Adjusted demand', 'MWh', 1],
  ['net_generation', 'Adjusted net generation', 'MWh', 1],
  ['interchange', 'Adjusted total interchange', 'MWh (positive is a net outflow)', 1],
  ...FUELS.map((f) => [`gen_${f.toLowerCase()}`, `Adjusted ${f} Gen`, 'MWh', 1]),
  ['co2_generated', 'CO2 Emissions Generated', 'metric tons', null],
  ['intensity_generated', 'CO2 Emissions Intensity for Generated Electricity', 'lb/kWh (production-based)', null],
  ['intensity_consumed', 'CO2 Emissions Intensity for Consumed Electricity', 'lb/kWh (consumption-based)', null],
];
/** Headers every file must carry; a fuel column a region never had may be absent and is then missing, never zero. */
const REQUIRED = ['BA', 'UTC time', ...COLUMNS.filter(([n]) => !n.startsWith('gen_')).map(([, h]) => h)];

export const SCHEMA = [
  { name: 'ba', type: 'str' },
  { name: 'year', type: 'i32', unit: 'UTC year of the hour start', scale: 1 },
  { name: 'hour', type: 'i32', unit: 'hours since 1970-01-01T00:00Z, the hour start', scale: 1 },
  ...COLUMNS.map(([name, , unit, scale]) => (scale ? { name, type: 'i32', unit, scale } : { name, type: 'f32', unit })),
];

/** A cell's number, rounded to the column's scale or to float32, so a shard reads back exactly what was written. */
const scaled = (cell, scale) => (cell && cell.type === 'n' && Number.isFinite(cell.value) ? (scale ? Math.round(cell.value * scale) / scale : Math.fround(cell.value)) : null);

/**
 * The UTC hour start of an EIA "UTC time" cell (an Excel serial of the hour's end), in hours since 1970.
 * Rounded to the hour: serials carry floating-point noise of well under a second.
 */
export function hourStartOf(serial) {
  return Math.round(((serial - EXCEL_EPOCH_DAYS) * 86_400_000) / HOUR_MS) - 1;
}

/**
 * @param {Record<string, () => Promise<Array<Array<{value: any, type: string} | null>>>>} input one loader per region file
 */
export async function normalize(input) {
  const rows = [];
  const problems = [];
  for (const [ba, load] of Object.entries(input)) {
    let sheet;
    try { sheet = await load(); } catch (e) { problems.push(`${ba}: ${e.message}`); continue; }
    const header = (sheet[0] ?? []).map((c) => (c ? String(c.value).trim() : null));
    const missing = REQUIRED.filter((h) => !header.includes(h));
    if (missing.length) { problems.push(`${ba}: header lacks ${missing.join(', ')}`); continue; }
    const at = Object.fromEntries(COLUMNS.map(([name, h]) => [name, header.indexOf(h)]));
    const baAt = header.indexOf('BA');
    const utcAt = header.indexOf('UTC time');
    const mine = [];
    for (let i = 1; i < sheet.length; i++) {
      const r = sheet[i];
      if (!r) continue;
      const code = r[baAt]?.value;
      if (code !== ba) { problems.push(`${ba}: row ${i + 1} is for ${JSON.stringify(code)}`); break; }
      const utc = r[utcAt];
      if (!utc || utc.type !== 'n') { problems.push(`${ba}: row ${i + 1} has no UTC time`); break; }
      const hour = hourStartOf(utc.value);
      if (hour < FIRST_HOUR) continue;
      const row = { ba, year: new Date(hour * HOUR_MS).getUTCFullYear(), hour };
      for (const [name, , , scale] of COLUMNS) row[name] = at[name] < 0 ? null : scaled(r[at[name]], scale);
      mine.push(row);
    }
    mine.sort((a, b) => a.hour - b.hour);
    for (const row of mine) rows.push(row);
  }
  return { rows, problems };
}
