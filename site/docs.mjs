// The tools reference, generated from manifests (platform/tool-contract,
// "Every surface is generated from the manifest"). `node site/docs.mjs`
// rewrites docs/tools.md; a test fails when the committed file drifts.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS } from '../core/tools/index.mjs';
import { VALIDATION_LEVELS } from '../core/contract/manifest.mjs';

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** @param {any} m */
function unitText(inp) {
  return inp.unit ?? (inp.unitFrom ? `unit chosen in ${inp.unitFrom}` : inp.type === 'enum' ? 'choice' : '');
}

export function toolsReference() {
  const out = ['# Tools reference', '', 'Generated from the tool manifests by `node site/docs.mjs`. Do not edit by hand.', ''];
  for (const { manifest: m } of TOOLS) {
    out.push(`## ${m.title} (\`${m.id}\`)`, '', m.purpose, '');
    out.push(`Version ${m.version} · ${m.stability} · validation level ${m.validation.level}, ${VALIDATION_LEVELS[m.validation.level].name}`, '');
    out.push('| Input | Name | Unit | Range | Example |', '|---|---|---|---|---|');
    for (const i of m.inputs) out.push(`| ${cell(i.label)} | \`${i.name}\` | ${cell(unitText(i))} | ${i.range ? `${i.range.min} to ${i.range.max}` : i.options ? i.options.map((o) => `\`${o.value}\``).join(', ') : ''} | ${cell(i.example ?? '')} |`);
    out.push('', '| Output | Name | Unit | Rounding |', '|---|---|---|---|');
    for (const o of m.outputs) out.push(`| ${cell(o.label)} | \`${o.name}\` | ${cell(o.unit ?? (o.unitFrom ? `unit chosen in ${o.unitFrom}` : ''))} | ${o.rounding.sigFigs !== undefined ? `${o.rounding.sigFigs} significant figures` : `${o.rounding.decimals} decimals`} |`);
    out.push('', `**Method.** ${m.method}`, '', '**Sources.**', '');
    for (const c of m.citations) out.push(`- ${c.source}, ${c.edition}, ${c.locator}${c.url ? ` (${c.url})` : ''}`);
    out.push('', '**Known limits.**', '');
    for (const l of m.limitations) out.push(`- ${l}`);
    out.push('');
  }
  return out.join('\n');
}

export const DOC_PATH = join(fileURLToPath(new URL('..', import.meta.url)), 'docs/tools.md');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(DOC_PATH, toolsReference());
  console.log(`wrote ${DOC_PATH}`);
}
