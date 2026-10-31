// DESIGN.md color tokens for both themes. The build writes tokens.css from this
// module, and the contrast lint reads it, so the two cannot drift apart.

export const LIGHT = {
  bg: '#f3f5f2', panel: '#ffffff', raise: '#e9eee9', 'panel-hover': '#eef3ef', 'panel-active': '#e2e9e4',
  'guide-hover': '#005c3d', 'guide-active': '#004a31',
  ink: '#121a15', muted: '#4b5850', line: '#c5cec7', 'field-border': '#76837b',
  guide: '#00704a', 'guide-text': '#005c3d', service: '#1d4f91', 'service-field': '#1d4f91',
  'learn-text': '#6b4226', 'learn-field': '#6b4226', 'work-zone': '#f07b21', 'work-zone-text': '#9a3d00',
  warning: '#ffcd00', 'warning-text': '#7a5b00', stop: '#b3261e', ok: '#17693c', focus: '#1d4f91',
  'legend-white': '#ffffff', 'legend-black': '#111111',
  'series-measured': '#00704a', 'series-whatif': '#eb6834',
  // The sequential ramp for heatmaps (DESIGN.md): lightest means near zero.
  'heat-0': '#cde2fb', 'heat-1': '#a7c0de', 'heat-2': '#809dc1', 'heat-3': '#5a7ba5', 'heat-4': '#335888', 'heat-5': '#0d366b',
  shadow: 'rgba(0,0,0,.18)',
};

export const NIGHT = {
  ...LIGHT,
  bg: '#111613', panel: '#1a201d', raise: '#232b27', 'panel-hover': '#283129', 'panel-active': '#303a33',
  ink: '#edf2ee', muted: '#a5b1aa', line: '#36423c', 'field-border': '#7d8b83',
  'guide-text': '#5fd39a', service: '#8db4ff', 'learn-text': '#d9a77c', 'work-zone-text': '#ffa45c',
  'warning-text': '#ffd84d', stop: '#ff8a80', ok: '#5fd394', focus: '#ffcd00',
  'series-measured': '#22a06b', 'series-whatif': '#e0612a',
  // At night the ramp keeps its hue with a #184f95 floor, rising to the light end.
  'heat-0': '#184f95', 'heat-1': '#3c6ca9', 'heat-2': '#608abe', 'heat-3': '#85a7d2', 'heat-4': '#a9c5e7', 'heat-5': '#cde2fb',
  shadow: 'rgba(0,0,0,.5)',
};

export const SPACE = { s1: '4px', s2: '8px', s3: '12px', s4: '16px', s5: '24px', s6: '32px', s7: '48px', s8: '64px' };
export const RADIUS = { field: '6px', sign: '10px', pill: '999px' };

const block = (vars) => Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n');

/** The theme rules: light by default, night by OS preference, a saved choice wins. */
export function tokensCss() {
  return `/* Generated from site/styles/tokens.mjs. Do not edit. */
:root {
  color-scheme: light;
${block(LIGHT)}
${block(SPACE)}
${block(Object.fromEntries(Object.entries(RADIUS).map(([k, v]) => [`r-${k}`, v])))}
  --fast: 150ms; --med: 220ms; --slow: 400ms; --ease: cubic-bezier(.2,.7,.2,1);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${block(NIGHT).replace(/^/gm, '  ')}
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
${block(NIGHT)}
}
`;
}
