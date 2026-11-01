// The primary documents the large-load records cite, each with its stored
// capture, and the second sources that could not be reached, with the date and
// the response. Shared so every field cites the same capture by the same checksum.

const CAP = 'data/curated/captures/large-load';

export const AEP_PAGE = { type: 'utility', publisher: 'AEP Ohio (Ohio Power Company)', url: 'https://www.aepohio.com/company/about/rates/data-center-tariff', retrieved: '2026-11-01', capture: `${CAP}/aep-ohio-data-center-tariff.txt`, sha256: '90d8d901f65cea5ac672ceefc0e3bb99b888e1e588b0ad0eb6d782d088d9fdd0' };
export const PUCO_DOCKET = { type: 'order', publisher: 'Public Utilities Commission of Ohio', url: 'https://dis.puc.state.oh.us/DocumentRecord.aspx?DocID=153076d7-0a2f-4ae3-9f32-c908d3085339', unreachable: { checked: '2026-11-01', response: 'HTTP 200 with a "Request Rejected" page for every document in Case No. 24-0508-EL-ATA' } };

export const SCC_ORDER = { type: 'order', publisher: 'Virginia State Corporation Commission', url: 'https://npr.brightspotcdn.com/b6/ac/706130b64d2b8eee6a9832b97e48/20251125-virginiascc-dominionenergyruling.pdf', retrieved: '2026-11-01', capture: `${CAP}/va-scc-pur-2025-00058-final-order.txt`, sha256: 'afa5aa722d49669d25b53eb9cce2a2fdf5356c69c2288c263ef057741da70ba3', note: 'The SCC\'s stamped final order (Document Control Center no. 251140150), as copied by NPR; the SCC\'s own docket search serves no document to a script.' };
export const SCC_DOCKET = { type: 'order', publisher: 'Virginia State Corporation Commission', url: 'https://www.scc.virginia.gov/docketsearch/DOCS/', unreachable: { checked: '2026-11-01', response: 'HTTP 403 for the document store; the docket search page is a script that serves no document' } };

export const PUCT_RULE = { type: 'regulator', publisher: 'Public Utility Commission of Texas', url: 'https://ftp.puc.texas.gov/public/puct-info/agency/rulesnlaws/subrules/electric/25.194/25.194.pdf', retrieved: '2026-11-01', capture: `${CAP}/tx-16-tac-25-194.txt`, sha256: 'f906a300e983800e26815f6dae765dbd678df7346e7476695322a2b8a192f6aa' };
export const PUCT_ORDER = { type: 'order', publisher: 'Public Utility Commission of Texas', url: 'https://interchange.puc.texas.gov/Documents/58481_218_1684654.PDF', retrieved: '2026-11-01', capture: `${CAP}/tx-puct-58481-order.txt`, sha256: 'b16c554e7ae1c852518c3fdae158d32274bc6632f8add8a9c4a3604d52136914' };
export const TX_REGISTER = { type: 'statute', publisher: 'Texas Secretary of State (Texas Administrative Code)', url: 'https://texreg.sos.state.tx.us/public/readtac$ext.TacPage?sl=R&app=9&p_dir=&p_rloc=&p_tloc=&p_ploc=&pg=1&p_tac=&ti=16&pt=2&ch=25&rl=194', unreachable: { checked: '2026-11-01', response: 'A "Site Has Moved" page pointing to a script-only portal that serves no rule text' } };

export const GA_PSC = { type: 'regulator', publisher: 'Georgia Public Service Commission', url: 'https://psc.ga.gov/site/assets/files/8617/media_advisory_data_centers_rule_1-23-2025.pdf', retrieved: '2026-11-01', capture: `${CAP}/ga-psc-2025-01-23-data-center-rule.txt`, sha256: '67c5bc77b6827d35c43505b0dfa153a62f40a74a014f9c3072641750ff95ea83' };
export const GA_POWER = { type: 'utility', publisher: 'Georgia Power', url: 'https://www.georgiapower.com/business/billing-and-rates/business-rate-plans.html', unreachable: { checked: '2026-11-01', response: 'HTTP 404; the rules page that would carry the large-load terms was not found' } };
