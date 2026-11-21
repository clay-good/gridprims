// Prints the scorecard's rate list (add-tariff-conformance-suite 3.5) as JSON for the independent rerun in
// verify/tools/scorecard-rerun.py:
//   node verify/tools/scorecard-rates.mjs > /tmp/rates.json
import { loadScorecard, rateList } from '../../pipeline/lib/scorecard-files.mjs';
import { ROOT } from '../../pipeline/run.mjs';

console.log(JSON.stringify(rateList(loadScorecard(ROOT).card), null, 2));
