// DESIGN.md color tokens for both themes. The build writes tokens.css from this
// module, and the contrast lint reads it, so the two cannot drift apart.

export const LIGHT = {
  // Work surfaces: machined neutrals, flat, no tint drift.
  bg: '#e9ebe8', panel: '#ffffff', raise: '#f2f4f1', 'panel-hover': '#f0f2ee', 'panel-active': '#e4e7e2',
  ink: '#17191a', muted: '#565b57', line: '#d2d6d1', 'field-border': '#6c726d',
  // Fields are theme-invariant: a white or black legend sits on these in both themes.
  // "guide" is the plate: the machined field the shell and the primary surfaces are cut from.
  guide: '#222624', 'guide-hover': '#2e3330', 'guide-active': '#151816', 'guide-text': '#2b302d',
  // The signal: the measured value, the live section, the primary action. Nothing else.
  signal: '#c0380f', 'signal-field': '#b8350e', 'signal-text': '#a93009',
  service: '#1f5496', 'service-field': '#1f5496',
  'learn-text': '#6a4322', 'learn-field': '#6a4322',
  'work-zone': '#f08a1c', 'work-zone-text': '#8c4000',
  warning: '#ffcd00', 'warning-text': '#75570a',
  stop: '#ad2318', ok: '#196b3c', focus: '#18406f',
  'legend-white': '#ffffff', 'legend-black': '#131313',
  'series-measured': '#222624', 'series-whatif': '#c0380f',
  // The sequential ramp for heatmaps: lightest means near zero.
  'heat-0': '#dfe3e6', 'heat-1': '#b9c3cc', 'heat-2': '#90a2b1', 'heat-3': '#688296', 'heat-4': '#41637c', 'heat-5': '#1c4461',
  shadow: 'rgba(12,14,13,.16)',
};

export const NIGHT = {
  ...LIGHT,
  // The machined shell itself.
  bg: '#141615', panel: '#1f2221', raise: '#282c2a', 'panel-hover': '#262a28', 'panel-active': '#313633',
  ink: '#e9ebe8', muted: '#a0a6a1', line: '#343836', 'field-border': '#767d78',
  'guide-text': '#c3cac5',
  signal: '#ff7043', 'signal-text': '#ff8255',
  service: '#8fb6f2', 'learn-text': '#d8a87c', 'work-zone-text': '#ffa552',
  'warning-text': '#ffd84d', stop: '#ff8d80', ok: '#5fd394', focus: '#ff8f63',
  'series-measured': '#c3cac5', 'series-whatif': '#ff7043',
  // At night the ramp keeps its hue with a deep floor, rising to the light end.
  'heat-0': '#1c4461', 'heat-1': '#41637c', 'heat-2': '#688296', 'heat-3': '#90a2b1', 'heat-4': '#b9c3cc', 'heat-5': '#dfe3e6',
  shadow: 'rgba(0,0,0,.55)',
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
