# In-extension E2E harness

Real end-to-end test that loads the **packed GlowNote extension** into a real
browser (launched outside any MCP) and drives the golden path over CDP.

## Invocation

```bash
pnpm e2e
```

That's it. The harness (`e2e/harness.mjs`) is self-contained and CI-invokable:

1. **Builds** the unpacked extension (`pnpm build`) if `.output/chrome-mv3` is missing.
2. **Fetches** Chrome for Testing 150 into `.e2e-browser/` (gitignored) on first run.
3. **Serves** the fixture (`e2e/fixtures/sample.html`) over http on a deterministic port.
4. **Launches** Chrome with the extension loaded + a CDP remote-debugging port.
5. **Drives** `e2e/golden-path.mjs` via `puppeteer-core` and asserts.
6. **Tears down** browser, server, and temp profile.

Exit code is non-zero on any failed assertion.

## The golden path (`e2e/golden-path.mjs`)

`select text → toolbar appears → color click → note popover → save note →
export markdown → assert content`, plus a **deterministic composedPath-race
regression**: a re-entrant `mouseup` from inside the toolbar (with a live
selection) must not re-show the toolbar over the popover — the L5.6 bug. That
sub-check is proven to have teeth: reverting the `isInsideGlowNoteUi(e)` guard in
the content script makes it fail (`re-shows=1`).

## Why Chrome for Testing (not system Chrome)

Branded Google Chrome (M128+) **disabled the `--load-extension` command-line
switch** — it is silently ignored and the extension never loads (verified: only
Chrome's built-in COMPONENT extensions appear in `chrome://extensions-internals`).
Only **Chrome for Testing** / Chromium still honor `--load-extension`, so the
harness uses CfT (pinned to the version puppeteer-core expects, for CDP
compatibility). This is also why the earlier chrome-devtools-MCP Chromium
(`--disable-extensions`) could not run this test.

## Environment knobs

| Env var | Effect |
|---------|--------|
| `CHROME_BIN` | Use a specific browser binary (must be **CfT or Chromium**, not branded Chrome). |
| `GLOWNOTE_HEADLESS=0` | Run headed (needs a display / `xvfb`). Default is `--headless=new`, which supports MV3 content scripts — no xvfb required. |

## CI notes

- No system Chrome, xvfb, or display required — CfT runs headless.
- First run downloads ~150 MB of CfT into `.e2e-browser/`; cache it between CI runs.
- Run after `pnpm test` (unit + component) as the integration gate: `pnpm test && pnpm e2e`.
