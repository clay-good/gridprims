import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandIndex, parseCommand, searchCommands } from '../../../core/contract/command.mjs';
import { validateManifest } from '../../../core/contract/manifest.mjs';
import { TOOLS, getTool } from '../../../core/tools/index.mjs';
import { sample } from '../helpers.mjs';

const index = buildCommandIndex(TOOLS, (id) => `/tools/${id.split('.').join('/')}/`);
const convert = getTool('calc.energy-units.convert').manifest;

test('"12 MWh to MMBtu" fills the converter', () => {
  assert.deepEqual(parseCommand('12 MWh to MMBtu', convert), { value: '12', from: 'MWh', to: 'MMBtu' });
  const [top] = searchCommands('12 MWh to MMBtu', index);
  assert.equal(top.id, 'calc.energy-units.convert');
  assert.deepEqual(top.values, { value: '12', from: 'MWh', to: 'MMBtu' });
});

test('phrasings, case, commas, spacing, and aliases', () => {
  const cases = {
    '1,000 cubic feet to btu': { value: '1000', from: 'ft3-natural-gas', to: 'Btu' },
    '12mwh in mmbtu': { value: '12', from: 'MWh', to: 'MMBtu' },
    '2 therms to kWh': { value: '2', from: 'therm', to: 'kWh' },
    '1 therm = kwh': { value: '1', from: 'therm', to: 'kWh' },
    '3 tons of coal to MWh': { value: '3', from: 'short-ton-coal', to: 'MWh' },
    '-5.5 GJ to megawatt-hours': { value: '-5.5', from: 'GJ', to: 'MWh' },
    'kWh to Btu': { from: 'kWh', to: 'Btu' },
  };
  for (const [q, want] of Object.entries(cases)) assert.deepEqual(parseCommand(q, convert), want, q);
});

test('Btu and MMBtu are never confused', () => {
  assert.equal(parseCommand('5 MMBtu to Btu', convert).from, 'MMBtu');
  assert.equal(parseCommand('5 Btu to MMBtu', convert).from, 'Btu');
});

test('a query that is not a command form still finds the tool by its words', () => {
  const [top] = searchCommands('energy converter', index);
  assert.equal(top.id, 'calc.energy-units.convert');
  assert.equal(top.values, null);
  assert.deepEqual(searchCommands('resource adequacy', index), []);
  assert.deepEqual(searchCommands('   ', index), []);
});

test('parsing never changes the manifest', () => {
  const before = JSON.stringify(convert);
  parseCommand('12 MWh to MMBtu', convert);
  assert.equal(JSON.stringify(convert), before);
});

test('a command form naming an undeclared input fails validation', () => {
  const m = { ...sample(), commandForms: ['{x} doubled', '{nope} things'] };
  assert.deepEqual(validateManifest(m), ['calc.sample.double: commandForms[1] names {nope}, which is not a number or enum input']);
});

test('a tool whose id names what was asked for outranks one that only shares a title word', async () => {
  const { TOOLS } = await import('../../../core/tools/index.mjs');
  const { toolPath } = await import('../../../site/ui/tool-page.mjs');
  const index = buildCommandIndex(TOOLS, toolPath, []);
  const first = (q) => searchCommands(q, index, 1)[0].id;
  // "Large-load minimum bill and exit fee" shares two title words, but this id names all three.
  assert.equal(first('minimum load screen'), 'interconnect.minimum-load.screen');
  assert.equal(first('pole attachment height'), 'lines.attachment-height.find');
  assert.equal(first('midspan clearance'), 'lines.midspan-clearance.check');
  assert.equal(first('interconnection process'), 'interconnect.process.route');
  // A query that fills a tool's inputs still outranks every word match.
  assert.equal(first('12 MWh to MMBtu'), 'calc.energy-units.convert');
});
