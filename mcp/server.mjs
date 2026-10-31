#!/usr/bin/env node
// The local-only gridprims MCP server over stdio (agent/mcp-server).
//   node mcp/server.mjs [--allow-dir <folder>]... [--debug]
// stdout carries only MCP messages, one JSON-RPC message per line; logs go to
// stderr. It never opens a network connection and exits when stdin closes.

import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createServer } from './protocol.mjs';
import { realAllowDirs } from './files.mjs';

const { values } = parseArgs({
  options: { 'allow-dir': { type: 'string', multiple: true, default: [] }, debug: { type: 'boolean', default: false } },
  strict: true,
});

const log = (line) => process.stderr.write(`gridprims: ${line}\n`);
const send = (msg) => { if (msg) process.stdout.write(JSON.stringify(msg) + '\n'); };
const server = createServer({ allowDirs: realAllowDirs(values['allow-dir']), debug: values.debug, log, notify: send });

const pending = new Set();
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: each line must be one JSON-RPC message' } });
    return;
  }
  // Requests run concurrently, so a cancellation can arrive while one is working.
  const p = server.handle(msg).then(send, (e) => {
    log(`internal error in ${msg?.method}`);
    if (values.debug) log(String(e?.stack ?? e));
    send({ jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32603, message: 'Internal error' } });
  });
  pending.add(p);
  p.finally(() => pending.delete(p));
});
lines.on('close', async () => {
  await Promise.all(pending);
  process.exit(0);
});
