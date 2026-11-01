// The ten meters the weather model is compared on (add-weather-normalization
// 2.5): 2024 daily mean temperatures from the served GHCN-Daily snapshot at
// ten first-order stations, and daily use built from stated parameters with a
// deterministic wobble. Writes the inputs verify/tools/eemeter-reference.py
// fits with OpenEEmeter.
//   node verify/tools/weather-meters.mjs > /tmp/meters-in.json

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../pipeline/run.mjs';
import { readShard } from '../../core/lib/shard.mjs';
import { dailyMeans } from '../../core/lib/weather-stations.mjs';

const { version } = JSON.parse(readFileSync(join(ROOT, 'data/ghcn-daily/current.json'), 'utf8'));
const CASES = [
  { id: 'boston-heat', station: 'USW00014739', state: 'MA', base: 18, heat: 1.1, bh: 58 },
  { id: 'minneapolis-heat', station: 'USW00014922', state: 'MN', base: 22, heat: 0.8, bh: 55 },
  { id: 'chicago-heat', station: 'USW00094846', state: 'IL', base: 15, heat: 1.4, bh: 61 },
  { id: 'phoenix-cool', station: 'USW00023183', state: 'AZ', base: 20, cool: 1.6, bc: 72 },
  { id: 'houston-cool', station: 'USW00012960', state: 'TX', base: 25, cool: 1.9, bc: 70 },
  { id: 'miami-cool', station: 'USW00012839', state: 'FL', base: 17, cool: 2.2, bc: 75 },
  { id: 'atlanta-mixed', station: 'USW00013874', state: 'GA', base: 20, heat: 0.9, bh: 55, cool: 1.3, bc: 70 },
  { id: 'kansascity-mixed', station: 'USW00003947', state: 'MO', base: 24, heat: 1.0, bh: 52, cool: 1.5, bc: 73 },
  { id: 'sandiego-flat', station: 'USW00023188', state: 'CA', base: 12 },
  { id: 'seattle-flat', station: 'USW00024233', state: 'WA', base: 9 },
];
const cases = CASES.map((c) => {
  const rows = readShard(readFileSync(join(ROOT, 'data/ghcn-daily', version, 'daily', `${c.state}.bin`))).rows();
  const { means } = dailyMeans(rows, c.station);
  const daily = [...means].filter(([d]) => d.startsWith('2024-')).sort().map(([date, meanF], i) => {
    const kwh = c.base + (c.heat ?? 0) * Math.max(0, (c.bh ?? 0) - meanF) + (c.cool ?? 0) * Math.max(0, meanF - (c.bc ?? 200)) + 2 * Math.sin(i * 1.7) + Math.cos(i * 0.31);
    return { date, meanF: Math.round(meanF * 100) / 100, kwh: Math.round(kwh * 1000) / 1000 };
  });
  return { ...c, daily };
});
console.log(JSON.stringify({ snapshot: `ghcn-daily ${version}`, cases }));
