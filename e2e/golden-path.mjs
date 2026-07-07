/**
 * In-extension E2E golden path (entry point: `pnpm e2e`).
 *
 * Drives the REAL packed GlowNote extension in a REAL Chrome (loaded via
 * --load-extension, outside the MCP) over CDP:
 *
 *   select text → toolbar appears → color click → note popover → save note
 *   → export markdown → assert content
 *
 * Also asserts the L5.6 composedPath race stays fixed in-browser: after the
 * color click the toolbar must NOT re-show over the popover.
 *
 * Exits non-zero on any failed assertion (CI-invokable).
 */

import { withExtensionBrowser } from './harness.mjs';

const PHRASE = 'voir dire process';
const NOTE = 'Set the theme of the case here.';

let step = 0;
function log(msg) { console.log(`[e2e] ${String(++step).padStart(2, '0')}  ${msg}`); }
function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
  console.log(`        ✓ ${msg}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll `fn` until it returns truthy or the timeout elapses. */
async function poll(fn, { timeout = 5000, interval = 100, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(interval);
  }
}

async function shadowHostPresent(page, tag) {
  return page.evaluate((t) => !!document.querySelector(t), tag);
}

/** Viewport-center coords of a shadow-hosted element, or null if absent. */
async function shadowElementCenter(page, hostTag, selector) {
  return page.evaluate((hostTag, selector) => {
    const host = document.querySelector(hostTag);
    const el = host?.shadowRoot?.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, hostTag, selector);
}

async function run() {
  await withExtensionBrowser(async ({ page, fixtureUrl }) => {
    log(`load fixture ${fixtureUrl}`);
    await page.goto(fixtureUrl, { waitUntil: 'load' });

    // ── select text → toolbar appears ──
    log(`select "${PHRASE}" and dispatch mouseup (retry until content script is live)`);
    await poll(async () => {
      const selected = await page.evaluate((phrase) => {
        const para = document.getElementById('para');
        const tn = para.firstChild;
        const start = tn.data.indexOf(phrase);
        if (start < 0) return null;
        const range = document.createRange();
        range.setStart(tn, start);
        range.setEnd(tn, start + phrase.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        para.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
        return sel.toString();
      }, PHRASE);
      if (selected !== PHRASE) return false;
      // give the handler's 50ms setTimeout time to render the toolbar
      await sleep(250);
      return shadowHostPresent(page, 'glownote-selection-toolbar');
    }, { timeout: 10000, interval: 400, label: 'selection toolbar' });
    assert(await shadowHostPresent(page, 'glownote-selection-toolbar'), 'selection toolbar appeared after selecting text');

    // ── deterministic composedPath-race regression (the actual L5.6 bug) ──
    // Reproduce the exact re-entrancy: with the page selection still live,
    // dispatch a mouseup whose target is INSIDE the toolbar shadow. The real
    // content-script document handler must recognize (via composedPath) that the
    // event came from our own UI and NOT re-show the toolbar over the (soon-to-
    // open) popover. Count re-shows with a MutationObserver so this catches a
    // regression in the index.ts wiring regardless of async selection-clear timing.
    log('re-entrant mouseup INSIDE the toolbar while selection is live must not re-show it');
    const reShows = await page.evaluate(async () => {
      const host = document.querySelector('glownote-selection-toolbar');
      const btn = host.shadowRoot.querySelector('.color-btn');
      let added = 0;
      const obs = new MutationObserver((muts) => {
        for (const m of muts) for (const n of m.addedNodes) {
          if (n.nodeType === 1 && n.tagName.toLowerCase() === 'glownote-selection-toolbar') added++;
        }
      });
      obs.observe(document.body, { childList: true });
      // selection is still live from the previous step; fire a mouseup from inside the toolbar
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
      await new Promise((r) => setTimeout(r, 150)); // > the handler's 50ms timer
      obs.disconnect();
      return added;
    });
    assert(reShows === 0, `toolbar was NOT re-created by a re-entrant in-UI mouseup (re-shows=${reShows})`);

    // ── color click → highlight + popover; toolbar must NOT re-show ──
    log('trusted click on the first color button (yellow)');
    const btnPt = await shadowElementCenter(page, 'glownote-selection-toolbar', '.color-btn');
    assert(btnPt && btnPt.x > 0 && btnPt.y > 0, `color button is on-screen at (${Math.round(btnPt?.x)}, ${Math.round(btnPt?.y)})`);
    await page.mouse.click(btnPt.x, btnPt.y);

    log('wait for the note popover to open');
    await poll(() => shadowHostPresent(page, 'glownote-popover'), { timeout: 5000, label: 'note popover' });
    assert(await shadowHostPresent(page, 'glownote-popover'), 'note popover opened after the color click');

    // The L5.6 race: settle briefly, then the toolbar must be gone (not re-shown over the popover).
    await sleep(400);
    assert(!(await shadowHostPresent(page, 'glownote-selection-toolbar')),
      'selection toolbar did NOT re-show over the popover (composedPath race fixed in-browser)');

    // ── type note → save on blur ──
    log('focus the popover textarea, type a note, blur to save');
    const taPt = await shadowElementCenter(page, 'glownote-popover', 'textarea');
    assert(!!taPt, 'popover textarea is present');
    await page.mouse.click(taPt.x, taPt.y);
    await page.keyboard.type(NOTE, { delay: 8 });
    await page.evaluate(() => {
      const ta = document.querySelector('glownote-popover').shadowRoot.querySelector('textarea');
      ta.blur(); // → handleBlur → onSaveNote
    });

    // Wait for the note to persist in the page-origin IndexedDB (GlowNoteDB).
    log('wait for the annotation (with note) to persist in IndexedDB');
    const persisted = await poll(async () => {
      const anns = await readAnnotations(page);
      const hit = anns.find((a) => a.selectedText === PHRASE && a.note === NOTE);
      return hit ? anns : null;
    }, { timeout: 5000, label: 'persisted annotation with note' });
    assert(persisted.length === 1, `exactly one annotation persisted (got ${persisted.length})`);
    assert(persisted[0].colorId === 'yellow', 'persisted annotation colorId is yellow');
    assert(persisted[0].note === NOTE, 'persisted annotation carries the saved note');

    // ── export markdown → assert content ──
    log("press 'e' to export markdown to the clipboard");
    await page.keyboard.press('e');
    const md = await poll(async () => {
      const text = await page.evaluate(async () => {
        try { return await navigator.clipboard.readText(); } catch { return ''; }
      });
      return text && text.includes('highlight-yellow') ? text : null;
    }, { timeout: 5000, label: 'exported markdown on clipboard' });

    assert(md.includes(`source_url: "${fixtureUrl}"`), 'exported markdown has the source_url front matter');
    assert(md.includes('highlight_count: 1'), 'exported markdown reports highlight_count: 1');
    assert(md.includes('[!highlight-yellow]'), 'exported markdown has the yellow highlight callout');
    assert(md.includes(`"${PHRASE}"`), 'exported markdown quotes the highlighted phrase');
    assert(md.includes(`**Note:** ${NOTE}`), 'exported markdown includes the saved note');

    console.log('\n[e2e] GOLDEN PATH PASSED — select → toolbar → color → popover → save → export ✓\n');
  });
}

/** Read all GlowNote annotations from the page-origin IndexedDB. */
async function readAnnotations(page) {
  return page.evaluate(() =>
    new Promise((resolve) => {
      const req = indexedDB.open('GlowNoteDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('annotations')) { resolve([]); return; }
        const tx = db.transaction('annotations', 'readonly');
        const all = tx.objectStore('annotations').getAll();
        all.onsuccess = () => resolve(all.result || []);
        all.onerror = () => resolve([]);
      };
      req.onerror = () => resolve([]);
    })
  );
}

run().then(
  () => process.exit(0),
  (err) => { console.error('\n[e2e] FAILED:', err.message, '\n'); process.exit(1); }
);
