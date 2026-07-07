---
title: Selection toolbar flickered back over the note popover (asymmetric composedPath guard)
date: 2026-07-07
repo: glownote
area: [content-script, shadow-dom, events]
severity: medium
symptom: clicking a toolbar color re-showed the toolbar on top of the just-opened popover; "not really working"
root_cause: mousedown handler guarded in-UI events via composedPath(); mouseup handler did not
fix_commit: cb4d69f
tags: [wxt, shadow-dom, composedPath, selection, event-race]
---

## Problem

The content script shows a selection toolbar on `mouseup` (when text is selected) and
opens a note popover after the user picks a color. The document-level `mousedown` handler
already guarded against events originating **inside** the toolbar's shadow host via
`event.composedPath()`, but the `mouseup` handler did **not**.

So clicking a toolbar color button re-entered the `mouseup` path — the page selection was
still present — and called `showSelectionToolbar()` again, re-showing the toolbar on top
of the popover that `onHighlight` had just opened. To the user, highlighting "didn't work":
the toolbar flickered back and sat over/instead of the note editor.

(The core highlight/anchor/export logic was sound — proven by an integration test.)

## Fix

Guard **both** pointer events symmetrically. `composedPath()` must be read synchronously,
before the handler's `setTimeout`:

```ts
function isInsideGlowNoteUi(e: Event): boolean {
  const hosts = ['glownote-selection-toolbar', 'glownote-popover'];
  return e.composedPath().some(
    (el) => el instanceof HTMLElement && hosts.includes(el.tagName.toLowerCase()));
}
document.addEventListener('mouseup', (e) => {
  if (isInsideGlowNoteUi(e)) return; // don't re-show over our own UI
  setTimeout(() => { /* ...selection/hit-test... */ }, 50);
});
```

Also hardened selection preservation: `SelectionToolbar` root does
`onmousedown={(e) => e.preventDefault()}` so a color click can't collapse the page
selection before `highlightSelection()` reads it.

## Lesson (reusable)

For extension UIs mounted in a **shadow root**, treat pointer events **symmetrically**:
if one handler filters "events inside our own UI" via `composedPath()`, every sibling
handler on the same element chain must do the same, or one of them will act on the user's
click *into* the UI as if it were a click on the page. Read `composedPath()` synchronously;
it's empty by the time a deferred callback runs.

## Environment note

True in-extension E2E could not run under chrome-devtools MCP: its Chromium launches with
`--disable-extensions` + `--remote-debugging-pipe` (verified via `chrome://version`), so an
unpacked WXT build can't be loaded and the MCP can't attach to a separate Chrome. The fix
was verified against a faithful real-browser repro (real shadow host + composedPath + real
click). Follow-up: a WXT-dev/web-ext E2E harness.
