import { describe, it, expect, beforeEach } from 'vitest';

// We need to test anchoring logic with real DOM
describe('anchoring', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>This is a test paragraph with some sample text for highlighting.</p>';
  });

  it('should convert a Range to TextQuoteSelector', async () => {
    const { rangeToQuoteSelector } = await import('../../src/lib/highlight/anchoring');

    const p = document.querySelector('p')!;
    const textNode = p.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 10);
    range.setEnd(textNode, 24);

    const selector = rangeToQuoteSelector(range);
    expect(selector.type).toBe('TextQuoteSelector');
    expect(selector.exact).toBe('test paragraph');
    expect(selector.prefix).toBeTruthy();
    expect(selector.suffix).toBeTruthy();
  });

  it('should convert a Range to TextPositionSelector', async () => {
    const { rangeToPositionSelector } = await import('../../src/lib/highlight/anchoring');

    const p = document.querySelector('p')!;
    const textNode = p.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 10);
    range.setEnd(textNode, 24);

    const selector = rangeToPositionSelector(range);
    expect(selector.type).toBe('TextPositionSelector');
    expect(selector.start).toBe(10);
    expect(selector.end).toBe(24);
  });

  it('should resolve TextPositionSelector back to Range', async () => {
    const { positionSelectorToRange } = await import('../../src/lib/highlight/anchoring');

    const range = positionSelectorToRange({
      type: 'TextPositionSelector',
      start: 10,
      end: 24,
    });

    expect(range).not.toBeNull();
    expect(range!.toString()).toBe('test paragraph');
  });

  it('should resolve TextQuoteSelector back to Range', async () => {
    const { quoteSelectorToRange } = await import('../../src/lib/highlight/anchoring');

    const range = quoteSelectorToRange({
      type: 'TextQuoteSelector',
      exact: 'test paragraph',
      prefix: 'is a ',
      suffix: ' with',
    });

    expect(range).not.toBeNull();
    expect(range!.toString()).toBe('test paragraph');
  });

  it('should handle resolveSelectors with position first', async () => {
    const { resolveSelectors } = await import('../../src/lib/highlight/anchoring');

    const range = resolveSelectors(
      { type: 'TextQuoteSelector', exact: 'test paragraph', prefix: 'is a ', suffix: ' with' },
      { type: 'TextPositionSelector', start: 10, end: 24 }
    );

    expect(range).not.toBeNull();
    expect(range!.toString()).toBe('test paragraph');
  });

  it('should fall back to quote when position gives wrong text', async () => {
    const { resolveSelectors } = await import('../../src/lib/highlight/anchoring');

    // Wrong position, but correct quote
    const range = resolveSelectors(
      { type: 'TextQuoteSelector', exact: 'sample text', prefix: 'some ', suffix: ' for' },
      { type: 'TextPositionSelector', start: 999, end: 1010 }
    );

    expect(range).not.toBeNull();
    expect(range!.toString()).toBe('sample text');
  });
});
