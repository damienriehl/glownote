import { describe, it, expect, beforeEach } from 'vitest';
import { snapToWordStart, snapToWordEnd, snapRangeToWordBoundaries } from '../../src/lib/highlight/word-snap';

describe('word-snap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('snapToWordStart', () => {
    it('should snap mid-word to start of word', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 8 = "wor|ld" → should snap to 6 ("world" starts at 6)
      const result = snapToWordStart(text, 8);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(6);
    });

    it('should be a no-op when already at word boundary', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 6 = start of "world"
      const result = snapToWordStart(text, 6);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(6);
    });

    it('should not snap when on whitespace', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 5 = space between words
      const result = snapToWordStart(text, 5);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(5);
    });

    it('should cross span boundaries for split words', () => {
      // PDF text layers often split words: <span>hel</span><span>lo world</span>
      document.body.innerHTML = '<p><span>hel</span><span>lo world</span></p>';
      const secondSpan = document.querySelectorAll('span')[1];
      const text = secondSpan.firstChild!;
      // offset 1 in "lo world" → "l|o" but word continues in prev span
      const result = snapToWordStart(text, 1);
      // Should snap back into first span's text node at offset 0
      const firstSpanText = document.querySelector('span')!.firstChild!;
      expect(result.node).toBe(firstSpanText);
      expect(result.offset).toBe(0);
    });

    it('should handle unicode accented characters', () => {
      document.body.innerHTML = '<p>café latte</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 2 = "ca|fé" → should snap to 0
      const result = snapToWordStart(text, 2);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(0);
    });

    it('should stop at punctuation', () => {
      document.body.innerHTML = '<p>hello-world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 8 = "wor|ld" → should snap to 6 (hyphen is not a word char)
      const result = snapToWordStart(text, 8);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(6);
    });

    it('should return unchanged for non-text nodes', () => {
      document.body.innerHTML = '<p><img /></p>';
      const img = document.querySelector('img')!;
      const result = snapToWordStart(img, 0);
      expect(result.node).toBe(img);
      expect(result.offset).toBe(0);
    });
  });

  describe('snapToWordEnd', () => {
    it('should snap mid-word to end of word', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 2 = "he|llo" → should snap to 5
      const result = snapToWordEnd(text, 2);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(5);
    });

    it('should be a no-op when already at word boundary', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 5 = end of "hello"
      const result = snapToWordEnd(text, 5);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(5);
    });

    it('should cross span boundaries for split words', () => {
      document.body.innerHTML = '<p><span>hel</span><span>lo world</span></p>';
      const firstSpan = document.querySelector('span')!;
      const text = firstSpan.firstChild!;
      // offset 2 in "hel" → word continues into next span
      const result = snapToWordEnd(text, 2);
      const secondSpanText = document.querySelectorAll('span')[1].firstChild!;
      // Should snap to offset 2 in "lo world" (end of "lo")
      expect(result.node).toBe(secondSpanText);
      expect(result.offset).toBe(2);
    });

    it('should stop at punctuation', () => {
      document.body.innerHTML = '<p>hello-world</p>';
      const text = document.querySelector('p')!.firstChild!;
      // offset 2 = "he|llo-world" → should snap to 5 (stops at hyphen)
      const result = snapToWordEnd(text, 2);
      expect(result.node).toBe(text);
      expect(result.offset).toBe(5);
    });

    it('should return unchanged for non-text nodes', () => {
      document.body.innerHTML = '<p><img /></p>';
      const img = document.querySelector('img')!;
      const result = snapToWordEnd(img, 0);
      expect(result.node).toBe(img);
      expect(result.offset).toBe(0);
    });
  });

  describe('snapRangeToWordBoundaries', () => {
    it('should expand a mid-word range to full words', () => {
      document.body.innerHTML = '<p>hello beautiful world</p>';
      const text = document.querySelector('p')!.firstChild!;
      const range = document.createRange();
      // Select "llo beautifu" (mid-word on both ends)
      range.setStart(text, 2);
      range.setEnd(text, 20);

      const snapped = snapRangeToWordBoundaries(range);
      expect(snapped.toString()).toBe('hello beautiful world');
    });

    it('should not change an already word-aligned range', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const text = document.querySelector('p')!.firstChild!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 5);

      const snapped = snapRangeToWordBoundaries(range);
      expect(snapped.toString()).toBe('hello');
    });

    it('should return original range if snapped result is whitespace-only', () => {
      document.body.innerHTML = '<p>hello   </p>';
      const text = document.querySelector('p')!.firstChild!;
      const range = document.createRange();
      // Select trailing spaces (no following word to snap into)
      range.setStart(text, 5);
      range.setEnd(text, 8);

      const snapped = snapRangeToWordBoundaries(range);
      // Should return original since snapped is still just whitespace
      expect(snapped).toBe(range);
    });

    it('should handle cross-span word expansion', () => {
      document.body.innerHTML = '<p><span>hel</span><span>lo wor</span><span>ld</span></p>';
      const spans = document.querySelectorAll('span');
      const firstText = spans[0].firstChild!;
      const middleText = spans[1].firstChild!;
      const range = document.createRange();
      // Select "l" in first span to "wo" in middle span
      range.setStart(firstText, 2);
      range.setEnd(middleText, 4);

      const snapped = snapRangeToWordBoundaries(range);
      expect(snapped.toString()).toBe('hello world');
    });
  });
});
