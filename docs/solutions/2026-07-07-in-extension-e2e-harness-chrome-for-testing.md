---
title: In-extension E2E harness for an MV3/WXT extension (branded Chrome silently ignores --load-extension)
date: 2026-07-07
repo: glownote
area: [e2e, browser-extension, mv3, ci, tooling]
severity: high
symptom: --load-extension is silently ignored; the extension never loads; content scripts never inject; E2E can't drive the real extension
root_cause: branded Google Chrome (M128+) disabled the --load-extension command-line switch; only Chrome for Testing / Chromium honor it
fix_commit: 411f3d6
tags: [puppeteer, cdp, chrome-for-testing, load-extension, headless, shadow-dom, wxt, portfolio-reusable]
---

## Problem

We needed a real in-extension E2E test: load the **packed** WXT/MV3 extension into a
browser launched **outside** the chrome-devtools MCP (the MCP Chromium runs
`--disable-extensions`), and drive the golden path over CDP.

Two non-obvious walls, in order:

1. **Branded Chrome silently ignores `--load-extension`.** Launching
   `google-chrome-stable` (Chrome 149) with `--load-extension=<unpacked>` +
   `--disable-extensions-except` produced **no extension** — content scripts never
   injected, `GlowNoteDB` was never created, no shadow hosts appeared. The tell:
   `chrome://extensions-internals` listed only Chrome's built-in COMPONENT
   extensions; ours (a `COMMAND_LINE` location) was absent entirely. Chrome M128+
   **deprecated and disabled** the switch for security. The old escape hatch
   `--disable-features=DisableLoadExtensionCommandLineSwitch` **no longer works** in
   this version.

2. **Headless is a red herring.** It was tempting to blame `--headless=new`, but the
   failure reproduced identically headed on a real `DISPLAY`. New headless actually
   supports MV3 content scripts fine — the problem was purely that branded Chrome
   never loaded the extension.

## Fix / recipe (portfolio-reusable)

Use **Chrome for Testing** (CfT) or Chromium — they still honor `--load-extension`.
Fetch CfT on demand into a gitignored cache with `@puppeteer/browsers`, pinned to the
version `puppeteer-core` expects (for CDP compatibility), then launch it yourself and
connect puppeteer over the debug port:

```js
import { install, computeExecutablePath, Browser } from '@puppeteer/browsers';
// buildId pinned to puppeteer-core's PUPPETEER_REVISIONS.chrome
const exe = computeExecutablePath({ browser: Browser.CHROME, buildId, cacheDir });
if (!existsSync(exe)) await install({ browser: Browser.CHROME, buildId, cacheDir });

spawn(exe, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${tmp}`,
  `--disable-extensions-except=${extPath}`,
  `--load-extension=${extPath}`,
  `--remote-debugging-port=${port}`, 'about:blank',
], { detached: true });               // detached → kill(-pid) reaps the whole tree

const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
```

Then drive the real content script:
- **Selection is shared DOM state** across the page's main world and the content
  script's isolated world — set it with the Range API in `page.evaluate`, and the
  content-script `mouseup` listener sees it.
- **Synthetic DOM events reach content-script listeners** (they're attached to the
  real document), so a dispatched `mouseup` triggers the toolbar without a flaky
  pixel-drag.
- **Pierce shadow roots** via `host.shadowRoot.querySelector(...)` inside
  `page.evaluate`; for a trusted click, compute the element's viewport center and use
  `page.mouse.click(x, y)`.
- **Assert the export** by granting clipboard permission
  (`context.overridePermissions(origin, ['clipboard-read','clipboard-write'])`) and
  reading `navigator.clipboard.readText()`; cross-check persisted state by opening the
  page-origin IndexedDB from `page.evaluate`.

## Gotchas worth keeping

- **Give the harness teeth.** A single-instant "is the toolbar gone?" DOM check did
  **not** catch the composedPath race (the app clears the selection async before the
  50ms mouseup timer, so the bug doesn't manifest via the natural click). Reproduce the
  race deterministically instead: with the selection still live, dispatch a `mouseup`
  from **inside** the toolbar shadow and count toolbar re-creations with a
  `MutationObserver`. Verified teeth by reverting the guard → the check fails
  (`re-shows=1`).
- **Teardown reaps the tree.** Create the server/Chrome/temp-profile INSIDE the
  try/finally (a launch failure otherwise leaks them); spawn Chrome `detached` and kill
  the process group (`process.kill(-pid)`) after `browser.close()`.
- **Content scripts need http, not file://** (no "allow file access") — serve fixtures
  from a tiny local server.

## Reuse

Any MV3/WXT extension in the portfolio can copy `e2e/harness.mjs` almost verbatim:
`withExtensionBrowser(fn)` = build-if-missing → fetch CfT → serve fixtures → launch with
the extension → connect CDP → teardown. Swap the fixture + golden-path assertions.
Invocation: `pnpm e2e`. CI: no system Chrome/xvfb needed; cache `.e2e-browser/`.
