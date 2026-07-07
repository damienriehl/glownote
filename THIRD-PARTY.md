# Third-Party Licenses & Attribution

glownote is licensed **MIT** (see `LICENSE`). It bundles the components below
into the shipped browser extension.

## Apache-2.0 components (NOTICE preserved on redistribution)

| Component | License | Notes |
|-----------|---------|-------|
| **pdfjs-dist** | Apache-2.0 | Mozilla PDF.js; bundled for in-page PDF highlighting. NOTICE: https://github.com/mozilla/pdf.js/blob/master/LICENSE |
| **dexie** | Apache-2.0 | IndexedDB wrapper |

## Other dependencies

| Component | License |
|-----------|---------|
| svelte | MIT |
| wxt, vitest, jsdom, @testing-library/* (dev) | MIT |

## Dev/test-only dependencies (NOT bundled into the shipped extension)

These run only during development, testing, and CI. They are never included in
the packed extension, so they carry no redistribution/NOTICE obligation for the
store build.

| Component | License | Purpose |
|-----------|---------|---------|
| **@sveltejs/vite-plugin-svelte** | MIT | Compiles `.svelte` components for the Vitest component tests |
| **puppeteer-core** | Apache-2.0 | Drives the in-extension E2E harness over CDP |
| **@puppeteer/browsers** | Apache-2.0 | Fetches Chrome for Testing for the E2E harness (branded Chrome disabled `--load-extension`) |
