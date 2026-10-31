// The reference profile (platform/app-shell, "Performance budgets"): Chrome
// with 4x CPU slowdown, 150 ms round trips, 1.6 Mbps down, and 750 kbps up,
// as Lighthouse's mobile profile sets them. Applied over the DevTools Protocol.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export const PROFILE = { cpuSlowdown: 4, latencyMs: 150, downBytesPerSecond: 1_600_000 / 8, upBytesPerSecond: 750_000 / 8 };
export const BUDGETS = { firstAnswerMs: 1500, toolPageJsGzipBytes: 150 * 1024, parse35040RowsMs: 1000, entityPageHtmlGzipBytes: 100 * 1024 };

/** @param {{cdp: (method: string, params?: object) => Promise<any>}} chrome */
export async function applyReferenceProfile(chrome) {
  await chrome.cdp('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpuSlowdown });
  await chrome.cdp('Network.emulateNetworkConditions', {
    offline: false, latency: PROFILE.latencyMs, downloadThroughput: PROFILE.downBytesPerSecond, uploadThroughput: PROFILE.upBytesPerSecond,
  });
  await chrome.cdp('Network.setCacheDisabled', { cacheDisabled: true });
}

/** Compressed bytes of every script a page loaded. */
export function jsGzipBytes(requests, origin, dist) {
  const scripts = [...new Set(requests.filter((u) => u.startsWith(origin) && /\.(m?js)$/.test(new URL(u).pathname)).map((u) => new URL(u).pathname))];
  return { files: scripts.length, bytes: scripts.reduce((n, p) => n + gzipSync(readFileSync(join(dist, p))).length, 0) };
}
