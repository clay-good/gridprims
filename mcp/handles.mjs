// Parsed files held in memory under opaque handles (agent/mcp-server, design
// D3): no temp files and no disk cache; a handle expires after 60 minutes
// unused or when the process exits.

import { randomUUID } from 'node:crypto';

export const IDLE_MS = 60 * 60_000;

/** @param {() => number} [now] */
export function createHandleStore(now = Date.now) {
  /** @type {Map<string, {value: any, lastUsed: number}>} */
  const store = new Map();
  const sweep = () => { for (const [k, v] of store) if (now() - v.lastUsed > IDLE_MS) store.delete(k); };
  return {
    /** @param {any} value */
    put(value) {
      sweep();
      const id = `h_${randomUUID()}`;
      store.set(id, { value, lastUsed: now() });
      return id;
    },
    /** @param {string} id */
    get(id) {
      sweep();
      const e = store.get(id);
      if (!e) return undefined;
      e.lastUsed = now();
      return e.value;
    },
    get size() { sweep(); return store.size; },
  };
}
