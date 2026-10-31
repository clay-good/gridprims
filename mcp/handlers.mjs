// What each meta-tool does. Every calculation goes through the shared core
// (core/contract/run.mjs), so results are the website's results.

import { TOOLS, getTool } from '../core/tools/index.mjs';
import { runTool } from '../core/contract/run.mjs';
import { buildCommandIndex, searchCommands } from '../core/contract/command.mjs';
import { VALIDATION_LEVELS } from '../core/contract/manifest.mjs';
import { checkPath } from './files.mjs';
import { createHandleStore } from './handles.mjs';
import { intakeFile } from '../core/intake/index.mjs';
import { loadStats } from '../core/lib/load-stats.mjs';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { query } from './data.mjs';

export const SITE = 'https://gridprims.com';
const toolPath = (id) => `/tools/${id.split('.').join('/')}/`;
const INDEX = buildCommandIndex(TOOLS, toolPath);

/** A normal tool result: structured content plus the same JSON as text for older clients. */
export const ok = (structured) => ({ content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured, isError: false });
/** A result the model can act on: isError with a message naming the field and the fix. */
export const fail = (message, structured) => ({ content: [{ type: 'text', text: message }], ...(structured ? { structuredContent: structured } : {}), isError: true });

export const PAGE_ROWS = 1000;
const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
const r4 = (x) => (x === null || !Number.isFinite(x) ? x : Math.round(x * 1e4) / 1e4);
const truncate = (t) => [...String(t)].slice(0, 80).join('');

/**
 * The receipt as an agent sees it: computed values and fixed vocabulary only.
 * Every string that came from the file (headers, meter names) is moved into
 * source_text, and series are referred to by index.
 */
export function agentView(result, handle) {
  const rc = result.receipt;
  const sourceText = new Set();
  for (const t of rc.columns.source_text ?? []) sourceText.add(truncate(t));
  for (const v of rc.columns.values ?? []) sourceText.add(truncate(v));
  const zone = rc.time.zone;
  const series = result.series.map((s, index) => {
    if (s.meter) sourceText.add(truncate(s.meter));
    const st = loadStats(s, zone);
    return {
      index, channel: s.channel, intervalMinutes: s.intervalMinutes, unitRead: s.unitRead, quantity: s.quantity,
      intervals: st.intervals, totalKwh: r4(st.totalKwh), peakKw: r4(st.peakKw), peakStartUtc: iso(st.peakStartMs), loadFactor: r4(st.loadFactor),
      monthly: st.monthly.map((m) => ({ month: m.month, kwh: r4(m.kwh), peakKw: r4(m.peakKw), peakStartUtc: iso(m.peakStartMs), intervals: m.intervals })),
      ...(s.meter ? { meterNameInSourceText: true } : {}),
    };
  });
  const seriesIndex = (meter, channel) => result.series.findIndex((s) => s.meter === meter && s.channel === channel);
  return {
    handle,
    format: result.format,
    receipt: {
      file: { size: rc.file.size, rowsRead: rc.file.rowsRead, rowsSkipped: rc.file.rowsSkipped, ...(rc.file.encoding ? { encoding: rc.file.encoding } : {}), ...(rc.file.delimiter ? { delimiter: rc.file.delimiter } : {}) },
      layout: rc.columns.layout,
      time: {
        intervalMinutes: rc.time.intervalMinutes, mixedIntervals: rc.time.mixedIntervals, stampsMark: rc.time.stampsMark, stampsDetected: rc.time.stampsDetected,
        stampsReason: rc.time.stampsReason,
        zone, ...(rc.time.zoneFromFile ? { zoneFromFile: rc.time.zoneFromFile } : {}), firstStartUtc: iso(rc.time.firstMs), lastStartUtc: iso(rc.time.lastMs), months: rc.time.months,
      },
      values: { quantity: rc.values.quantity, unitsRead: rc.values.unitsRead, unitAssumed: Boolean(rc.values.assumption) },
      quality: {
        gaps: rc.quality.gaps.map((g) => ({ series: seriesIndex(g.meter, g.channel), startUtc: iso(g.startMs), endUtc: iso(g.endMs), intervals: g.intervals })),
        duplicates: { identical: rc.quality.duplicates.identical, conflicting: rc.quality.duplicates.conflicting, rule: rc.quality.duplicates.rule },
        repeatedIntervalsKept: rc.quality.dst.repeatedKept,
      },
      choices: rc.choices,
    },
    series,
    source_text: [...sourceText],
  };
}

const encodeCursor = (c) => Buffer.from(JSON.stringify(c)).toString('base64url');
const decodeCursor = (s) => { try { return JSON.parse(Buffer.from(s, 'base64url').toString()); } catch { return null; } };

const unknownTool = (id) => fail(`No tool has the id ${JSON.stringify(id)}. Known tools: ${TOOLS.map((t) => t.manifest.id).join(', ')}. Use gridprims_search to find one.`);

/**
 * One page of a series' intervals: [start UTC, kWh] rows with an opaque, deterministic cursor.
 * @param {{result: any}} entry
 */
function page(entry, handle, index, offset) {
  const s = entry.result.series[index];
  if (!s) return { series: index, rows: [], error: `No series ${index}; this file has ${entry.result.series.length}.` };
  const end = Math.min(offset + PAGE_ROWS, s.startMs.length);
  const rows = [];
  for (let i = offset; i < end; i++) rows.push([iso(s.startMs[i]), s.kwh[i]]);
  return { series: index, columns: ['startUtc', 'kwh'], offset, total: s.startMs.length, rows, ...(end < s.startMs.length ? { nextCursor: encodeCursor({ h: handle, s: index, o: end }) } : {}) };
}

/**
 * @param {{allowDirs: string[], zone?: string, dataDir?: string}} ctx
 */
export function createHandlers(ctx) {
  const handles = createHandleStore();
  const deviceZone = ctx.zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    gridprims_search({ query, limit = 8 }) {
      const results = searchCommands(String(query), INDEX, limit).map((r) => ({
        kind: r.kind, id: r.id, title: r.title, url: SITE + r.url, ...(r.values ? { inputs: r.values } : {}),
      }));
      return ok({ results });
    },

    gridprims_describe({ tool }) {
      const t = getTool(tool);
      if (!t) return unknownTool(tool);
      const m = t.manifest;
      return ok({
        id: m.id, title: m.title, purpose: m.purpose, version: m.version, stability: m.stability,
        validationLevel: m.validation.level, validationMeaning: VALIDATION_LEVELS[m.validation.level].meaning,
        inputs: m.inputs.map(({ name, label, type, unit, unitFrom, range, precision, example, options }) => ({
          name, label, type,
          ...(unit ? { unit } : {}), ...(unitFrom ? { unitFrom } : {}), ...(range ? { range } : {}), ...(precision ? { precision } : {}),
          example, ...(options ? { options: options.map((o) => ({ value: o.value, label: o.label })) } : {}),
        })),
        outputs: m.outputs.map(({ name, label, unit, unitFrom, rounding }) => ({ name, label, ...(unit ? { unit } : {}), ...(unitFrom ? { unitFrom } : {}), rounding })),
        method: m.method, assumptions: m.assumptions, citations: m.citations,
        examples: m.examples.map(({ id, title, inputs, source }) => ({ id, title, inputs, source })),
        limitations: m.limitations, handoffs: m.handoffs, url: SITE + toolPath(m.id),
      });
    },

    gridprims_run({ tool, inputs }) {
      const t = getTool(tool);
      if (!t) return unknownTool(tool);
      const r = runTool(t.manifest, t.impl, inputs ?? {});
      if (r.status === 'invalid') return fail(r.errors.map((e) => `${e.field}: ${e.message}`).join(' '), r);
      return ok(r);
    },

    async gridprims_analyze_file({ path, handle, zone, stampsMark, quantity, series, cursor }) {
      let entry;
      if (cursor !== undefined) {
        const c = decodeCursor(cursor);
        entry = c && handles.get(c.h);
        if (!entry) return fail('That cursor is unknown or its handle expired. Analyze the file again.');
        return ok(page(entry, c.h, c.s, c.o));
      }
      if (handle !== undefined && path === undefined) {
        entry = handles.get(handle);
        if (!entry) return fail('That handle is unknown or expired. Analyze the file again to get a new one.');
        if (zone === undefined && stampsMark === undefined && quantity === undefined) {
          return ok(series === undefined ? entry.view : { ...entry.view, intervals: page(entry, handle, series, 0) });
        }
      }
      const checked = entry ? { ok: true } : checkPath(path, ctx.allowDirs);
      if (!checked.ok) return fail(checked.message);
      const bytes = entry ? entry.bytes : new Uint8Array(readFileSync(checked.path));
      const choices = {
        zone: zone ?? entry?.choices.zone ?? deviceZone, zoneSet: zone !== undefined || Boolean(entry?.choices.zoneSet),
        stampsMark: stampsMark ?? entry?.choices.stampsMark ?? 'auto', quantity: quantity ?? entry?.choices.quantity ?? 'auto',
      };
      const r = await intakeFile(bytes, { name: entry?.name ?? basename(checked.path) }, choices);
      if (!r.ok) return fail(r.message);
      const value = { bytes, name: entry?.name ?? basename(checked.path), choices, result: r };
      const id = handles.put(value);
      value.view = agentView(r, id);
      return ok(series === undefined ? value.view : { ...value.view, intervals: page(value, id, series, 0) });
    },

    gridprims_query_data({ dataset, filter, limit = 100 }) {
      const r = query({ dataset: String(dataset), filter: filter ?? {}, limit }, ctx.dataDir);
      if (!r) return fail(`No dataset named ${JSON.stringify(String(dataset))} is in this clone. The gridprims://datasets resource lists what exists; for full data run node pipeline/get-data.mjs or node pipeline/build-data.mjs.`);
      if (r.error) return fail(r.error);
      const m = r.manifest;
      return ok({
        dataset: { id: m.dataset, version: m.version, title: m.title, publisher: m.publisher, asOf: m.asOf, retrieved: m.retrieved, license: m.license, posture: m.posture, attribution: m.attribution, dataPeriod: r.table.dataPeriod },
        columns: r.table.columns.map(({ name, type, unit }) => ({ name, type, ...(unit ? { unit } : {}) })),
        rows: r.rows, matched: r.matched, ...(r.matched > r.rows.length ? { truncated: true } : {}),
      });
    },

    gridprims_prepare_report({ tool, message, inputs, includeInputs }) {
      const t = tool === undefined ? null : getTool(tool);
      if (tool !== undefined && !t) return unknownTool(tool);
      const payload = {
        toolId: t ? t.manifest.id : '',
        toolVersion: t ? t.manifest.version : '',
        datasets: t ? t.manifest.datasets.map((id) => ({ id, version: '' })) : [],
        pageUrl: t ? SITE + toolPath(t.manifest.id) : SITE + '/',
        message: String(message).slice(0, 4000),
        ...(includeInputs && inputs ? { attachment: { inputs } } : {}),
      };
      // The payload travels only in the fragment, which browsers never send to a server.
      const link = `${SITE}/report/#${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
      const text = `Open this link to review the report in your browser and decide whether to send it. Nothing has been sent.\n${link}`;
      return ok({ payload, link, text });
    },
  };
}
