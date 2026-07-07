# GlowNote

**Highlight the web in semantic colors, attach notes, and export clean Markdown your AI can read.**

GlowNote is a browser extension for close reading. Select text on any page — or inside a PDF — highlight it in one of six meaning-carrying colors, and jot a note. When you're done, export everything as structured, AI-ingestible Markdown you can drop straight into a chat, a prompt, or your notes.

---

## Why this exists

Web highlighters usually give you a wall of yellow with no structure and no clean way to get your annotations back out. GlowNote treats color as meaning and export as a first-class feature: your highlights carry categories (Important, Definition, Agree, Question, Disagree, and a general Highlight), your notes travel with them, and the exported Markdown is shaped so a language model can actually use it as context.

## Who it's for

- **Researchers and students** annotating articles, papers, and PDFs.
- **AI power users** who want to feed a model exactly the passages that matter, with their own notes attached.
- **Anyone who reads to write** — building a reading trail they can later summarize, cite, or query.

## Use cases

- Highlight passages across web pages and PDFs, color-coded by intent.
- Attach freeform notes to any highlight.
- Search and manage your highlights from a side panel.
- Export a page's (or a session's) annotations as AI-ingestible Markdown.
- Rename categories to fit your own reading system.

---

## Features

- **Six semantic colors** — Highlight, Important, Definition, Agree, Question, Disagree (customizable labels).
- **Keyboard-first** — `Alt+G` toggles the side panel; `Alt+H` highlights the current selection. Number keys 1–6 map to colors.
- **PDF support** — a built-in PDF viewer (pdf.js) so you can highlight inside PDFs, not just HTML.
- **Notes** — attach and edit notes per highlight.
- **Right-click menu** — highlight via the context menu.
- **Local-first storage** — annotations persist in IndexedDB (Dexie) with unlimited storage.
- **Markdown export** — structured output designed to be pasted into an LLM.

## Architecture

Built with [WXT](https://wxt.dev) and Svelte 5. Source lives under `src/`:

- `entrypoints/` — the extension surfaces: `background` (service worker), `glownote.content` (content script), `sidepanel`, `options`, and `pdf-viewer`.
- `components/` — Svelte UI (`HighlightList`, `NoteEditor`, `ColorPicker`, `CategoryManager`, `SearchBar`, `ExportControls`).
- `lib/` — core logic: `colors.ts` (the semantic palette + `::highlight()` CSS), `highlight/`, `storage/`, `sync/`, `export/`, `keyboard.ts`, `messages.ts`, `types.ts`.
- `pdf/` — `PdfViewer.svelte`, `pdf-renderer.ts`, `pdf-annotator.ts` (pdfjs-dist).

Requested permissions: `sidePanel`, `activeTab`, `contextMenus`, `storage`, `unlimitedStorage`. (The v0.1.0 store build is pure local-first — no `identity`/network permissions. An optional Google Drive export exists in the source but is gated off pending OAuth setup; see [`docs/store/SUBMISSION.md`](docs/store/SUBMISSION.md).)

## Stack

- **UI:** Svelte 5
- **Extension framework:** WXT
- **Storage:** Dexie (IndexedDB)
- **PDF:** pdfjs-dist
- **Language:** TypeScript
- **Testing:** Vitest + @testing-library/svelte (jsdom, fake-indexeddb)

---

## Setup

Requires Node.js and [pnpm](https://pnpm.io).

```bash
pnpm install
```

## Development

```bash
# Run the extension in dev mode (hot reload)
pnpm dev
```

## Build & package

```bash
# Production build (outputs to .output/)
pnpm build

# Zip for store submission
pnpm zip
```

## Tests

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+G`  | Toggle the GlowNote side panel |
| `Alt+H`  | Highlight the selected text |
| `1`–`6`  | Choose a highlight color |

## Chrome Web Store

Store-ready package and submission materials live in [`docs/store/`](docs/store/):
a production build (`pnpm build && pnpm zip` → `.output/glownote-0.1.0-chrome.zip`),
the 128×128 store icon, five 1280×800 screenshots, the listing copy
([`STORE-LISTING.md`](docs/store/STORE-LISTING.md)), and a step-by-step submission
runbook ([`SUBMISSION.md`](docs/store/SUBMISSION.md)). Submission is staged for the
developer-account holder to upload — nothing is auto-published.

## Status

Early development (version 0.1.0). Core flow (highlight → note → export Markdown)
verified; store submission staged.

## License

MIT — see [LICENSE](LICENSE).
