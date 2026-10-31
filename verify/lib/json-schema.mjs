// A narrow JSON Schema checker for conformance tests: exactly the keywords the
// published MCP schemas use ($ref, type, required, properties,
// additionalProperties, items, enum, const, allOf, anyOf, minimum, maximum,
// maxItems; format is ignored). Not a general validator.

/**
 * @param {any} root the schema document, for resolving $ref
 * @param {any} schema
 * @param {any} value
 * @param {string} [at]
 * @returns {string[]} problems, each with a JSON path
 */
export function check(root, schema, value, at = '$') {
  if (schema === true || schema === undefined) return [];
  if (schema === false) return [`${at}: no value is allowed here`];
  if (schema.$ref) {
    const target = schema.$ref.replace(/^#\//, '').split('/').reduce((o, k) => o?.[k], root);
    if (!target) return [`${at}: unresolved $ref ${schema.$ref}`];
    return check(root, target, value, at);
  }
  const out = [];
  if (schema.type !== undefined) {
    const types = [schema.type].flat();
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const okType = types.some((t) => t === actual || (t === 'integer' && Number.isInteger(value)) || (t === 'number' && actual === 'number'));
    if (!okType) return [`${at}: expected ${types.join(' or ')}, got ${actual}`];
  }
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) out.push(`${at}: expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) out.push(`${at}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${at}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${at}: above maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) out.push(`${at}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => out.push(...check(root, schema.items, v, `${at}[${i}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required ?? []) if (!(k in value)) out.push(`${at}: missing required "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) out.push(...check(root, schema.properties[k], v, `${at}.${k}`));
      else if (schema.additionalProperties !== undefined) out.push(...check(root, schema.additionalProperties, v, `${at}.${k}`));
    }
  }
  for (const s of schema.allOf ?? []) out.push(...check(root, s, value, at));
  if (schema.anyOf && !schema.anyOf.some((s) => check(root, s, value, at).length === 0)) out.push(`${at}: matches none of anyOf`);
  return out;
}

/**
 * Check a value against a named definition in a schema document.
 * @param {any} doc
 * @param {string} name
 * @param {any} value
 */
export function checkDef(doc, name, value) {
  const defs = doc.$defs ?? doc.definitions;
  if (!defs[name]) return [`no definition named ${name}`];
  return check(doc, defs[name], value);
}
