// Reading packed column shards (foundation design D5; docs/formats/column-shard.md).
// A shard is: "GPC1", a little-endian uint32 header length, a JSON header, zero
// padding to 8 bytes, then one column after another, each 8-byte aligned.
// Browsers and Node read it with ArrayBuffer views; no parser beyond the header.

export const MAGIC = 'GPC1';
export const NULL_INDEX = 0xffffffff;

/**
 * @typedef {{name: string, type: 'f64' | 'str', unit?: string, nullable: boolean, offset: number, length: number, dictionary?: string[]}} ColumnHeader
 * @typedef {{format: string, rows: number, columns: ColumnHeader[], meta?: object}} ShardHeader
 */

/**
 * @param {ArrayBuffer | Uint8Array} input
 * @returns {{header: ShardHeader, column: (name: string) => Array<number | string | null>, rows: () => Array<Record<string, number | string | null>>}}
 */
export function readShard(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) throw new Error('not a gridprims column shard');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLength = view.getUint32(4, true);
  const header = /** @type {ShardHeader} */ (JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + headerLength))));
  const dataStart = Math.ceil((8 + headerLength) / 8) * 8;

  /** @param {string} name */
  function column(name) {
    const c = header.columns.find((x) => x.name === name);
    if (!c) throw new Error(`no column ${name}`);
    const at = dataStart + c.offset;
    const out = new Array(header.rows);
    if (c.type === 'f64') {
      for (let i = 0; i < header.rows; i++) {
        const v = view.getFloat64(at + i * 8, true);
        out[i] = Number.isNaN(v) ? null : v;
      }
    } else {
      for (let i = 0; i < header.rows; i++) {
        const k = view.getUint32(at + i * 4, true);
        out[i] = k === NULL_INDEX ? null : c.dictionary[k];
      }
    }
    return out;
  }

  return {
    header,
    column,
    rows() {
      const cols = header.columns.map((c) => [c.name, column(c.name)]);
      return Array.from({ length: header.rows }, (_, i) => Object.fromEntries(cols.map(([n, v]) => [n, v[i]])));
    },
  };
}
