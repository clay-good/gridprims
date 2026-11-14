// The one entry point both surfaces call (docs/decisions-day-one.md §2).
// It checks inputs against the manifest, runs the tool, applies the declared
// rounding, and attaches the validation level, so the website and the MCP
// server cannot return different shapes or different numbers.

import { VALIDATION_LEVELS } from './manifest.mjs';
import { applyRounding, formatNumber, sigFigsOf } from '../lib/precision.mjs';
import { parseLength } from '../lib/field-length.mjs';

const kindWords = (kinds) => kinds.join(' or ');

/** A length as typed (22' 4", 22-4, 6.81 m, or a number of inches), in inches, within the input's range. */
function lengthOf(given, inp) {
  let inches;
  if (typeof given === 'number') inches = given;
  else {
    const r = parseLength(given);
    if (r.error) return { error: r.error };
    inches = r.ft * 12;
  }
  if (!Number.isFinite(inches) || inches < 0) return { error: `${inp.label} must be a length of zero or more.` };
  if (inp.range && (inches < inp.range.min || inches > inp.range.max)) return { error: `Use a length from ${inp.range.min.toLocaleString('en-US')} to ${inp.range.max.toLocaleString('en-US')} in.` };
  return { inches };
}

/**
 * A list with fixed, typed columns: an array of objects, or text with one row a line and cells separated by
 * commas in column order. Each cell is coerced by its column; an error names the row and the column.
 */
function rowsOf(given, inp) {
  const list = Array.isArray(given) ? given
    : String(given).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => Object.fromEntries(l.split(',').map((c, i) => [inp.columns[i]?.name ?? `extra${i}`, c.trim()])));
  if (list.length > inp.maxRows) return { error: `${inp.label} holds at most ${inp.maxRows.toLocaleString('en-US')} rows; there are ${list.length.toLocaleString('en-US')}.` };
  const rows = [];
  for (const [i, row] of list.entries()) {
    const out = {};
    for (const c of inp.columns) {
      const v = row?.[c.name];
      const where = `Row ${i + 1}, ${c.label.toLowerCase()}`;
      if (v === undefined || v === null || v === '') return { error: `${where}: missing.` };
      if (c.type === 'number') {
        const n = Number(String(v).replace(/[,$\s]/g, ''));
        if (!Number.isFinite(n) || n < c.range.min || n > c.range.max) return { error: `${where}: use a number from ${c.range.min} to ${c.range.max}.` };
        out[c.name] = n;
      } else if (c.type === 'enum') {
        if (!c.options.some((o) => o.value === v)) return { error: `${where}: pick one of ${c.options.map((o) => o.value).join(', ')}.` };
        out[c.name] = v;
      } else if (c.type === 'length') {
        const r = lengthOf(v, c);
        if (r.error) return { error: `${where}: ${r.error}` };
        out[c.name] = r.inches;
      } else out[c.name] = String(v);
    }
    rows.push(out);
  }
  return { rows };
}

/**
 * Check raw inputs against the manifest and coerce them to their types.
 * @param {any} manifest
 * @param {Record<string, unknown>} raw
 * @returns {{values: Record<string, any>, errors: Array<{field: string, message: string}>, measuredSigFigs: number}}
 */
export function checkInputs(manifest, raw) {
  const values = {};
  const errors = [];
  let measuredSigFigs = Infinity;
  for (const inp of manifest.inputs) {
    if (inp.type === 'file') continue;
    let given = raw?.[inp.name];
    // An optional input left out takes its neutral value, so a caller that never heard of it is not refused.
    if ((given === undefined || given === null || given === '') && inp.optional) given = inp.example;
    if (given === undefined || given === null || given === '') {
      errors.push({
        field: inp.name,
        message: inp.type === 'enum'
          ? `Choose ${inp.label.toLowerCase()}: one of ${inp.options.map((o) => o.value).join(', ')}.`
          : inp.type === 'handle'
            ? `Load a ${kindWords(inp.accepts)} file for ${inp.label.toLowerCase()}.`
            : `Enter ${inp.label.toLowerCase()}, for example ${inp.example}.`,
      });
      continue;
    }
    if (inp.type === 'handle') {
      // A loaded file, by kind: a meter file is never read as a standards file, or the other way round.
      const kind = typeof given === 'object' ? given.kind : null;
      if (!kind) errors.push({ field: inp.name, message: `Load a ${kindWords(inp.accepts)} file for ${inp.label.toLowerCase()}.` });
      else if (!inp.accepts.includes(kind)) errors.push({ field: inp.name, message: `${inp.label} takes a ${kindWords(inp.accepts)} file; this is a ${kind} file.` });
      else values[inp.name] = given;
      continue;
    }
    if (inp.type === 'length') {
      const r = lengthOf(given, inp);
      if (r.error) errors.push({ field: inp.name, message: r.error });
      else values[inp.name] = r.inches;
      continue;
    }
    if (inp.type === 'rows') {
      const r = rowsOf(given, inp);
      if (r.error) errors.push({ field: inp.name, message: r.error });
      else values[inp.name] = r.rows;
      continue;
    }
    if (inp.type === 'number') {
      const text = String(given).trim();
      // People type "$4", "1,036", or "12 " as numbers; the unit lives in the field.
      const n = Number(text.replace(/[,$\s]/g, ''));
      if (!Number.isFinite(n)) {
        errors.push({ field: inp.name, message: `Type a number for ${inp.label.toLowerCase()}, such as ${inp.example}.` });
      } else if (n < inp.range.min || n > inp.range.max) {
        errors.push({ field: inp.name, message: `Use a value from ${inp.range.min.toLocaleString('en-US')} to ${inp.range.max.toLocaleString('en-US')}.` });
      } else {
        values[inp.name] = n;
        if (inp.precision === 'measured' && n !== 0) measuredSigFigs = Math.min(measuredSigFigs, sigFigsOf(text));
      }
    } else if (inp.type === 'enum') {
      if (!inp.options.some((o) => o.value === given)) {
        errors.push({ field: inp.name, message: `Pick one of: ${inp.options.map((o) => o.label).join(', ')}.` });
      } else values[inp.name] = given;
    } else {
      values[inp.name] = String(given);
    }
  }
  return { values, errors, measuredSigFigs };
}

/**
 * The unit of an input or output: fixed in the manifest, or taken from the
 * option chosen in the enum input it names in `unitFrom`.
 * @param {any} manifest
 * @param {any} field
 * @param {Record<string, any>} values
 */
export function unitOf(manifest, field, values) {
  if (field.unitless) return '';
  if (typeof field.unit === 'string') return field.unit;
  const source = manifest.inputs.find((i) => i.name === field.unitFrom);
  const opt = source?.options.find((o) => o.value === values[field.unitFrom]);
  return opt?.unit ?? opt?.value ?? '';
}

/**
 * Run a tool and return the structured result.
 * @param {any} manifest
 * @param {{compute: (values: Record<string, any>) => any}} impl
 * @param {Record<string, unknown>} raw
 */
export function runTool(manifest, impl, raw) {
  const base = { toolId: manifest.id, toolVersion: manifest.version };
  const { values, errors, measuredSigFigs } = checkInputs(manifest, raw);
  if (errors.length) return { status: 'invalid', ...base, errors };

  const r = impl.compute(values);
  if (r.status === 'refused') return { status: 'refused', ...base, reason: r.reason, limitsUrl: r.limitsUrl };
  if (r.status === 'invalid') return { status: 'invalid', ...base, errors: r.errors };

  const level = VALIDATION_LEVELS[manifest.validation.level];
  const outputs = {};
  const notes = [];
  for (const out of manifest.outputs) {
    const raw = r.outputs[out.name];
    if (raw === undefined) continue;
    // A tool may narrow precision further (for example when a constant it used
    // carries fewer figures); the manifest rule and measured inputs cap it.
    let rule = out.rounding;
    const narrowed = r.rounding?.[out.name]?.sigFigs;
    if (narrowed !== undefined) rule = { sigFigs: Math.min(narrowed, rule.sigFigs ?? narrowed) };
    if (Number.isFinite(measuredSigFigs)) {
      const before = formatNumber(raw, rule);
      rule = { sigFigs: Math.min(rule.sigFigs ?? measuredSigFigs, measuredSigFigs) };
      if (formatNumber(raw, rule) !== before) {
        notes.push(`A value you entered carries ${measuredSigFigs} significant figure${measuredSigFigs === 1 ? '' : 's'}, which limits ${out.label.toLowerCase()}.`);
      }
    }
    const value = applyRounding(raw, rule);
    outputs[out.name] = { value, unit: unitOf(manifest, out, values), display: formatNumber(raw, rule) };
  }

  return {
    status: 'ok',
    ...base,
    outputs,
    sentence: typeof r.sentence === 'function' ? r.sentence(outputs) : r.sentence,
    notes,
    work: {
      method: manifest.method,
      steps: r.steps ?? [],
      constants: r.constants ?? [],
      assumptions: manifest.assumptions,
      citations: manifest.citations,
    },
    // Dataset versions and as-of dates join here once tools read snapshots (platform/data-snapshots).
    datasets: manifest.datasets.map((id) => ({ id })),
    stability: manifest.stability,
    validationLevel: level.level,
    validationMeaning: level.meaning,
    ...(manifest.screeningLabel ? { screeningLabel: manifest.screeningLabel } : {}),
  };
}
