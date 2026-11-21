// What each utility itself assumes when a feeder's minimum daytime load is not available (add-interconnection-
// screens 4.3; minimum-load-range, "Per-utility assumption named"). New York's utilities stated theirs in the
// Interconnection Technical Working Group's "CESIR Analysis Evaluation - Minimum Daytime Load Application &
// Assumptions" on the Department of Public Service's site; the Joint Utilities' responses (Ver 2, 12 March 2024)
// revise Ver 1 (13 February 2024), so Ver 2 is cited and a figure it replaced is named as superseded. Each is
// the utility's own assumption, never ours.

const V2 = { publisher: 'New York State Department of Public Service, Interconnection Technical Working Group', document: 'CESIR Analysis Evaluation - Minimum Daytime Load Application & Assumptions, Ver 2 (Joint Utilities responses, 12 March 2024)', url: 'https://dps.ny.gov/system/files/documents/2024/04/2023-03-12-cesir-analysis-minimum-daytime-load-application-assumptions_ju-responses.docx', capture: 'data/curated/captures/interconnect/ny-itwg-minimum-daytime-load-v2.txt', sha256: '9592f690abda2c1fa10bfc37c653d0aab992409aca73d72e0b8c8d0bbfc908dd' };

export const CHECKED = '2026-11-21';

/** The utilities the tool can name, in the order a picker lists them. */
export default [
  { id: 'avangrid', utility: 'Avangrid (NYSEG and RG&E)', state: 'NY', share: 15, assumption: '15% of peak load when the transformer\'s loading is not available', window: '10 a.m. to 6 p.m. (NYSEG)', cite: { ...V2, locator: 'Substation Transformer Backfeeding table, Avangrid; daytime periods, NYSEG', quote: '15% of the peak load' } },
  { id: 'central-hudson', utility: 'Central Hudson Gas & Electric', state: 'NY', share: 25, assumption: '25% of peak load when the transformer\'s loading is not available', window: '10 a.m. to 3 p.m.', cite: { ...V2, locator: 'Substation Transformer Backfeeding table, Central Hudson Gas & Electric; daytime periods, CHG&E', quote: '25% of peak load' } },
  { id: 'con-edison', utility: 'Consolidated Edison', state: 'NY', share: null, assumption: 'interval loading data from the area station, extrapolated or interpolated to the local area, rather than a share of peak; Ver 1\'s "30-40% peak load" is superseded', window: 'set separately for each area station', cite: { ...V2, locator: 'Substation Transformer Backfeeding table, Consolidated Edison; daytime periods, ConEd', quote: 'Interval data loading from the area station is available' } },
  { id: 'national-grid-ny', utility: 'National Grid (New York)', state: 'NY', share: 25, assumption: '25% of peak load when the transformer\'s loading is not available', window: '9 a.m. to 6 p.m., and 24 hours for battery storage', cite: { ...V2, locator: 'Substation Transformer Backfeeding table, National Grid; daytime periods, NG', quote: '25% of the peak load' } },
  { id: 'orange-rockland', utility: 'Orange and Rockland', state: 'NY', share: null, assumption: 'interval data for every station but Summitville, Wurtsboro, and Pine Island, whose toll-grade readings allow calculation within 3%, rather than a share of peak', window: '8 a.m. to 8 p.m. for solar, 24 hours for battery storage', cite: { ...V2, locator: 'Substation Transformer Backfeeding table, Orange and Rockland; daytime periods, ORU', quote: 'Interval data available for all stations except' } },
];

/** What the same document says about the assumption itself. */
export const CONTEXT = { ...V2, locator: 'Questions, Joint Utilities answer 1', quote: 'This assumption does not apply for all companies.' };
