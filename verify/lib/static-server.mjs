// A local static file server for end-to-end tests: serves a folder with the
// right content types, plus optional in-memory routes. Listens on 127.0.0.1 only.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

export const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

/**
 * @param {string} root folder to serve
 * @param {{routes?: Record<string, {body: Uint8Array | string, type?: string}>, headers?: Record<string, string>, port?: number, onRequest?: (r: {method: string, url: string, headers: object, body: string}) => void}} [opts]
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
export async function serve(root, opts = {}) {
  const server = createServer(async (req, res) => {
    if (opts.onRequest) {
      // Record everything the browser sent, for the egress test.
      const chunks = [];
      for await (const c of req) chunks.push(c);
      opts.onRequest({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
    }
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const route = opts.routes?.[path];
    const headers = { 'cache-control': 'no-store', ...opts.headers };
    if (route) {
      res.writeHead(200, { ...headers, 'content-type': route.type ?? 'application/octet-stream' });
      return res.end(route.body);
    }
    const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
    if (file !== normalize(root) && !file.startsWith(normalize(root) + sep)) {
      res.writeHead(403);
      return res.end();
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { ...headers, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, headers);
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(opts.port ?? 0, '127.0.0.1', r));
  const { port } = /** @type {{port: number}} */ (server.address());
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(() => r())) };
}
