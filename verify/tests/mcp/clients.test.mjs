// Setup from one source (MCP task 5.1): the README, the developer page, and a
// smoke test that launches each client snippet's own command.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLONE, DATA_DIR, readmeSection, snippets } from '../../../mcp/clients.mjs';
import { developersPage } from '../../../site/templates/pages.mjs';
import { createI18n } from '../../../site/lib/i18n.mjs';
import { escapeHtml } from '../../../site/lib/html.mjs';
import strings from '../../../site/strings/en-US.mjs';
import { ROOT, modern } from './mcp-helpers.mjs';

test('the README carries exactly the generated snippets', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes(readmeSection()), 'README snippet section drifted from mcp/clients.mjs');
});

test('the developer page shows the same snippets', () => {
  const page = String(developersPage({ i18n: createI18n(strings, 'en-US') }));
  for (const s of snippets()) assert.ok(page.includes(escapeHtml(s.text)), s.client);
});

/** The command and arguments a snippet would run, with real paths in place of the placeholders. */
function commandOf(s, clone, dir) {
  const swap = (x) => x.replaceAll(CLONE, clone).replaceAll(DATA_DIR, dir);
  if (s.language === 'sh') {
    const [, cmd] = s.text.split(' -- ');
    const [command, ...args] = cmd.split(' ');
    return { command, args: args.map(swap) };
  }
  const cfg = JSON.parse(s.text);
  const server = (cfg.mcpServers ?? cfg.servers).gridprims;
  return { command: server.command, args: server.args.map(swap) };
}

for (const s of snippets()) {
  test(`${s.client}: the snippet's command launches a server that answers`, { timeout: 20_000 }, async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gridprims-allowed-')));
    const { command, args } = commandOf(s, ROOT, dir);
    assert.equal(command, 'node');
    const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const reply = new Promise((resolve, reject) => {
      let buf = '';
      child.stdout.on('data', (d) => { buf += d; if (buf.includes('\n')) resolve(JSON.parse(buf.split('\n')[0])); });
      child.on('exit', (code) => reject(new Error(`server exited with ${code}`)));
    });
    child.stdin.write(JSON.stringify(modern(1, 'server/discover')) + '\n');
    const r = await reply;
    assert.deepEqual(r.result.supportedVersions, ['2026-07-28', '2025-11-25', '2025-06-18']);
    child.kill();
  });
}
