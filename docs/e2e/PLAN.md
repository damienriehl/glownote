# E2E harness plan — in-extension golden path (CE)

`/ce:plan` output for the L5.6 follow-up: a real, CI-invokable end-to-end test
that loads the **packed WXT extension** into a browser launched **outside** the
chrome-devtools MCP and drives the golden path over CDP.

## Why a separate browser

The chrome-devtools MCP Chromium runs with `--disable-extensions` and
`--remote-debugging-pipe` (verified in the fix-it campaign — see
`STATUS-lane-5-browser.md`). It cannot load an unpacked extension and the MCP
cannot attach to a separately-launched Chrome. So the harness launches its own
Chrome and drives it with `puppeteer-core` over `--remote-debugging-port`.

## Environment (this box)

- `google-chrome-stable` = Chrome 149 (real Chrome; loads unpacked extensions).
  snap `chromium` is avoided (sandbox blocks `--load-extension`).
- No `xvfb`. Chrome `--headless=new` **supports MV3 extensions + content-script
  injection**, so we run headless — no virtual display needed. (`web-ext` is not
  installed; `--load-extension` gives more control anyway.)
- `puppeteer-core@25.3.0` connects to the self-launched Chrome (no bundled
  Chromium download).

## Launch recipe (the portable bit)

```
google-chrome-stable \
  --headless=new --disable-gpu \
  --no-first-run --no-default-browser-check \
  --user-data-dir=<temp> \
  --disable-extensions-except=<abs .output/chrome-mv3> \
  --load-extension=<abs .output/chrome-mv3> \
  --remote-debugging-port=<port> about:blank
```

Then `puppeteer.connect({ browserURL: 'http://127.0.0.1:<port>' })`.

The fixture is served over **http** (content scripts do not run on `file://`
without "allow file access") by a tiny built-in Node `http` server on a
deterministic port (`8700 + hash(name) % 1300`, incremented if busy).

## Golden path (asserted)

1. `goto` the fixture page; wait for the content script to inject.
2. Establish a selection over a known phrase (Range API — selection is shared
   DOM state visible to the content script's isolated world).
3. Dispatch `mouseup` → the real content-script handler shows the
   `<glownote-selection-toolbar>` shadow host. **Assert toolbar appears.**
4. Trusted CDP click on a color button (computed shadow coords) → mousedown
   `preventDefault` preserves the selection; `onHighlight` fires.
   **Assert:** the toolbar is dismissed and the `<glownote-popover>` opens —
   and the toolbar does **not** re-show over it (the L5.6 composedPath race,
   now verified in-browser end-to-end, not just at component level).
5. Type a note into the popover textarea; blur → note saved.
6. Press `e` → export → markdown copied to clipboard (permission granted via
   CDP). **Assert** the exported markdown contains the YAML front matter, the
   highlighted phrase, and the note. Cross-check the persisted annotation in the
   page-origin IndexedDB (`GlowNoteDB`).

Exit non-zero on any failed assertion → CI-invokable (`pnpm e2e`).

## Files

- `e2e/harness.mjs` — build check, static server, Chrome launch, puppeteer
  connect, teardown. `withExtensionBrowser(fn)` = the reusable recipe.
- `e2e/golden-path.mjs` — the golden-path test + assertions (entry point).
- `e2e/fixtures/sample.html` — legal-text fixture.
- `e2e/README.md` — invocation + CI notes.
