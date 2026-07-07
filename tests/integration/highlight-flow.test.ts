/**
 * Integration test — the core GlowNote user flow at the logic layer:
 *   select text -> highlight -> add note -> re-anchor -> export markdown
 *
 * Exercises the REAL modules (css-highlight, anchoring, storage/db, export)
 * wired together the same way the content script wires them. The CSS Custom
 * Highlight API and chrome.* are mocked in tests/setup.ts; storage uses
 * fake-indexeddb. This is the E2E proof that highlight -> note ->
 * export-markdown produces correct output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initHighlightRegistry,
  addHighlight,
  getHighlightRange,
  findContainingHighlights,
  removeHighlight,
} from '../../src/lib/highlight/css-highlight';
import {
  rangeToQuoteSelector,
  rangeToPositionSelector,
  resolveSelectors,
} from '../../src/lib/highlight/anchoring';
import {
  saveAnnotation,
  getAnnotationsForPage,
  updateAnnotationNote,
  deleteAnnotation,
  db,
} from '../../src/lib/storage/db';
import { exportPageMarkdown } from '../../src/lib/export/markdown';
import type { Annotation } from '../../src/lib/types';
import type { ColorId } from '../../src/lib/colors';

const PAGE_URL = 'https://example.com/trial-guide';
const PAGE_TITLE = 'Trial Practice Guide';

/** Build a range spanning `text` inside the first text node of #para */
function selectPhrase(text: string): Range {
  const para = document.getElementById('para')!;
  const tn = para.firstChild as Text;
  const start = tn.data.indexOf(text);
  if (start < 0) throw new Error(`phrase not found: ${text}`);
  const range = document.createRange();
  range.setStart(tn, start);
  range.setEnd(tn, start + text.length);
  return range;
}

/** Replicate the content script's highlightSelection() logic */
async function highlight(range: Range, colorId: ColorId): Promise<Annotation> {
  const annotation: Annotation = {
    id: crypto.randomUUID(),
    pageUrl: PAGE_URL,
    pageTitle: PAGE_TITLE,
    selectedText: range.toString(),
    note: null,
    colorId,
    selectors: {
      quote: rangeToQuoteSelector(range),
      position: rangeToPositionSelector(range),
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  addHighlight(annotation.id, range, colorId);
  await saveAnnotation(annotation);
  return annotation;
}

beforeEach(async () => {
  await db.annotations.clear();
  // @ts-expect-error mock highlight registry reset
  CSS.highlights.clear();
  document.body.innerHTML =
    '<p id="para">The voir dire process lets attorneys question prospective jurors. ' +
    'An opening statement previews the evidence for the jury.</p>';
  initHighlightRegistry();
});

describe('highlight -> note -> export flow', () => {
  it('creates a highlight, renders it, and persists it', async () => {
    const ann = await highlight(selectPhrase('voir dire process'), 'yellow');

    // Highlight range tracked in the registry
    expect(getHighlightRange(ann.id)?.toString()).toBe('voir dire process');

    // Persisted and retrievable for the page
    const saved = await getAnnotationsForPage(PAGE_URL);
    expect(saved).toHaveLength(1);
    expect(saved[0].selectedText).toBe('voir dire process');
    expect(saved[0].colorId).toBe('yellow');
    expect(saved[0].selectors.position.end).toBeGreaterThan(saved[0].selectors.position.start);
  });

  it('attaches a note and exports it in the markdown', async () => {
    const ann = await highlight(selectPhrase('opening statement'), 'green');
    await updateAnnotationNote(ann.id, 'Set the theme of the case here.');

    const anns = await getAnnotationsForPage(PAGE_URL);
    const md = exportPageMarkdown(anns, PAGE_TITLE, PAGE_URL);

    expect(md).toContain('source_url: "https://example.com/trial-guide"');
    expect(md).toContain('highlight_count: 1');
    expect(md).toContain('[!highlight-green]');
    expect(md).toContain('"opening statement"');
    expect(md).toContain('**Note:** Set the theme of the case here.');
  });

  it('exports multiple highlights sorted by document position', async () => {
    // Highlight the SECOND phrase first, then the first — export must reorder
    await highlight(selectPhrase('opening statement'), 'blue');
    await highlight(selectPhrase('voir dire process'), 'yellow');

    const anns = await getAnnotationsForPage(PAGE_URL);
    const md = exportPageMarkdown(anns, PAGE_TITLE, PAGE_URL);

    expect(md).toContain('highlight_count: 2');
    // "voir dire" appears earlier in the document, so it must appear first in export
    expect(md.indexOf('voir dire process')).toBeLessThan(md.indexOf('opening statement'));
  });

  it('re-anchors a saved selector back to the same text', async () => {
    const ann = await highlight(selectPhrase('prospective jurors'), 'pink');
    const [saved] = await getAnnotationsForPage(PAGE_URL);
    const range = resolveSelectors(saved.selectors.quote, saved.selectors.position);
    expect(range).not.toBeNull();
    expect(range!.toString()).toBe('prospective jurors');
  });

  it('detects a sub-selection already inside an existing highlight (dedupe path)', async () => {
    await highlight(selectPhrase('voir dire process'), 'yellow');
    // A narrower selection inside the highlighted phrase
    const inner = selectPhrase('dire');
    const containing = findContainingHighlights(inner);
    expect(containing.length).toBe(1);
    expect(containing[0].colorId).toBe('yellow');
  });

  it('removing a highlight deletes it from render + storage and export reflects it', async () => {
    const ann = await highlight(selectPhrase('voir dire process'), 'yellow');
    removeHighlight(ann.id);
    await deleteAnnotation(ann.id);

    expect(getHighlightRange(ann.id)).toBeNull();
    const anns = await getAnnotationsForPage(PAGE_URL);
    expect(anns).toHaveLength(0);
    const md = exportPageMarkdown(anns, PAGE_TITLE, PAGE_URL);
    expect(md).toContain('No highlights on this page.');
  });
});
