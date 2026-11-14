// Checks a pole list off the main thread (add-overhead-line-checks 3.5), so
// the page stays responsive. Cancelling ends this worker.

import { runTool } from '../../core/contract/run.mjs';
import { checkPoleList } from '../../core/lib/pole-batch.mjs';
import manifest from '../../core/tools/lines.attachment-height.find/manifest.mjs';
import * as impl from '../../core/tools/lines.attachment-height.find/tool.mjs';

addEventListener('message', (e) => {
  const { text, values } = e.data;
  const batch = checkPoleList(text, (pole) => runTool(manifest, impl, { ...values, ...pole }), (done, total) => postMessage({ type: 'progress', done, total }));
  postMessage({ type: 'done', batch });
});
