import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downsampleMinMax, lineChart, niceTicks, tableView } from '../../../site/lib/chart.mjs';

test('downsampling a year of 15-minute data keeps every peak and trough', () => {
  const n = 35_040;
  const x = Float64Array.from({ length: n }, (_, i) => i * 900_000);
  const y = Float64Array.from({ length: n }, (_, i) => 50 + 30 * Math.sin(i / 300) + ((i * 7919) % 13));
  y[12_345] = 999; // the peak that set the bill
  y[20_000] = -5;
  const d = downsampleMinMax(x, y, 300);
  assert.ok(d.x.length <= 600);
  assert.equal(Math.max(...d.y), 999);
  assert.equal(Math.min(...d.y), -5);
  assert.ok(d.x.includes(12_345 * 900_000));
  for (let i = 1; i < d.x.length; i++) assert.ok(d.x[i] > d.x[i - 1], 'time order kept');
  // Every bucket's extremes survive: check a few buckets directly.
  const span = x[n - 1] - x[0];
  for (const b of [0, 150, 299]) {
    const lo = x[0] + (b * span) / 300;
    const hi = b === 299 ? Infinity : x[0] + ((b + 1) * span) / 300;
    const inBucket = [...y].filter((_, i) => x[i] >= lo && x[i] < hi);
    const kept = d.y.filter((_, i) => d.x[i] >= lo && d.x[i] < hi);
    assert.equal(Math.max(...kept), Math.max(...inBucket));
    assert.equal(Math.min(...kept), Math.min(...inBucket));
  }
});

test('short series are drawn whole', () => {
  assert.deepEqual(downsampleMinMax([1, 2, 3], [4, 5, 6], 10), { x: [1, 2, 3], y: [4, 5, 6] });
});

test('ticks use 1, 2, or 5 steps and every tick is a value the chart reaches', () => {
  assert.deepEqual(niceTicks(0, 412), [0, 100, 200, 300, 400]);
  assert.deepEqual(niceTicks(0, 1), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  for (const t of niceTicks(13, 97)) assert.ok(t >= 13 && t <= 97);
  assert.deepEqual(niceTicks(5, 5), [5]);
});

test('the chart is an accessible figure with its summary, escaped labels, and role classes', () => {
  const svg = String(lineChart({
    title: 'Demand <test>', summary: 'Peak 412 kW on Jul 7.', yUnit: 'kW', xTick: (v) => String(v),
    series: [{ label: 'Your load', x: [0, 1, 2], y: [1, 412, 3] }, { label: 'With battery', x: [0, 1, 2], y: [1, 300, 3], role: 'whatif' }],
    highlight: { x: 1, y: 412, label: '412 kW' },
  }));
  assert.match(svg, /role="img" aria-label="Demand &lt;test&gt;\. Peak 412 kW on Jul 7\."/);
  assert.match(svg, /<figcaption>Peak 412 kW on Jul 7\.<\/figcaption>/);
  assert.match(svg, /class="series series-measured"/);
  assert.match(svg, /class="series series-whatif"/);
  assert.match(svg, /412 kW<\/text>/);
  assert.doesNotMatch(svg, /#[0-9a-f]{6}|rgb\(/i, 'colors come from CSS tokens, not literals');
});

test('the table view has a caption, row headers, and right-aligned numbers', () => {
  const t = String(tableView(['Month', 'Peak kW'], [['Jan 2026', 412], ['Feb 2026', 398]], 'Monthly peaks'));
  assert.match(t, /<caption>Monthly peaks<\/caption>/);
  assert.match(t, /<th scope="row">Jan 2026<\/th><td class="num">412<\/td>/);
});
