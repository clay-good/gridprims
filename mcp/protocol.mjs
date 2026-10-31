// JSON-RPC dispatch for the MCP server (agent/mcp-server, "Protocol versions").
// Dual-era: modern stateless requests carry their version in _meta; legacy
// clients send initialize first. Transport-free, so tests call it directly.

import { TOOL_SURFACE, SERVER_INSTRUCTIONS } from './surface.mjs';
import { createHandlers, fail } from './handlers.mjs';
import { TOOLS } from '../core/tools/index.mjs';
import { limitsRecord } from '../core/contract/limits.mjs';
import { catalog } from './data.mjs';

export const MODERN = '2026-07-28';
export const LEGACY = ['2025-11-25', '2025-06-18'];
export const SUPPORTED = [MODERN, ...LEGACY];
export const SERVER_INFO = { name: 'gridprims', version: '0.1.0' };
export const LIST_TTL_MS = 86_400_000;
export const MAX_MESSAGE_BYTES = 102_400;

/**
 * Keep a tool result's message under the size limit: when the JSON text copy
 * for older clients would push it over, the copy becomes a short note and the
 * structured content (already paged by the tool) stays whole.
 */
function fitResult(result, id) {
  const size = (r) => new TextEncoder().encode(JSON.stringify({ jsonrpc: '2.0', id, result: r })).length;
  if (size(result) <= MAX_MESSAGE_BYTES || !result.structuredContent) return result;
  const note = 'This result is large, so its full detail is in structuredContent only. Page through intervals with nextCursor.';
  return { ...result, content: [{ type: 'text', text: note }] };
}

const VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CAPABILITIES = { tools: { listChanged: false }, resources: { listChanged: false, subscribe: false } };

const RESOURCES = [
  { uri: 'gridprims://limits', name: 'limits', title: 'Limits record', description: 'Every tool\'s stability, validation level with its evidence, and known limits.', mimeType: 'application/json' },
  { uri: 'gridprims://datasets', name: 'datasets', title: 'Dataset catalog', description: 'Every public dataset in this clone with its publisher, license, and as-of date.', mimeType: 'application/json' },
];
const resourceBody = (uri) => {
  if (uri === 'gridprims://limits') return limitsRecord(TOOLS);
  if (uri === 'gridprims://datasets') return { datasets: catalog() };
  return null;
};

/** @typedef {{jsonrpc: '2.0', id?: string | number | null, method?: string, params?: any}} Message */

const error = (id, code, message, data) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } });

/**
 * Check tool arguments against the tool's own input schema: required fields,
 * no unknown fields, and each field's type and bounds. Explicit code for the
 * shapes these six schemas use, not a general JSON Schema validator.
 * @returns {string | null} a message naming the field and the fix
 */
export function checkArguments(schema, args) {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return 'Arguments must be an object.';
  for (const k of schema.required ?? []) if (args[k] === undefined) return `Missing "${k}": ${schema.properties[k].description ?? 'required'}`;
  for (const [k, v] of Object.entries(args)) {
    const p = schema.properties?.[k];
    if (!p) return `Unknown argument "${k}". Accepted: ${Object.keys(schema.properties ?? {}).join(', ')}.`;
    const type = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    if (p.type === 'integer' ? !Number.isInteger(v) : p.type === 'object' ? type !== 'object' : type !== p.type) return `"${k}" must be ${p.type === 'integer' ? 'a whole number' : `a ${p.type}`}.`;
    if (p.enum && !p.enum.includes(v)) return `"${k}" must be one of ${p.enum.join(', ')}.`;
    if (typeof v === 'string' && ((p.minLength && v.length < p.minLength) || (p.maxLength && v.length > p.maxLength))) return `"${k}" must be ${p.minLength ?? 0} to ${p.maxLength ?? 'any number of'} characters.`;
    if (typeof v === 'number' && ((p.minimum !== undefined && v < p.minimum) || (p.maximum !== undefined && v > p.maximum))) return `"${k}" must be from ${p.minimum} to ${p.maximum}.`;
  }
  return null;
}

/**
 * @param {{allowDirs?: string[], log?: (line: string) => void, debug?: boolean, notify?: (msg: object) => void, handlers?: Record<string, Function>}} [opts]
 *   notify sends notifications (progress); handlers replaces tool handlers in tests
 */
export function createServer(opts = {}) {
  const handlers = { ...createHandlers({ allowDirs: opts.allowDirs ?? [] }), ...opts.handlers };
  const notify = opts.notify ?? (() => {});
  /** In-flight tool calls, so a cancellation can stop the work, not just its answer. */
  const inflight = new Map();
  const log = opts.log ?? (() => {});
  const cancelled = new Set();
  let legacyVersion = null;

  /** Fields every modern result carries. */
  const meta = { _meta: { 'io.modelcontextprotocol/serverInfo': SERVER_INFO } };
  const complete = (result) => ({ resultType: 'complete', ...result, ...meta });
  const cacheable = (result) => complete({ ...result, ttlMs: LIST_TTL_MS, cacheScope: 'public' });

  /**
   * Handle one message. Returns the response, or null for notifications and
   * cancelled requests.
   * @param {Message} msg
   * @returns {Promise<object | null>}
   */
  async function handle(msg) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return error(msg?.id, -32600, 'Invalid request');
    const { id, method, params = {} } = msg;
    const isNotification = id === undefined;

    if (method === 'notifications/cancelled') { cancelled.add(params.requestId); inflight.get(params.requestId)?.abort(new Error('canceled by the client')); return null; }
    if (isNotification) return null; // notifications/initialized and others need no answer

    if (method === 'initialize') {
      // Legacy handshake: answer with the requested version when we support
      // it, otherwise with the newest legacy version, as those versions require.
      legacyVersion = LEGACY.includes(params.protocolVersion) ? params.protocolVersion : LEGACY[0];
      return { jsonrpc: '2.0', id, result: { protocolVersion: legacyVersion, capabilities: CAPABILITIES, serverInfo: SERVER_INFO, instructions: SERVER_INSTRUCTIONS } };
    }

    const requested = params._meta?.[VERSION_KEY];
    if (requested !== undefined && !SUPPORTED.includes(requested)) {
      return error(id, -32022, `Unsupported protocol version ${requested}`, { requested, supported: SUPPORTED });
    }

    const respond = (result) => (cancelled.has(id) ? null : { jsonrpc: '2.0', id, result });
    const started = Date.now();
    try {
      switch (method) {
        case 'server/discover':
          return respond(cacheable({ supportedVersions: SUPPORTED, capabilities: CAPABILITIES, instructions: SERVER_INSTRUCTIONS }));
        case 'ping':
          return respond({});
        case 'tools/list':
          return respond(cacheable({ tools: TOOL_SURFACE }));
        case 'resources/list':
          return respond(cacheable({ resources: RESOURCES }));
        case 'resources/read': {
          const body = resourceBody(params.uri);
          if (!body) return error(id, -32602, `Unknown resource ${JSON.stringify(params.uri)}`, { uri: params.uri });
          return respond(cacheable({ contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(body) }] }));
        }
        case 'tools/call': {
          const tool = TOOL_SURFACE.find((t) => t.name === params.name);
          if (!tool) return error(id, -32602, `Unknown tool ${JSON.stringify(params.name)}`, { known: TOOL_SURFACE.map((t) => t.name) });
          const args = params.arguments ?? {};
          const problem = checkArguments(tool.inputSchema, args);
          if (problem) return respond(complete(fail(problem)));
          // Progress at least once a second after the first second of work, when the request asks for it.
          const token = params._meta?.progressToken;
          const controller = new AbortController();
          inflight.set(id, controller);
          let fraction = 0;
          let message = 'working';
          let ticker = null;
          const starter = token === undefined ? null : setTimeout(() => {
            const tick = () => { if (!controller.signal.aborted) notify({ jsonrpc: '2.0', method: 'notifications/progress', params: { progressToken: token, progress: fraction, total: 1, message } }); };
            tick();
            ticker = setInterval(tick, 1000);
          }, 1000);
          let result;
          try {
            result = await handlers[tool.name](args, { signal: controller.signal, progress: (f, m) => { fraction = f; if (m) message = m; } });
          } catch (e) {
            if (controller.signal.aborted) return null; // canceled: send nothing more for this request
            throw e;
          } finally {
            clearTimeout(starter);
            clearInterval(ticker);
            inflight.delete(id);
          }
          if (controller.signal.aborted) return null;
          log(opts.debug ? `${tool.name} ${Date.now() - started} ms ${JSON.stringify(args)}` : `${tool.name} ${Date.now() - started} ms`);
          return respond(complete(fitResult(result, id)));
        }
        default:
          return error(id, -32601, `Method not found: ${method}`);
      }
    } finally {
      cancelled.delete(id);
    }
  }

  return { handle, get legacyVersion() { return legacyVersion; } };
}
