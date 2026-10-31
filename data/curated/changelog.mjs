// The public changelog (platform/tool-contract, "Stable, versioned results"):
// one entry per tool version, newest first. A change that alters any result for
// the same input bumps the tool's version and adds an entry here naming the
// old and new value for a sample input and the reason. Rendered at /changelog/.

/**
 * @type {Array<{date: string, toolId: string, version: string, reason: string, sample?: {inputs: object, old: string, new: string}}>}
 */
export default [
  { date: '2026-10-30', toolId: 'calc.energy-units.convert', version: '0.1.0', reason: 'First release.' },
];
