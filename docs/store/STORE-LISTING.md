# GlowNote — Chrome Web Store Listing (draft v0.1.0)

Copy-paste source for the Chrome Web Store submission. All fields prepared for a
**pure local-first** build (no data collection, nothing leaves the device).

---

## Store listing tab

**Product name** (≤ 45 chars)
```
GlowNote — Highlight & Export to Markdown
```
(41 chars. Manifest name stays `GlowNote`.)

**Summary / short description** (≤ 132 chars)
```
Highlight any web page or PDF in six meaning-carrying colors, add notes, and export clean, AI-ingestible Markdown. Local-first.
```
(125 chars.)

**Category:** `Productivity`

**Language:** English (United States)

**Detailed description**
```
GlowNote turns highlighting into a real note-taking and research tool.

Most web highlighters give you a wall of yellow with no structure and no clean
way to get your annotations back out. GlowNote treats color as meaning and
export as a first-class feature.

── Highlight in colors that mean something ──
Select text on any page — or inside a PDF — and highlight it in one of six
semantic colors: Highlight, Important, Definition, Agree, Question, Disagree.
One click, or press a number key (1–6). Rename any category to fit your own
reading system.

── Attach notes ──
Jot a note on any highlight. Your notes travel with the highlight and land in
your export.

── Manage everything from the side panel ──
Search your highlights and notes, filter by color, jump back to any passage,
and edit or delete — all from a panel that lives beside the page. Alt+G toggles
it; Alt+H highlights the current selection.

── Export AI-ingestible Markdown ──
One click gives you structured Markdown with YAML front matter and callout
blocks, shaped so a language model can use it as context. Paste it straight
into a chat, a prompt, or your notes.

── PDFs too ──
A built-in PDF viewer (pdf.js) lets you highlight inside PDFs, not just HTML
pages.

── Private by design ──
GlowNote is local-first. Your highlights and notes are stored in your browser
(IndexedDB) and never leave your device. No account, no cloud, no tracking,
no analytics.

Keyboard shortcuts:
• Alt+G — toggle the side panel
• Alt+H — highlight the selection
• 1–6 — choose a color
• Right-click — highlight via the context menu

Open source (MIT).
```

**Screenshots** (1280×800 PNG — upload in this order):
1. `screenshots/1-highlight.png` — in-page selection toolbar over an article
2. `screenshots/2-notes.png` — note popover on a highlight
3. `screenshots/3-sidepanel.png` — side panel with highlight list + filters
4. `screenshots/4-export.png` — exported Markdown (YAML + callouts)
5. `screenshots/5-pdf-local.png` — PDF highlighting + local-first badges

**Store icon:** `store-icon-128.png` (128×128, auto-derived from the extension icon).

**Small promo tile (440×280):** optional — not provided; can be skipped for initial submission.

---

## Privacy practices tab

**Single purpose description**
```
GlowNote lets a user highlight text on web pages and in PDFs, attach notes to
those highlights, and export them as Markdown. All data stays on the user's
own device.
```

**Permission justifications**

| Permission | Justification |
|---|---|
| `activeTab` | Read the user's current text selection and inject highlights only on the tab the user is actively annotating, on user action. |
| `sidePanel` | Show GlowNote's highlight list / management UI in Chrome's side panel. |
| `contextMenus` | Provide a right-click "Highlight as…" menu to create highlights. |
| `storage` | Persist user settings (category labels, note mode) via chrome.storage.sync so preferences survive restarts. |
| `unlimitedStorage` | Store highlights/notes locally in IndexedDB without the default quota cap, since heavy readers accumulate many annotations. |
| Host permissions (`<all_urls>` content script) | The content script must run on any page the user chooses to highlight; it activates only when the user selects text or invokes GlowNote. No page data is transmitted anywhere. |

**Remote code:** No — the extension executes no remotely-hosted code. All logic ships in the package.

**Data usage disclosures** (Chrome Web Store data collection form):
- Does this extension collect or use user data? **No.**
- Personally identifiable info: **Not collected.**
- Health / financial / authentication / personal communications / location / web history / user activity / website content: **Not collected, not transmitted.**
- Sold to third parties: **No.**
- Used/transferred for purposes unrelated to core functionality: **No.**
- Used/transferred to determine creditworthiness / lending: **No.**

**Certifications (required checkboxes):**
- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** Not required for the local-first v0.1.0 build (no data collected).
If Google Drive export is re-enabled later (see SUBMISSION.md), a privacy policy
URL and OAuth verification become mandatory.
