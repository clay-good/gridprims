// What each meta-tool does. Every calculation goes through the shared core
// (core/contract/run.mjs), so results are the website's results.

import { TOOLS, getTool } from '../core/tools/index.mjs';
import { runTool } from '../core/contract/run.mjs';
import { buildCommandIndex, searchCommands } from '../core/contract/command.mjs';
import { VALIDATION_LEVELS } from '../core/contract/manifest.mjs';
import { checkPath } from './files.mjs';

export const SITE = 'https://gridprims.com';
const toolPath = (id) => `/tools/${id.split('.').join('/')}/`;
const INDEX = buildCommandIndex(TOOLS, toolPath);

/** A normal tool result: structured content plus the same JSON as text for older clients. */
export const ok = (structured) => ({ content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured, isError: false });
/** A result the model can act on: isError with a message naming the field and the fix. */
export const fail = (message, structured) => ({ content: [{ type: 'text', text: message }], ...(structured ? { structuredContent: structured } : {}), isError: true });

const unknownTool = (id) => fail(`No tool has the id ${JSON.stringify(id)}. Known tools: ${TOOLS.map((t) => t.manifest.id).join(', ')}. Use gridprims_search to find one.`);

/**
 * @param {{allowDirs: string[]}} ctx
 */
export function createHandlers(ctx) {
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

    gridprims_analyze_file({ path, handle }) {
      if (handle !== undefined) return fail('That handle is unknown or expired. Analyze the file again to get a new one.');
      const checked = checkPath(path, ctx.allowDirs);
      if (!checked.ok) return fail(checked.message);
      // The path passed every check, but nothing is read until intake can turn
      // the file into an interval series (foundation tasks 6.1 to 6.6).
      return fail('This file is allowed, but this build cannot read meter files yet: file intake is still being built. Nothing was read.');
    },

    gridprims_query_data({ dataset }) {
      return fail(`No dataset named ${JSON.stringify(String(dataset))} is in this clone. No public datasets are built yet; the gridprims://datasets resource lists what exists.`);
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
