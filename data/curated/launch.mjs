// The public launch (plan-launch-and-value-proof D1, phase 1 exit). The
// release that launches sets this date; the monthly value log counts six months
// from it and then publishes the phase 2 decision inputs on its own (task 1.5).
// Until then it is null, and the log says the inputs are not due.

/** @type {string | null} YYYY-MM-DD */
export const LAUNCHED = null;
/** D3: phase 2 starts if phase 1 meets the bar within this many months of launch. */
export const DECISION_MONTHS = 6;
