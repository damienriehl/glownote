/**
 * Reusable in-extension E2E harness for a WXT/MV3 browser extension.
 *
 * The portable recipe: build the unpacked extension, serve fixtures over http,
 * launch a REAL Chrome (outside any MCP) with the extension loaded and a CDP
 * remote-debugging port, connect puppeteer-core, run a driver fn, then tear
 * everything down. Headless `--headless=new` supports MV3 content scripts, so no
 * xvfb is required.
 *
 * Env overrides: CHROME_BIN (browser binary), GLOWNOTE_HEADLESS=0 (run headed).
 */

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { install, computeExecutablePath, resolveBuildId, Browser } from '@puppeteer/browsers';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..');
export const EXT_PATH = join(REPO_ROOT, '.output', 'chrome-mv3');
export const FIXTURES_DIR = join(__dirname, 'fixtures');
const BROWSER_CACHE = join(REPO_ROOT, '.e2e-browser');

// Chrome version pinned by puppeteer-core (kept in sync for CDP compatibility).
const CHROME_BUILD_ID = '150.0.7871.24';

/**
 * Resolve a browser binary that honors `--load-extension`.
 *
 * IMPORTANT: branded Google Chrome (M128+) *disabled* the `--load-extension`
 * command-line switch — it is silently ignored, so the extension never loads.
 * Only **Chrome for Testing** / Chromium still honor it. So we use Chrome for
 * Testing, fetched on demand into a gitignored cache via @puppeteer/browsers.
 * Override with CHROME_BIN (must be CfT or Chromium, NOT branded Chrome).
 */
async function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;

  const buildId = await resolveBuildId(Browser.CHROME, 'linux', CHROME_BUILD_ID).catch(() => CHROME_BUILD_ID);
  const executablePath = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir: BROWSER_CACHE });
  if (existsSync(executablePath)) return executablePath;

  console.log(`[harness] fetching Chrome for Testing ${buildId} (honors --load-extension)...`);
  const installed = await install({ browser: Browser.CHROME, buildId, cacheDir: BROWSER_CACHE });
  return installed.executablePath;
}

/** Deterministic port in 8700-9999 from a seed, per the repo port convention. */
function seededPort(seed) {
  const h = parseInt(createHash('md5').update(seed).digest('hex').slice(0, 8), 16);
  return 8700 + (h % 1300);
}

async function isPortFree(port) {
  return new Promise((res) => {
    const srv = createServer();
    srv.once('error', () => res(false));
    srv.once('listening', () => srv.close(() => res(true)));
    srv.listen(port, '127.0.0.1');
  });
}

async function pickPort(seed) {
  let port = seededPort(seed);
  for (let i = 0; i < 200; i++) {
    if (await isPortFree(port)) return port;
    port++;
  }
  throw new Error('No free port found near ' + seededPort(seed));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

/** Tiny static file server for the fixtures dir. */
async function startFixtureServer() {
  const port = await pickPort('glownote-e2e-fixtures');
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const rel = url.pathname === '/' ? '/sample.html' : url.pathname;
      const filePath = join(FIXTURES_DIR, rel.replace(/^\/+/, ''));
      if (!filePath.startsWith(FIXTURES_DIR)) { res.writeHead(403).end(); return; }
      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${port}`;
  return { origin, close: () => new Promise((r) => server.close(r)) };
}

/** Ensure the unpacked extension exists; build it if missing. */
function ensureBuild() {
  if (existsSync(join(EXT_PATH, 'manifest.json'))) return;
  console.log('[harness] no build found — running `pnpm build`...');
  const r = spawnSync('pnpm', ['build'], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('pnpm build failed');
}

async function waitForDevtools(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Chrome DevTools endpoint did not come up on port ' + port);
}

/** Launch Chrome with the extension loaded + a CDP port. Returns { proc, port, userDataDir }. */
async function launchChrome() {
  const chrome = await findChrome();
  const port = await pickPort('glownote-e2e-cdp');
  const userDataDir = await mkdtemp(join(tmpdir(), 'glownote-e2e-'));
  const headless = process.env.GLOWNOTE_HEADLESS !== '0';
  const args = [
    ...(headless ? ['--headless=new'] : []),
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    // Chrome M128+ deprecated the --load-extension switch and silently ignores
    // it unless this feature is disabled. Without it the extension never loads.
    '--disable-features=DisableLoadExtensionCommandLineSwitch',
    `--user-data-dir=${userDataDir}`,
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    `--remote-debugging-port=${port}`,
    'about:blank',
  ];
  const proc = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d.toString(); });
  proc.on('exit', (code) => {
    if (code && code !== 0) console.error('[harness] chrome exited', code, stderr.slice(-800));
  });
  await waitForDevtools(port);
  return { proc, port, userDataDir };
}

/**
 * Run `fn({ browser, page, origin, fixtureUrl })` against a fresh Chrome with
 * the extension loaded and a served fixture. Guarantees teardown.
 */
export async function withExtensionBrowser(fn) {
  ensureBuild();
  const fixtures = await startFixtureServer();
  const chrome = await launchChrome();
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}`, defaultViewport: { width: 1280, height: 800 } });
    // Grant clipboard access for the fixture origin so the export path (which
    // calls navigator.clipboard.writeText) succeeds and can be read back.
    try {
      const ctx = browser.defaultBrowserContext();
      await ctx.overridePermissions(fixtures.origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
    } catch (e) {
      console.warn('[harness] clipboard permission override failed (continuing):', e.message);
    }
    const page = await browser.newPage();
    const fixtureUrl = `${fixtures.origin}/sample.html`;
    return await fn({ browser, page, origin: fixtures.origin, fixtureUrl });
  } finally {
    try { if (browser) await browser.disconnect(); } catch { /* noop */ }
    try { chrome.proc.kill('SIGKILL'); } catch { /* noop */ }
    await fixtures.close();
    try { await rm(chrome.userDataDir, { recursive: true, force: true }); } catch { /* noop */ }
  }
}
