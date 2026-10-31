// The public corrections log (site/trust-pages, "Corrections policy and public
// log"). Tiers: a correction (fixed), a note of concern (suspected, still shown
// and flagged), a withdrawal (removed, with the page kept at its URL). Rendered
// at /corrections/; a scheduled refresh that moves a published number writes
// its own entry.

/** @type {Array<{date: string, tier: 'correction' | 'note' | 'withdrawal', subject: string, sample?: {input: string, old: string, new: string}, cause: string, reportId?: string, datasetVersion?: string}>} */
export default [];
