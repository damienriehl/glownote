import { describe, it, expect, beforeEach } from 'vitest';
import { db, saveAnnotation, getAnnotationsForPage, deleteAnnotation, updateAnnotationNote, updateAnnotationColor, normalizeUrl, searchAnnotations } from '../../src/lib/storage/db';
import type { Annotation } from '../../src/lib/types';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: crypto.randomUUID(),
    pageUrl: 'https://example.com/page',
    pageTitle: 'Test Page',
    selectedText: 'test highlight',
    note: null,
    colorId: 'yellow',
    selectors: {
      quote: { type: 'TextQuoteSelector', exact: 'test highlight', prefix: 'before ', suffix: ' after' },
      position: { type: 'TextPositionSelector', start: 10, end: 24 },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('storage/db', () => {
  beforeEach(async () => {
    await db.annotations.clear();
  });

  it('should save and retrieve annotations', async () => {
    const ann = makeAnnotation();
    await saveAnnotation(ann);
    const results = await getAnnotationsForPage('https://example.com/page');
    expect(results).toHaveLength(1);
    expect(results[0].selectedText).toBe('test highlight');
  });

  it('should normalize URLs (strip hash)', async () => {
    expect(normalizeUrl('https://example.com/page#section1')).toBe('https://example.com/page');
    expect(normalizeUrl('https://example.com/page#')).toBe('https://example.com/page');
    expect(normalizeUrl('https://example.com/page')).toBe('https://example.com/page');
  });

  it('should find annotations regardless of hash fragment', async () => {
    await saveAnnotation(makeAnnotation({ pageUrl: 'https://example.com/page#s1' }));
    const results = await getAnnotationsForPage('https://example.com/page#s2');
    expect(results).toHaveLength(1);
  });

  it('should delete annotations', async () => {
    const ann = makeAnnotation();
    await saveAnnotation(ann);
    await deleteAnnotation(ann.id);
    const results = await getAnnotationsForPage('https://example.com/page');
    expect(results).toHaveLength(0);
  });

  it('should update annotation note', async () => {
    const ann = makeAnnotation();
    await saveAnnotation(ann);
    await updateAnnotationNote(ann.id, 'my note');
    const results = await getAnnotationsForPage('https://example.com/page');
    expect(results[0].note).toBe('my note');
  });

  it('should update annotation color', async () => {
    const ann = makeAnnotation();
    await saveAnnotation(ann);
    await updateAnnotationColor(ann.id, 'blue');
    const results = await getAnnotationsForPage('https://example.com/page');
    expect(results[0].colorId).toBe('blue');
  });

  it('should search annotations by text', async () => {
    await saveAnnotation(makeAnnotation({ selectedText: 'quantum computing basics' }));
    await saveAnnotation(makeAnnotation({ selectedText: 'other stuff', note: 'about quantum' }));
    await saveAnnotation(makeAnnotation({ selectedText: 'unrelated' }));

    const results = await searchAnnotations('quantum');
    expect(results).toHaveLength(2);
  });

  it('should sort annotations by createdAt', async () => {
    await saveAnnotation(makeAnnotation({ createdAt: 300 }));
    await saveAnnotation(makeAnnotation({ createdAt: 100 }));
    await saveAnnotation(makeAnnotation({ createdAt: 200 }));

    const results = await getAnnotationsForPage('https://example.com/page');
    expect(results[0].createdAt).toBe(100);
    expect(results[1].createdAt).toBe(200);
    expect(results[2].createdAt).toBe(300);
  });
});
