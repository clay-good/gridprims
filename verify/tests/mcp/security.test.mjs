import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPath, MAX_FILE_BYTES, realAllowDirs } from '../../../mcp/files.mjs';
import { createServer } from '../../../mcp/protocol.mjs';
import { TOOLS } from '../../../core/tools/index.mjs';
import { modern, startServer } from './mcp-helpers.mjs';

const base = realpathSync(mkdtempSync(join(tmpdir(), 'gridprims-allow-')));
const allowed = join(base, 'allowed');
const outside = join(base, 'outside');
mkdirSync(join(allowed, 'sub'), { recursive: true });
mkdirSync(outside);
writeFileSync(join(allowed, 'meter.csv'), 'Date,kWh\n2026-01-01,1\n');
writeFileSync(join(outside, 'id_rsa'), 'secret');
symlinkSync(join(outside, 'id_rsa'), join(allowed, 'link-out'));
symlinkSync(join(allowed, 'meter.csv'), join(allowed, 'sub', 'link-in'));
const fifo = join(allowed, 'pipe');
const haveFifo = spawnSync('mkfifo', [fifo]).status === 0;
const big = join(allowed, 'big.csv');
writeFileSync(big, '');
truncateSync(big, MAX_FILE_BYTES + 1_000_000); // sparse: 201 MB without writing it

const dirs = realAllowDirs([allowed]);

test('a file inside an allowed folder passes, by relative or absolute path', () => {
  assert.equal(checkPath('meter.csv', dirs).ok, true);
  assert.equal(checkPath(join(allowed, 'meter.csv'), dirs).ok, true);
  assert.equal(checkPath('sub/link-in', dirs).ok, true, 'a symlink that stays inside is fine');
});

test('path escape: ../ out of the allowed folder is refused and names the allowed folders', () => {
  const r = checkPath('../outside/id_rsa', dirs);
  assert.equal(r.ok, false);
  assert.match(r.message, /outside the allowed folders/);
  assert.ok(r.message.includes(dirs[0]));
});

test('symlink escape: a link inside pointing outside is refused', () => {
  assert.match(checkPath('link-out', dirs).message, /outside the allowed folders/);
});

test('folders, device files, and pipes are refused', () => {
  assert.match(checkPath('sub', dirs).message, /not a regular file/);
  assert.match(checkPath('/dev/null', dirs).message, /outside the allowed folders/);
  if (haveFifo) assert.match(checkPath('pipe', dirs).message, /not a regular file/);
});

test('a 201 MB file is refused by size', () => {
  assert.match(checkPath('big.csv', dirs).message, /limit is 200,000,000/);
});

test('with no --allow-dir, file tools refuse and explain how to allow a folder', async () => {
  const r = await createServer().handle(modern(1, 'tools/call', { name: 'gridprims_analyze_file', arguments: { path: '/etc/hosts' } }));
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /--allow-dir/);
});

test('through the server, an escape attempt is an isError result and nothing is read', async () => {
  const r = await createServer({ allowDirs: dirs }).handle(modern(1, 'tools/call', { name: 'gridprims_analyze_file', arguments: { path: '../../.ssh/id_rsa' } }));
  assert.equal(r.result.isError, true);
});

/** An OS sandbox with networking disabled, or null when this machine has none. */
function noNetworkWrapper() {
  if (process.platform === 'darwin' && spawnSync('sandbox-exec', ['-p', '(version 1)(allow default)(deny network*)', 'true']).status === 0) {
    return ['sandbox-exec', '-p', '(version 1)(allow default)(deny network*)'];
  }
  if (process.platform === 'linux') {
    if (spawnSync('unshare', ['-rn', 'true']).status === 0) return ['unshare', '-rn'];
    if (spawnSync('sudo', ['-n', 'unshare', '-n', 'true']).status === 0) return ['sudo', '-n', 'unshare', '-n', 'sudo', '-n', '-u', process.env.USER ?? 'runner'];
  }
  return null;
}
const wrap = noNetworkWrapper();

test('the sandbox really blocks the network: a fixture that opens a socket fails inside it', { skip: !wrap && 'no network sandbox on this machine' }, () => {
  const probe = "require('node:" + "net').connect(80, '1.1.1.1').on('connect', () => process.exit(0)).on('error', () => process.exit(3)); setTimeout(() => process.exit(4), 3000);";
  const r = spawnSync(wrap[0], [...wrap.slice(1), process.execPath, '-e', probe]);
  assert.notEqual(r.status, 0, 'a socket connected from inside the sandbox');
});

test('every worked example succeeds through the server with networking disabled', { skip: !wrap && 'no network sandbox on this machine', timeout: 30_000 }, async () => {
  const p = startServer([], wrap);
  let id = 0;
  for (const { manifest } of TOOLS) {
    for (const ex of manifest.examples) {
      const r = await p.request(modern(++id, 'tools/call', { name: 'gridprims_run', arguments: { tool: manifest.id, inputs: ex.inputs } }));
      assert.equal(r.result.isError, false, `${manifest.id} ${ex.id}`);
    }
  }
  assert.equal(await p.close(), 0);
});

test('CI always has a network sandbox', { skip: !process.env.CI && 'only enforced in CI' }, () => {
  assert.ok(wrap, 'no sandbox available on the CI runner');
});

