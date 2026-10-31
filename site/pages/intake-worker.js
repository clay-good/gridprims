// Parses a dropped file off the main thread (platform/file-intake), so the
// page stays responsive. Cancelling ends this worker.

import { intakeFile } from '../../core/intake/index.mjs';

addEventListener('message', async (e) => {
  const { bytes, name, choices } = e.data;
  try {
    const r = await intakeFile(new Uint8Array(bytes), { name }, choices, { onProgress: (fraction) => postMessage({ type: 'progress', fraction }) });
    if (!r.ok) return postMessage({ type: 'refused', message: r.message, learnUrl: r.learnUrl });
    const buffers = r.series.flatMap((s) => [s.startMs.buffer, s.kwh.buffer]);
    postMessage({ type: 'done', result: r }, buffers);
  } catch (err) {
    postMessage({ type: 'refused', message: String(err?.message ?? err) });
  }
});
