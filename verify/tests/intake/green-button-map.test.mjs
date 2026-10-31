// The Green Button field map (load and bill analyzer task 1.4): every element
// docs/derivations/green-button.md lists sits in the named parent type of the
// ESPI 4.0 schema with the named schema type, every listed code is in that
// type's enumeration, and the reader's own code tables use only codes the
// schema defines.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseXml, findAll } from '../../../parsers/xml.mjs';
import { ELECTRIC_UOM, FLOW, OTHER_UOM } from '../../../core/intake/espi.mjs';

const ROOT = join(import.meta.dirname, '../../..');
const xsd = parseXml(readFileSync(join(ROOT, 'verify/reference/espi/espi-4.0.xsd'), 'utf8'));
const doc = readFileSync(join(ROOT, 'docs/derivations/green-button.md'), 'utf8');
const rows = doc.split('\n').filter((l) => /^\| `/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim().replace(/`/g, '')));
const complex = (name) => findAll(xsd, 'complexType').find((n) => n.attrs.name === name);
const simple = (name) => findAll(xsd, 'simpleType').find((n) => n.attrs.name === name);
const codes = (type) => findAll(simple(type), 'enumeration').map((e) => e.attrs.value);

test('every element in the field map is in its parent type with its schema type', () => {
  assert.ok(rows.length >= 14, `${rows.length} rows`);
  for (const [element, parent, type] of rows) {
    const p = complex(parent);
    assert.ok(p, `${parent} is a complex type in espi.xsd`);
    const el = findAll(p, 'element').find((e) => e.attrs.name === element);
    assert.ok(el, `${element} is in ${parent}`);
    assert.equal(el.attrs.type, type, `${parent}.${element}`);
  }
});

test('every code the map lists is in its type\'s enumeration', () => {
  for (const [element, , type, listed] of rows) {
    if (!listed) continue;
    for (const c of listed.split(',').map((x) => x.trim())) assert.ok(codes(type).includes(c), `${element}: ${c} is a ${type} code`);
  }
});

test('the reader\'s code tables use only codes the schema defines, and no requirement depends on buying the standard', () => {
  for (const c of [...Object.keys(ELECTRIC_UOM), ...Object.keys(OTHER_UOM)]) assert.ok(codes('UnitSymbolKind').includes(c), `uom ${c}`);
  for (const c of Object.keys(FLOW)) assert.ok(codes('FlowDirectionKind').includes(c), `flowDirection ${c}`);
  assert.ok(codes('AccumulationKind').includes('4'));
  assert.match(readFileSync(join(ROOT, 'verify/reference/espi/espi-4.0.xsd'), 'utf8'), /Apache License, Version 2\.0/);
  assert.match(doc, /Nothing here depends on buying the NAESB business-practice text/);
});
