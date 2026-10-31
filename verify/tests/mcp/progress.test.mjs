// Progress and cancellation (MCP task 1.4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from '../../../mcp/protocol.mjs';
import { modern } from './mcp-helpers.mjs';
import { tempDir } from '../../lib/temp.mjs';

const call = (id, name, args, meta = {}) => {
  const m = modern(id, 'tools/call', { name, arguments: args });
  Object.assign(m.params._meta, meta);
  return m;
};

test('a long request with a progress token gets a notification at least once a second after its first second', async () => {
  const notes = [];
  const slow = async (_args, run) => {
    for (let i = 1; i <= 25; i++) { await new Promise((r) => setTimeout(r, 100)); run.progress(i / 25, 'counting'); }
    return { content: [{ type: 'text', text: '{}' }], structuredContent: { results: [] }, isError: false };
  };
  const s = createServer({ notify: (m) => notes.push([performance.now(), m]), handlers: { gridprims_search: slow } });
  const t0 = performance.now();
  const r = await s.handle(call(1, 'gridprims_search', { query: 'x' }, { progressToken: 'p1' }));
  assert.equal(r.result.isError, false);
  assert.ok(notes.length >= 2, `${notes.length} notifications in ${Math.round(performance.now() - t0)} ms`);
  for (const [, m] of notes) assert.deepEqual([m.method, m.params.progressToken, m.params.total], ['notifications/progress', 'p1', 1]);
  const times = notes.map(([t]) => t - t0);
  assert.ok(times[0] >= 950 && times[0] < 1300, `first notification at ${Math.round(times[0])} ms`);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] < 1200);
});

test('without a progress token, no notifications are sent', async () => {
  const notes = [];
  const s = createServer({ notify: (m) => notes.push(m) });
  await s.handle(call(1, 'gridprims_search', { query: '12 MWh to MMBtu' }));
  assert.deepEqual(notes, []);
});

test('cancel a long request: the work stops within 100 ms and no result is sent', async () => {
  let stoppedAt = null;
  const long = (_args, run) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ content: [], structuredContent: {}, isError: false }), 5000);
    run.signal.addEventListener('abort', () => { stoppedAt = performance.now(); clearTimeout(timer); reject(run.signal.reason); });
  });
  const s = createServer({ handlers: { gridprims_search: long } });
  const pending = s.handle(call(7, 'gridprims_search', { query: 'x' }));
  await new Promise((r) => setTimeout(r, 50));
  const sent = performance.now();
  await s.handle({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 7, reason: 'user' } });
  assert.equal(await pending, null);
  assert.ok(stoppedAt - sent < 100, `stopped ${Math.round(stoppedAt - sent)} ms after the cancel`);
});

test('a real file read can be canceled mid-parse', async () => {
  const dir = realpathSync(tempDir('gridprims-big-'));
  const lines = ['Interval Start,kWh'];
  const t0 = Date.parse('2020-01-01T00:00:00Z');
  for (let i = 0; i < 200_000; i++) lines.push(`${new Date(t0 + i * 900_000).toISOString().slice(0, 16).replace('T', ' ')},${i % 7}`);
  writeFileSync(join(dir, 'big.csv'), lines.join('\n'));
  const s = createServer({ allowDirs: [dir] });
  const pending = s.handle(call(9, 'gridprims_analyze_file', { path: 'big.csv', zone: 'America/Phoenix' }, { progressToken: 'p9' }));
  await new Promise((r) => setTimeout(r, 5));
  await s.handle({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 9 } });
  assert.equal(await pending, null);
});
