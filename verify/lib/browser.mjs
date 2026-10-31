// Our own browser driver (foundation design D8): Chrome over the DevTools
// Protocol, Firefox over WebDriver BiDi, both through Node's built-in
// WebSocket, and Safari through the built-in safaridriver. It does only what
// the end-to-end gates need: load a page, run script, record every request the
// page makes, and resize the viewport.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const CANDIDATES = {
  chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
  firefox: ['/Applications/Firefox.app/Contents/MacOS/firefox', 'firefox'],
  safari: ['/usr/bin/safaridriver'],
};

/** @param {string} name */
function onPath(name) {
  if (name.includes('/')) return existsSync(name) ? name : null;
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Executable path for a browser, or null when it is not installed.
 * GRIDPRIMS_CHROME and GRIDPRIMS_FIREFOX override the search.
 * @param {'chrome' | 'firefox' | 'safari'} kind
 */
export function findBrowser(kind) {
  const override = process.env[`GRIDPRIMS_${kind.toUpperCase()}`];
  if (override) return existsSync(override) ? override : null;
  for (const c of CANDIDATES[kind]) {
    const p = onPath(c);
    if (p) return p;
  }
  return null;
}

/** Browsers available here, in a stable order. */
export function availableBrowsers() {
  return /** @type {const} */ (['chrome', 'firefox']).filter((k) => findBrowser(k));
}

/**
 * Wait for a line on a child's stderr that matches, or fail after a timeout.
 * @param {import('node:child_process').ChildProcess} child
 * @param {RegExp} re
 * @param {number} ms
 */
function waitForLine(child, re, ms) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`browser did not start: ${buf.slice(-500)}`)), ms);
    const onData = (d) => {
      buf += d;
      const m = re.exec(buf);
      if (m) { clearTimeout(timer); child.stderr.off('data', onData); resolve(m); }
    };
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`browser exited with ${code}: ${buf.slice(-500)}`)); });
  });
}

/** Every browser process this module started, killed on exit so a timed-out test never leaves one holding the event loop. */
const children = new Set();
process.on('exit', () => { for (const c of children) c.kill('SIGKILL'); });

/** @param {import('node:child_process').ChildProcess} child */
function track(child) {
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}

/** Reject after ms with a message naming what was being waited for. */
function within(promise, ms, what) {
  let timer;
  return Promise.race([promise, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timed out after ${ms} ms: ${what}`)), ms); })])
    .finally(() => clearTimeout(timer));
}

const COMMAND_MS = 30_000;

/**
 * Stop a browser and remove its profile. Waits for the process to exit
 * (forcing it after 3 s), because a browser still writing its profile makes
 * the removal fail.
 */
async function shutdown(child, profile) {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((r) => child.once('exit', r));
    child.kill();
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    await exited;
    clearTimeout(timer);
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

/** A JSON-over-WebSocket client with numbered commands and event listeners. */
class Socket {
  /** @param {string} url */
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error(`cannot connect to ${url}`)); });
    return new Socket(ws);
  }
  constructor(ws) {
    this.ws = ws;
    this.next = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(typeof msg.error === 'string' ? `${msg.error}: ${msg.message}` : msg.error.message));
        else resolve(msg.result);
      } else for (const l of this.listeners) l(msg);
    };
  }
  send(method, params = {}, extra = {}) {
    const id = this.next++;
    this.ws.send(JSON.stringify({ id, method, params, ...extra }));
    return within(new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })), COMMAND_MS, method);
  }
  on(fn) { this.listeners.push(fn); }
  close() { try { this.ws.close(); } catch { /* already closed */ } }
}

/**
 * @typedef {{
 *   kind: string,
 *   requests: string[],
 *   goto: (url: string) => Promise<void>,
 *   evaluate: (expression: string) => Promise<any>,
 *   setViewport: (width: number, height: number) => Promise<void>,
 *   screenshot: () => Promise<Buffer>,
 *   close: () => Promise<void>,
 * }} Browser
 */

/**
 * Launch a headless browser with a fresh profile.
 * @param {'chrome' | 'firefox'} kind
 * @returns {Promise<Browser>}
 */
export async function launch(kind) {
  const exe = findBrowser(kind);
  if (!exe) throw new Error(`${kind} is not installed`);
  const profile = mkdtempSync(join(tmpdir(), `gridprims-${kind}-`));
  return kind === 'chrome' ? launchChrome(exe, profile) : launchFirefox(exe, profile);
}

/** @returns {Promise<Browser>} */
async function launchChrome(exe, profile) {
  const child = track(spawn(exe, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-sandbox', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] }));
  const [, wsUrl] = await waitForLine(child, /DevTools listening on (ws:\/\/\S+)/, 20_000);
  const sock = await Socket.open(wsUrl);
  const { targetId } = await sock.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await sock.send('Target.attachToTarget', { targetId, flatten: true });
  const cmd = (method, params) => sock.send(method, params, { sessionId });
  const requests = [];
  let loaded = null;
  sock.on((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
    if (m.method === 'Page.loadEventFired' && loaded) { loaded(); loaded = null; }
  });
  await cmd('Page.enable');
  await cmd('Network.enable');
  await cmd('Runtime.enable');
  return {
    kind: 'chrome',
    requests,
    async goto(url) {
      const done = new Promise((r) => { loaded = r; });
      const res = await cmd('Page.navigate', { url });
      if (res.errorText) throw new Error(`navigation failed: ${res.errorText}`);
      await within(done, COMMAND_MS, `load of ${url}`);
    },
    async evaluate(expression) {
      const r = await cmd('Runtime.evaluate', { expression: asJson(expression), awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return fromJson(r.result.value);
    },
    async setViewport(width, height) {
      await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    },
    async screenshot() {
      const { data } = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      return Buffer.from(data, 'base64');
    },
    async close() {
      try { await Promise.race([sock.send('Browser.close'), new Promise((r) => setTimeout(r, 2000))]); } catch { /* closing */ }
      sock.close();
      await shutdown(child, profile);
    },
  };
}

/**
 * Results cross the protocol as JSON text, so shared and repeated objects in a
 * result arrive whole in both engines (BiDi would send repeats as references).
 * @param {string} expression
 */
const asJson = (expression) => `(async () => { const v = await (${expression}); return v === undefined ? '"__undefined__"' : JSON.stringify(v); })()`;
const fromJson = (text) => { const v = JSON.parse(text); return v === '__undefined__' ? undefined : v; };

/** Preferences that keep a test profile quiet: no updates, telemetry, or first-run pages. */
const FIREFOX_PREFS = {
  'app.update.disabledForTesting': true,
  'browser.shell.checkDefaultBrowser': false,
  'browser.startup.homepage_override.mstone': 'ignore',
  'datareporting.policy.dataSubmissionEnabled': false,
  'toolkit.telemetry.reportingpolicy.firstRun': false,
  'browser.aboutwelcome.enabled': false,
  'network.captive-portal-service.enabled': false,
  'network.connectivity-service.enabled': false,
};

/** @returns {Promise<Browser>} */
async function launchFirefox(exe, profile) {
  writeFileSync(join(profile, 'user.js'), Object.entries(FIREFOX_PREFS).map(([k, v]) => `user_pref(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('\n'));
  const child = track(spawn(exe, ['--headless', '--remote-debugging-port=0', '--no-remote', '--profile', profile, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] }));
  const [, wsBase] = await waitForLine(child, /WebDriver BiDi listening on (ws:\/\/\S+)/, 30_000);
  const sock = await Socket.open(`${wsBase.replace(/\/$/, '')}/session`);
  await sock.send('session.new', { capabilities: {} });
  const tree = await sock.send('browsingContext.getTree', {});
  const context = tree.contexts[0].context;
  const requests = [];
  sock.on((m) => {
    if (m.method === 'network.beforeRequestSent' && m.params.context === context) requests.push(m.params.request.url);
  });
  await sock.send('session.subscribe', { events: ['network.beforeRequestSent'], contexts: [context] });
  return {
    kind: 'firefox',
    requests,
    async goto(url) {
      await sock.send('browsingContext.navigate', { context, url, wait: 'complete' });
    },
    async evaluate(expression) {
      const r = await sock.send('script.evaluate', { expression: asJson(expression), target: { context }, awaitPromise: true, resultOwnership: 'none' });
      if (r.type === 'exception') throw new Error(r.exceptionDetails.text);
      return fromJson(fromBidi(r.result));
    },
    async setViewport(width, height) {
      await sock.send('browsingContext.setViewport', { context, viewport: { width, height } });
    },
    async screenshot() {
      const { data } = await sock.send('browsingContext.captureScreenshot', { context, origin: 'document' });
      return Buffer.from(data, 'base64');
    },
    async close() {
      try { await Promise.race([sock.send('browser.close', {}), new Promise((r) => setTimeout(r, 2000))]); } catch { /* closing */ }
      sock.close();
      await shutdown(child, profile);
    },
  };
}

/** Convert a WebDriver BiDi remote value to a plain JavaScript value. */
export function fromBidi(v) {
  switch (v.type) {
    case 'undefined': return undefined;
    case 'null': return null;
    case 'string': case 'boolean': return v.value;
    case 'number': return typeof v.value === 'string' ? Number(v.value === '-0' ? -0 : v.value) : v.value;
    case 'bigint': return BigInt(v.value);
    case 'array': return v.value.map(fromBidi);
    case 'object': return Object.fromEntries(v.value.map(([k, val]) => [typeof k === 'string' ? k : fromBidi(k), fromBidi(val)]));
    default: return v.value ?? null;
  }
}

/**
 * Run a script in Safari through safaridriver (classic WebDriver over HTTP).
 * Safari's driver cannot record requests, so it runs the smaller suite only.
 * Returns null when Safari automation is not enabled on this machine.
 * @param {string} url
 * @param {string} asyncScript body for /execute/async; call arguments[0](result) when done
 */
export async function runInSafari(url, asyncScript) {
  const exe = findBrowser('safari');
  if (!exe) return null;
  const port = 45_000 + Math.floor(Math.random() * 10_000);
  const child = track(spawn(exe, ['-p', String(port)], { stdio: 'ignore' }));
  const base = `http://127.0.0.1:${port}`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    return res.json();
  };
  try {
    let session = null;
    for (let i = 0; i < 40 && !session; i++) {
      try { session = await call('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari' } } }); } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
    const id = session?.value?.sessionId;
    if (!id) return null; // "Allow Remote Automation" is off, or another session is open
    try {
      await call('POST', `/session/${id}/url`, { url });
      const r = await call('POST', `/session/${id}/execute/async`, { script: asyncScript, args: [] });
      return r.value;
    } finally {
      await call('DELETE', `/session/${id}`);
    }
  } finally {
    child.kill();
  }
}
