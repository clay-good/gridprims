// The in-house glyph set (DESIGN.md Shapes): each shape has one meaning.

import { raw } from '../lib/html.mjs';

const svg = (body) => raw(`<svg class="glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2">${body}</svg>`);

export const GLYPHS = {
  diamond: svg('<path d="M8 1.5 14.5 8 8 14.5 1.5 8Z"/>'),
  check: svg('<path d="M2.5 8.5 6.5 12 13.5 4"/>'),
  octagon: svg('<path d="M5 1.5h6L14.5 5v6L11 14.5H5L1.5 11V5Z"/>'),
  arrow: svg('<path d="M2 8h11M9 4l4 4-4 4"/>'),
  rectangle: svg('<rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/>'),
};
