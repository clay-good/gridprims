// Writes the six section social cards (site/discoverability, "Static social
// cards"): an SVG source for each section in site/cards/, then a 1200 x 630
// PNG rendered from it in Firefox through our own driver. Dev-time only; the
// PNGs are committed beside their sources.
//   node verify/tools/social-cards.mjs

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../lib/browser.mjs';
import { serve } from '../lib/static-server.mjs';
import { LIGHT } from '../../site/styles/tokens.mjs';
import strings from '../../site/strings/en-US.mjs';

const OUT = fileURLToPath(new URL('../../site/cards/', import.meta.url));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const SECTIONS = [['home', strings['site.tagline']], ...['bills', 'data', 'carbon', 'grid', 'learn'].map((id) => [id, strings[`section.${id}`]])];

/** Wrap text into lines of at most n characters. */
const wrap = (text, n) => text.split(' ').reduce((lines, w) => {
  const last = lines.at(-1);
  if (last && `${last} ${w}`.length <= n) lines[lines.length - 1] = `${last} ${w}`;
  else lines.push(w);
  return lines;
}, []);

export function cardSvg(id, title) {
  const lines = wrap(title, 26).slice(0, 3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${LIGHT.bg}"/>
  <rect x="0" y="0" width="1200" height="16" fill="${LIGHT.guide}"/>
  <rect x="80" y="96" width="24" height="24" transform="rotate(45 92 108)" fill="${LIGHT.guide}"/>
  <text x="128" y="118" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="${LIGHT.ink}">gridprims</text>
  ${lines.map((l, i) => `<text x="80" y="${290 + i * 84}" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="${LIGHT.ink}">${esc(l)}</text>`).join('\n  ')}
  <rect x="80" y="540" width="1040" height="2" fill="${LIGHT.line}"/>
  <text x="80" y="586" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${LIGHT.muted}">gridprims.com${id === 'home' ? '' : ` · ${esc(strings[`nav.${id}`])}`}</text>
</svg>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const tmp = mkdtempSync(join(tmpdir(), 'gridprims-cards-'));
  for (const [id, title] of SECTIONS) {
    writeFileSync(join(OUT, `${id}.svg`), cardSvg(id, title));
    writeFileSync(join(tmp, `${id}.html`), `<!doctype html><html><head><style>html,body{margin:0;width:1200px;height:630px;overflow:hidden}</style></head><body>${readFileSync(join(OUT, `${id}.svg`), 'utf8')}</body></html>`);
  }
  const server = await serve(tmp);
  const browser = await launch('firefox');
  try {
    await browser.setViewport(1200, 630);
    for (const [id] of SECTIONS) {
      await browser.goto(`${server.url}/${id}.html`);
      writeFileSync(join(OUT, `${id}.png`), await browser.screenshot());
      console.log(`wrote site/cards/${id}.png`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}
