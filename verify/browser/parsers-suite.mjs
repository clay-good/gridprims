// The parser checks that must agree across browser engines and Node (foundation
// tasks 4.3 and 4.4). Runs in a page; returns a list of failures. The Node test
// runs the same expectations, so a difference names the engine.

import { readXlsx } from '../../parsers/xlsx.mjs';
import { localToUtc, transitions, utcToLocal } from '../../parsers/time.mjs';
import { decodeText, parseDelimited } from '../../parsers/delimited.mjs';
import { parseXml, XmlRefusal } from '../../parsers/xml.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** @param {{id: string, rows: any, date1904: boolean}[]} workbooks expected results, fetched as /fixtures/xlsx/<id>.xlsx */
export async function run(workbooks) {
  const failures = [];
  const check = (name, got, want) => { if (!same(got, want)) failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };

  for (const wb of workbooks) {
    const bytes = new Uint8Array(await (await fetch(`/fixtures/xlsx/${wb.id}.xlsx`)).arrayBuffer());
    try {
      const r = await readXlsx(bytes);
      check(`xlsx ${wb.id} rows`, r.rows, wb.rows);
      check(`xlsx ${wb.id} date1904`, r.date1904, wb.date1904);
    } catch (e) {
      failures.push(`xlsx ${wb.id}: threw ${e.message}`);
    }
  }

  // DST: the 2026 US transitions and the gap and repeat, in three zones.
  for (const [zone, std] of [['America/New_York', -300], ['America/Chicago', -360], ['America/Los_Angeles', -480]]) {
    check(`dst ${zone} transitions`, transitions(zone, 2026).map((t) => t.utcMs), [Date.UTC(2026, 2, 8, 2) - std * 60_000, Date.UTC(2026, 10, 1, 1) - std * 60_000]);
    check(`dst ${zone} gap`, localToUtc(zone, { year: 2026, month: 3, day: 8, hour: 2, minute: 30 }).status, 'gap');
    check(`dst ${zone} repeat`, localToUtc(zone, { year: 2026, month: 11, day: 1, hour: 1, minute: 30 }).status, 'repeat');
  }
  check('dst phoenix', transitions('America/Phoenix', 2026), []);
  check('midnight hour', utcToLocal('America/New_York', Date.UTC(2026, 0, 2, 5)).hour, 0);

  // Text decoding, delimiter detection, and quoting.
  check('windows-1252', decodeText(Uint8Array.of(0x54, 0x20, 0xb0, 0x46)).text, 'T °F');
  check('utf-16le', decodeText(Uint8Array.of(0xff, 0xfe, 0x6b, 0, 0x57, 0, 0x68, 0)).text, 'kWh');
  const csv = parseDelimited('Meter;kWh\n"A;1";"1,5"\r\n');
  check('csv', [csv.delimiter, csv.rows], [';', [['Meter', 'kWh'], ['A;1', '1,5']]]);

  // XML refusal happens in every engine.
  try { parseXml('<!DOCTYPE a [<!ENTITY x SYSTEM "http://example.invalid/">]><a>&x;</a>'); failures.push('xml: DTD was not refused'); }
  catch (e) { if (!(e instanceof XmlRefusal)) failures.push(`xml: wrong error ${e.name}`); }

  return failures;
}
