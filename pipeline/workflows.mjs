// Every scheduled workflow, its interval, and its staleness threshold
// (platform/automation, "Each workflow declares its interval and its staleness
// threshold"): three times the interval, never under 48 hours. The health
// record ships this list so pages can judge staleness on the device.

const HOUR = 3_600_000;
const threshold = (hours) => Math.max(3 * hours, 48);

export const WORKFLOWS = [
  { id: 'refresh-data', file: 'refresh-data.yml', intervalHours: 24, cron: '17 9 * * *', datasets: ['eia-861', 'eia-860', 'eia-923', 'eia-860m', 'urdb', 'eia-930', 'ghcn-daily', 'eia-861-net-metering', 'nlr-sharing-the-sun'] },
  { id: 'link-check', file: 'link-check.yml', intervalHours: 168, cron: '23 7 * * 2', datasets: [] },
  { id: 'canary', file: 'canary.yml', intervalHours: 168, cron: '41 5 * * 3', datasets: [] },
  // Started by the Worker's nightly watchdog, not by a schedule here: its row shows whether the watchdog runs.
  { id: 'heartbeat', file: 'heartbeat.yml', intervalHours: 24, cron: null, datasets: [] },
].map((w) => ({ ...w, thresholdHours: threshold(w.intervalHours) }));

/** Whether a workflow's last success is older than its threshold. */
export function stalled(w, lastSuccess, now = Date.now()) {
  return !lastSuccess || now - Date.parse(lastSuccess) > w.thresholdHours * HOUR;
}
