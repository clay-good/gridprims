// Tool inputs in the URL fragment (platform/tool-contract, "Shareable state in
// the fragment"). The fragment never reaches a server, and neither file
// contents nor a loaded file's handle are ever encoded.

const notShared = (inp) => inp.type === 'file' || inp.type === 'handle';

/**
 * @param {any} manifest
 * @param {Record<string, unknown>} values
 */
export function encodeState(manifest, values) {
  const p = new URLSearchParams();
  for (const inp of manifest.inputs) {
    if (notShared(inp) || values[inp.name] === undefined) continue;
    p.set(inp.name, String(values[inp.name]));
  }
  return `#${p.toString()}`;
}

/**
 * Read declared, non-file inputs from a fragment; anything else is ignored.
 * @param {any} manifest
 * @param {string} hash
 * @returns {Record<string, string>}
 */
export function decodeState(manifest, hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const out = {};
  for (const inp of manifest.inputs) {
    if (!notShared(inp) && p.has(inp.name)) out[inp.name] = p.get(inp.name);
  }
  return out;
}

/** True when the values are the manifest's example inputs. */
export function isExampleState(manifest, values) {
  return manifest.inputs.every((inp) => notShared(inp) || String(values[inp.name]) === String(inp.example));
}
