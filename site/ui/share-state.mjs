// Tool inputs in the URL fragment (platform/tool-contract, "Shareable state in
// the fragment"). The fragment never reaches a server, and neither file
// contents nor a loaded file's handle are ever encoded.

const notShared = (inp) => inp.type === 'file' || inp.type === 'handle';
/** What a link holds in place of the user's own rules, which never go in a URL. */
export const PRIVATE_MARK = 'your standards file';
/** What a link holds in place of inputs filled from a loaded file, such as one pole of a pole list. */
export const FILE_MARK = 'your pole list';
const MARKS = [PRIVATE_MARK, FILE_MARK];

/**
 * @param {any} manifest
 * @param {Record<string, unknown>} values
 * @param {string[]} [fromFile] inputs filled from a loaded file: the link names the file instead of holding them
 */
export function encodeState(manifest, values, fromFile = []) {
  const p = new URLSearchParams();
  for (const inp of manifest.inputs) {
    if (notShared(inp) || values[inp.name] === undefined) continue;
    if (fromFile.includes(inp.name)) { p.set(inp.name, FILE_MARK); continue; }
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
    if (!notShared(inp) && !inp.private && p.has(inp.name) && !MARKS.includes(p.get(inp.name))) out[inp.name] = p.get(inp.name);
  }
  return out;
}

/**
 * The private inputs a link says it was made with, so the page can ask for them.
 * @param {any} manifest @param {string} hash @returns {string[]}
 */
export function privateAsked(manifest, hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  return manifest.inputs.filter((inp) => (inp.private && p.has(inp.name)) || p.get(inp.name) === FILE_MARK).map((inp) => inp.name);
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
