// Run the real Worker locally for end-to-end tests: Node's HTTP server turns
// each request into a fetch Request, and the static-asset binding reads dist/.
// D1 and the rate limiter are small in-memory stand-ins.

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import worker from '../../worker/index.mjs';
import { TYPES } from './static-server.mjs';

/** The two D1 statements the Worker runs, kept in memory. */
export function memoryD1() {
  const rows = [];
  const stmt = (sql) => ({
    bind: (...args) => ({
      async run() {
        if (sql.startsWith('INSERT')) rows.push({ id: args[0], received_at: args[1], closed_at: null, payload: args[2] });
        else if (sql.startsWith('DELETE')) for (let i = rows.length - 1; i >= 0; i--) if ((rows[i].closed_at && rows[i].closed_at < args[0]) || rows[i].received_at < args[1]) rows.splice(i, 1);
        return { success: true };
      },
    }),
  });
  return { rows, prepare: stmt };
}

/** The host's per-key limiter. */
export function memoryLimiter(max = 10) {
  const counts = new Map();
  return { async limit({ key }) { const n = (counts.get(key) ?? 0) + 1; counts.set(key, n); return { success: n <= max }; } };
}

/**
 * @param {string} dist
 * @returns {Promise<{url: string, env: any, close: () => Promise<void>}>}
 */
export async function serveWorker(dist) {
  const env = {
    DB: memoryD1(),
    REPORT_LIMITER: memoryLimiter(),
    ASSETS: {
      async fetch(r) {
        const path = decodeURIComponent(new URL(typeof r === 'string' ? r : r.url).pathname);
        const file = join(dist, path.endsWith('/') ? `${path}index.html` : path);
        if (!file.startsWith(dist) || !existsSync(file)) return new Response('not found', { status: 404 });
        return new Response(readFileSync(file), { headers: { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' } });
      },
    },
  };
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
    const out = await worker.fetch(request, env);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = /** @type {{port: number}} */ (server.address());
  return { url: `http://127.0.0.1:${port}`, env, close: () => new Promise((r) => server.close(() => r())) };
}
