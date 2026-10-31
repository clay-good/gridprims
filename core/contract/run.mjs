// The one entry point both surfaces call (docs/decisions-day-one.md §2).
// It checks inputs against the manifest, runs the tool, applies the declared
// rounding, and attaches the validation level, so the website and the MCP
// server cannot return different shapes or different numbers.

import { VALIDATION_LEVELS } from './manifest.mjs';
import { applyRounding, formatNumber, sigFigsOf } from '../lib/precision.mjs';

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
    const given = raw?.[inp.name];
    if (given === undefined || given === null || given === '') {
      errors.push({ field: inp.name, message: `Enter ${inp.label.toLowerCase()}, for example ${inp.example}.` });
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
    stability: manifest.stability,
    validationLevel: level.level,
    validationMeaning: level.meaning,
    ...(manifest.screeningLabel ? { screeningLabel: manifest.screeningLabel } : {}),
  };
}
