import type { TextQuoteSelector, TextPositionSelector } from '../types';

const CONTEXT_LENGTH = 32;

/** Get the full text content of the document body */
function getBodyText(): string {
  return document.body.textContent ?? '';
}

/** Convert a Range to a TextQuoteSelector */
export function rangeToQuoteSelector(range: Range): TextQuoteSelector {
  const exact = range.toString();
  const bodyText = getBodyText();

  // Find the text position to extract prefix/suffix
  const rangePos = rangeToPositionSelector(range);
  const prefix = bodyText.slice(Math.max(0, rangePos.start - CONTEXT_LENGTH), rangePos.start);
  const suffix = bodyText.slice(rangePos.end, rangePos.end + CONTEXT_LENGTH);

  return { type: 'TextQuoteSelector', exact, prefix, suffix };
}

/** Convert a Range to a TextPositionSelector */
export function rangeToPositionSelector(range: Range): TextPositionSelector {
  const bodyText = getBodyText();
  const preRange = document.createRange();
  preRange.setStart(document.body, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  const end = start + range.toString().length;

  return { type: 'TextPositionSelector', start, end };
}

/** Try to resolve a TextPositionSelector back to a Range */
export function positionSelectorToRange(selector: TextPositionSelector): Range | null {
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let charIndex = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const nodeLength = node.textContent?.length ?? 0;
      if (!startNode && charIndex + nodeLength > selector.start) {
        startNode = node;
        startOffset = selector.start - charIndex;
      }
      if (charIndex + nodeLength >= selector.end) {
        endNode = node;
        endOffset = selector.end - charIndex;
        break;
      }
      charIndex += nodeLength;
    }

    if (!startNode || !endNode) return null;

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch {
    return null;
  }
}

/** Try to resolve a TextQuoteSelector back to a Range using fuzzy text search */
export function quoteSelectorToRange(selector: TextQuoteSelector): Range | null {
  const bodyText = getBodyText();
  const searchText = selector.exact;

  // Find all occurrences
  const occurrences: number[] = [];
  let idx = bodyText.indexOf(searchText);
  while (idx !== -1) {
    occurrences.push(idx);
    idx = bodyText.indexOf(searchText, idx + 1);
  }

  if (occurrences.length === 0) {
    // Try fuzzy match — search for a substring
    return fuzzyFindRange(bodyText, searchText);
  }

  // If only one occurrence, use it
  if (occurrences.length === 1) {
    return textPositionToRange(occurrences[0], occurrences[0] + searchText.length);
  }

  // Multiple occurrences — use prefix/suffix to disambiguate
  let bestIdx = occurrences[0];
  let bestScore = -1;
  for (const occ of occurrences) {
    let score = 0;
    if (selector.prefix) {
      const before = bodyText.slice(Math.max(0, occ - selector.prefix.length), occ);
      if (before.endsWith(selector.prefix)) score += 2;
      else if (before.includes(selector.prefix.slice(-8))) score += 1;
    }
    if (selector.suffix) {
      const after = bodyText.slice(occ + searchText.length, occ + searchText.length + selector.suffix.length);
      if (after.startsWith(selector.suffix)) score += 2;
      else if (after.includes(selector.suffix.slice(0, 8))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = occ;
    }
  }

  return textPositionToRange(bestIdx, bestIdx + searchText.length);
}

/** Convert character start/end positions to a Range */
function textPositionToRange(start: number, end: number): Range | null {
  return positionSelectorToRange({ type: 'TextPositionSelector', start, end });
}

/** Fuzzy text matching fallback — find partial match */
function fuzzyFindRange(bodyText: string, searchText: string): Range | null {
  // Try progressively shorter prefixes of the search text
  for (let len = searchText.length; len >= Math.min(20, searchText.length); len--) {
    const partial = searchText.slice(0, len);
    const idx = bodyText.indexOf(partial);
    if (idx !== -1) {
      return textPositionToRange(idx, idx + partial.length);
    }
  }
  return null;
}

/** Re-anchor a selector pair, trying position first, then quote */
export function resolveSelectors(
  quote: TextQuoteSelector,
  position: TextPositionSelector
): Range | null {
  // Try position selector first (fast path)
  const posRange = positionSelectorToRange(position);
  if (posRange) {
    // Verify it matches the quote
    const posText = posRange.toString();
    if (posText === quote.exact) {
      return posRange;
    }
  }

  // Fall back to quote selector (fuzzy)
  return quoteSelectorToRange(quote);
}
