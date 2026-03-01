import { describe, it, expect } from 'vitest';
import { exportPageMarkdown } from '../../src/lib/export/markdown';
import type { Annotation } from '../../src/lib/types';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'test-id',
    pageUrl: 'https://example.com/article',
    pageTitle: 'Test Article',
    selectedText: 'highlighted text',
    note: null,
    colorId: 'yellow',
    selectors: {
      quote: { type: 'TextQuoteSelector', exact: 'highlighted text', prefix: '', suffix: '' },
      position: { type: 'TextPositionSelector', start: 10, end: 26 },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('markdown export', () => {
  it('should generate YAML front matter', () => {
    const annotations = [makeAnnotation()];
    const md = exportPageMarkdown(annotations, 'Test Article', 'https://example.com/article');

    expect(md).toContain('---');
    expect(md).toContain('source_url: "https://example.com/article"');
    expect(md).toContain('title: "Test Article"');
    expect(md).toContain('highlight_count: 1');
    expect(md).toContain('doc_type: "web_highlight"');
  });

  it('should generate highlight callout blocks', () => {
    const annotations = [makeAnnotation()];
    const md = exportPageMarkdown(annotations, 'Test', 'https://example.com');

    expect(md).toContain('> [!highlight-yellow] Highlight');
    expect(md).toContain('> "highlighted text"');
  });

  it('should include notes when present', () => {
    const annotations = [makeAnnotation({ note: 'This is important' })];
    const md = exportPageMarkdown(annotations, 'Test', 'https://example.com');

    expect(md).toContain('**Note:** This is important');
  });

  it('should sort by document position', () => {
    const annotations = [
      makeAnnotation({ id: '2', selectedText: 'second', selectors: { quote: { type: 'TextQuoteSelector', exact: 'second', prefix: '', suffix: '' }, position: { type: 'TextPositionSelector', start: 50, end: 56 } } }),
      makeAnnotation({ id: '1', selectedText: 'first', selectors: { quote: { type: 'TextQuoteSelector', exact: 'first', prefix: '', suffix: '' }, position: { type: 'TextPositionSelector', start: 10, end: 15 } } }),
    ];
    const md = exportPageMarkdown(annotations, 'Test', 'https://example.com');

    const firstIdx = md.indexOf('"first"');
    const secondIdx = md.indexOf('"second"');
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it('should use custom labels when provided', () => {
    const annotations = [makeAnnotation()];
    const md = exportPageMarkdown(annotations, 'Test', 'https://example.com', { yellow: 'Key Finding' } as any);

    expect(md).toContain('> [!highlight-yellow] Key Finding');
  });

  it('should handle empty annotations', () => {
    const md = exportPageMarkdown([], 'Test', 'https://example.com');

    expect(md).toContain('highlight_count: 0');
    expect(md).toContain('No highlights');
  });

  it('should include location info', () => {
    const annotations = [makeAnnotation()];
    const md = exportPageMarkdown(annotations, 'Test', 'https://example.com');

    expect(md).toContain('*Location: chars 10-26*');
  });
});
