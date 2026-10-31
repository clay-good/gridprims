# Writes small Parquet files covering what PUDL and other writers emit, and the
# values pyarrow reads back, so the gridprims reader is checked against an
# independent implementation. Dev-time only: the project never runs this.
#   venv/bin/python -I verify/tools/parquet-fixtures.py verify/fixtures/parquet
import datetime, json, sys, pyarrow as pa, pyarrow.parquet as pq
out = sys.argv[1]
n = 300
tbl = pa.table({
    'id': pa.array(range(n), pa.int64()),
    'small': pa.array([i % 7 - 3 for i in range(n)], pa.int32()),
    'flag': pa.array([None if i % 11 == 0 else i % 3 == 0 for i in range(n)], pa.bool_()),
    'mwh': pa.array([None if i % 5 == 0 else i * 1.25 - 40 for i in range(n)], pa.float64()),
    'ratio': pa.array([i / 8 for i in range(n)], pa.float32()),
    'state': pa.array([None if i % 13 == 0 else ['TX', 'CA', 'NY', 'Puerto Rico ñ'][i % 4] for i in range(n)], pa.string()),
    'name': pa.array([f'plant {i * 37 % 101}' for i in range(n)], pa.string()),
    'day': pa.array([datetime.date(2025, 1, 1) + datetime.timedelta(days=i) for i in range(n)], pa.date32()),
    'at_ms': pa.array([datetime.datetime(2025, 1, 1, 0, 0) + datetime.timedelta(hours=i) for i in range(n)], pa.timestamp('ms')),
    'at_us': pa.array([None if i % 17 == 0 else datetime.datetime(2025, 6, 1) + datetime.timedelta(minutes=15 * i) for i in range(n)], pa.timestamp('us', tz='UTC')),
    'at_ns': pa.array([datetime.datetime(2024, 3, 10, 6) + datetime.timedelta(seconds=i) for i in range(n)], pa.timestamp('ns')),
})
cases = {
    'snappy-v1-dict': dict(compression='snappy', data_page_version='1.0'),
    'zstd-v2-dict': dict(compression='zstd', data_page_version='2.0'),
    'gzip-v1-plain': dict(compression='gzip', use_dictionary=False, data_page_version='1.0'),
    'brotli-v2-plain': dict(compression='brotli', use_dictionary=False, data_page_version='2.0'),
    'none-rowgroups': dict(compression='none', row_group_size=64, data_page_size=512),
    'delta': dict(compression='snappy', use_dictionary=False, column_encoding={'id': 'DELTA_BINARY_PACKED', 'small': 'DELTA_BINARY_PACKED', 'name': 'DELTA_BYTE_ARRAY', 'state': 'DELTA_LENGTH_BYTE_ARRAY', 'mwh': 'BYTE_STREAM_SPLIT', 'ratio': 'BYTE_STREAM_SPLIT', 'flag': 'RLE'}, data_page_version='2.0'),
}
for name, opts in cases.items():
    pq.write_table(tbl, f'{out}/{name}.parquet', **opts)
# Files the reader must refuse with a clear message.
pq.write_table(tbl.slice(0, 10), f'{out}/refuse-lz4.parquet', compression='lz4')
pq.write_table(pa.table({'id': [1, 2], 'tags': pa.array([['a'], ['b', 'c']], pa.list_(pa.string()))}), f'{out}/refuse-nested.parquet')
def plain(v):
    if isinstance(v, datetime.datetime):
        if v.tzinfo is None: v = v.replace(tzinfo=datetime.timezone.utc)
        return v.astimezone(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    if isinstance(v, datetime.date): return v.isoformat()
    return v
rows = [{k: plain(v) for k, v in r.items()} for r in pq.read_table(f'{out}/snappy-v1-dict.parquet').to_pylist()]
json.dump({'writer': f'pyarrow {pa.__version__}', 'cases': list(cases), 'rows': rows}, open(f'{out}/expected.json', 'w'), separators=(',', ':'))
print('ok', len(rows))
