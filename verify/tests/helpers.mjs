// Shared test helpers: throwaway mini-repositories and a minimal valid manifest.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tempDir } from '../lib/temp.mjs';

/**
 * @param {Record<string, string | Buffer>} files relative path to contents; a path ending in "/" makes an empty directory
 * @returns {string} the fixture root
 */
export function fixtureRepo(files) {
  const root = tempDir('gridprims-fixture-');
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    if (rel.endsWith('/')) { mkdirSync(abs, { recursive: true }); continue; }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}

/** A minimal valid manifest; each test breaks one field. */
export function sample() {
  return {
    id: 'calc.sample.double',
    version: '1.0.0',
    title: 'Doubler',
    purpose: 'Doubles a number.',
    archetype: 'calculator',
    firstScreen: ['x'],
    inputs: [{ name: 'x', label: 'Number', type: 'number', unit: 'kWh', range: { min: 0, max: 100 }, precision: 'exact', example: 2 }],
    outputs: [{ name: 'y', label: 'Double', unit: 'kWh', rounding: { sigFigs: 3 } }],
    method: 'Multiply by two.',
    assumptions: [],
    citations: [{ source: 'Arithmetic', edition: '1', locator: 'Multiplication', url: 'https://example.org/' }],
    datasets: [],
    examples: [{ id: 'two', title: '2 doubled', inputs: { x: 2 }, expect: { y: { value: 4, tolerance: { abs: 0 } } }, source: 'Hand calculation' }],
    related: [],
    handoffs: [],
    stability: 'experimental',
    validation: { level: 1, evidence: [{ kind: 'own-examples', summary: 'One example passes.' }] },
    limitations: ['None known.'],
  };
}
