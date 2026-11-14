// The CEII gate (add-siting-and-timing task 2.2). Feeder and substation detail
// is Critical Energy/Electric Infrastructure Information, so the queue JSON the
// browser reads carries summaries only: no point of interconnection, no
// substation, no feeder, no line. The published summaries name a place, a
// capacity, a count, and a date, and nothing that locates a connection.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Field names that would place a connection on the grid rather than in a county. */
export const CEII_FIELDS = [
  ['a point of interconnection', /^poi|pointofinterconnect|interconnectionpoint/],
  ['a substation', /substation/],
  ['a feeder', /feeder/],
  ['a circuit', /circuit/],
  ['a transmission line', /transmissionline|linename|lineid|tieline/],
  ['a bus', /^bus(name|id|number|no)?$/],
];

const normal = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Every CEII-shaped field name in a parsed value, by path.
 * @param {unknown} value
 * @param {string} [path]
 * @returns {string[]} `path: name` for each offending field
 */
export function ceiiFindings(value, path = '') {
  if (Array.isArray(value)) return value.flatMap((v, i) => ceiiFindings(v, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return [];
  const found = [];
  for (const [key, v] of Object.entries(value)) {
    const at = path ? `${path}.${key}` : key;
    const hit = CEII_FIELDS.find(([, re]) => re.test(normal(key)));
    if (hit) found.push(`${at}: ${hit[0]}`);
    found.push(...ceiiFindings(v, at));
  }
  return found;
}

/**
 * @param {string} distDir the deploy root
 * @returns {string[]} errors
 */
export function checkCeii(distDir) {
  const dir = join(distDir, 'queue');
  if (!existsSync(dir)) return [];
  const errors = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const file = join(dir, name);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`queue/${name}: not valid JSON (${e.message})`);
      continue;
    }
    for (const finding of ceiiFindings(parsed)) errors.push(`queue/${name}: carries ${finding}, which is CEII`);
  }
  return errors;
}
