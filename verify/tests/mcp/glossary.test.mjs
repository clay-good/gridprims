// The glossary through the MCP server (learn/glossary 1.4): "what is 4CP"
// returns the 4CP entry first with its definition and citation, and
// gridprims_query_data returns the same entry the site shows, by name or alias.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../../mcp/protocol.mjs';
import { modern } from './mcp-helpers.mjs';
import glossary from '../../../data/curated/glossary.mjs';

const server = createServer();
const call = async (name, args) => (await server.handle(modern(1, 'tools/call', { name, arguments: args }))).result;

test('an agent asking "what is 4CP" gets the 4CP entry first, with its definition and citation', async () => {
  const r = await call('gridprims_search', { query: 'what is 4CP' });
  const [first] = r.structuredContent.results;
  const entry = glossary.find((g) => g.id === '4cp');
  assert.deepEqual([first.kind, first.id, first.definition], ['term', '4cp', entry.short]);
  assert.equal(first.citation.url, entry.citation.url);
  assert.equal(first.url, 'https://gridprims.com/learn/glossary/#4cp');
});

test('query_data returns the same entry by term or alias, and refuses an unknown one', async () => {
  for (const id of ['load factor', 'TOU', 'What is a demand charge?']) {
    const r = await call('gridprims_query_data', { entity: 'term', id });
    assert.equal(r.isError, false, id);
    const e = r.structuredContent.entity;
    assert.equal(e.short, glossary.find((g) => g.id === e.id).short, id);
    assert.ok(e.citation.url && e.example, id);
  }
  const bad = await call('gridprims_query_data', { entity: 'term', id: 'flux capacitor' });
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /No glossary entry/);
});
