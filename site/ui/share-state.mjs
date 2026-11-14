// Tool inputs in the URL fragment (platform/tool-contract, "Shareable state in
// the fragment"). The fragment never reaches a server, and neither file
// contents nor a loaded file's handle are ever encoded.

const notShared = (inp) => inp.type === 'file' || inp.type === 'handle';
/** What a link holds in place of the user's own rules, which never go in a URL. */
export const PRIVATE_MARK = 'your standards file';

/**
 * @param {any} manifest
 * @param {Record<string, unknown>} values
 */
export function encodeState(manifest, values) {
  const p = new URLSearchParams();
  for (const inp of manifest.inputs) {
    if (notShared(inp) || values[inp.name] === undefined) continue;
    // The worked example's rules are ours to share; anything else is the user's and is named, not copied.
    if (inp.private) { if (String(values[inp.name]) !== String(inp.example)) p.set(inp.name, PRIVATE_MARK); continue; }
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
    if (!notShared(inp) && !inp.private && p.has(inp.name)) out[inp.name] = p.get(inp.name);
  }
  return out;
}

/**
 * The private inputs a link says it was made with, so the page can ask for them.
 * @param {any} manifest @param {string} hash @returns {string[]}
 */
export function privateAsked(manifest, hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  return manifest.inputs.filter((inp) => inp.private && p.has(inp.name)).map((inp) => inp.name);
}

/**
 * Inputs for a problem report: a private input's value is replaced by a note, and the report says it cannot be rerun.
 * @param {any} manifest @param {Record<string, unknown>} values @param {string} note
 */
export function reportInputs(manifest, values, note) {
  const out = { ...values };
  const left = manifest.inputs.filter((inp) => inp.private && String(values[inp.name]) !== String(inp.example));
  for (const inp of left) out[inp.name] = PRIVATE_MARK;
  return { inputs: out, ...(left.length ? { note } : {}) };
}

/** True when the values are the manifest's example inputs. */
export function isExampleState(manifest, values) {
  return manifest.inputs.every((inp) => notShared(inp) || String(values[inp.name]) === String(inp.example));
}
