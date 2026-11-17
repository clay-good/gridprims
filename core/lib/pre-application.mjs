// What a federal pre-application report settles (add-interconnection-screens 5.2): each item SGIP § 1.2.3
// returns, against the Fast Track screens it lets an applicant evaluate. The mapping is our reading of the two
// sections side by side, not the rule's words, and says so; screens no item settles still need the utility's
// circuit model.

/** Item number to the screens it informs (SGIP § 2.2.1.x), or the eligibility test it feeds. */
export const SETTLES = {
  '1.2.3.2': ['2.2.1.2'], '1.2.3.3': ['2.2.1.2'],
  '1.2.3.5': ['eligibility'], '1.2.3.6': ['eligibility'], '1.2.3.7': ['eligibility'],
  '1.2.3.8': ['2.2.1.2', '2.4.4.1'],
  '1.2.3.10': ['2.2.1.6'],
  '1.2.3.12': ['2.2.1.2', '2.2.1.3'],
};

/** Screens that only the utility's circuit model can settle, whatever the report returns. */
export const MODEL_ONLY = ['2.2.1.4', '2.2.1.5', '2.2.1.9', '2.2.1.10'];

/** The report's items, each with the screens it informs. */
export const whatTheFeeBuys = (items) => items.map((i) => ({ ...i, settles: SETTLES[i.n] ?? [] }));
