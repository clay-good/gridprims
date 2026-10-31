// Helpers for MCP tests: request builders and a stdio client for the real process.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const SERVER = join(ROOT, 'mcp/server.mjs');

/** A modern (2026-07-28) request: the version travels in _meta on every request. */
export const modern = (id, method, params = {}, version = '2026-07-28') => ({
  jsonrpc: '2.0', id, method,
  params: { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': version, 'io.modelcontextprotocol/clientCapabilities': {} } },
});

/**
 * Start the real server, optionally wrapped in a command (a sandbox), and talk to it over stdio.
 * @param {string[]} args server arguments
 * @param {string[]} [wrap] e.g. ['sandbox-exec', '-p', profile]
 */
export function startServer(args = [], wrap = []) {
  const cmd = [...wrap, process.execPath, SERVER, ...args];
  const child = spawn(cmd[0], cmd.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '';
  let stderr = '';
  const waiting = new Map();
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d) => {
    buf += d;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      const msg = JSON.parse(line);
      waiting.get(msg.id)?.(msg);
      waiting.delete(msg.id);
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (d) => { stderr += d; });
  const exited = new Promise((r) => child.once('exit', (code) => r(code)));
  return {
    child,
    get stderr() { return stderr; },
    exited,
    request(msg) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no response to ${msg.method}; stderr: ${stderr}`)), 10_000);
        waiting.set(msg.id, (m) => { clearTimeout(timer); resolve(m); });
        child.stdin.write(JSON.stringify(msg) + '\n');
      });
    },
    raw(line) { child.stdin.write(line + '\n'); },
    close() { child.stdin.end(); return exited; },
  };
}
