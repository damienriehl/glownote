/**
 * Word-boundary snapping for highlight selections.
 * Expands selections to full word boundaries (matching browser double-click behavior).
 */

/** Unicode-aware word character: letters, combining marks, numbers */
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;

/** Walk backward to find the previous text node (crosses element boundaries) */
function previousTextNode(node: Node): Text | null {
  let current: Node | null = node;

  // Try previous siblings first, then walk up
  while (current) {
    if (current.previousSibling) {
      current = current.previousSibling;
      // Descend to rightmost text node
      while (current.lastChild) {
        current = current.lastChild;
      }
      if (current.nodeType === Node.TEXT_NODE) return current as Text;
      continue;
    }
    // Walk up to parent
    current = current.parentNode;
    if (!current || current === document.body) return null;
  }

  return null;
}

/** Walk forward to find the next text node (crosses element boundaries) */
function nextTextNode(node: Node): Text | null {
  let current: Node | null = node;

  while (current) {
    if (current.nextSibling) {
      current = current.nextSibling;
      // Descend to leftmost text node
      while (current.firstChild) {
        current = current.firstChild;
      }
      if (current.nodeType === Node.TEXT_NODE) return current as Text;
      continue;
    }
    current = current.parentNode;
    if (!current || current === document.body) return null;
  }

  return null;
}

/** Snap a position to the start of the word containing it */
export function snapToWordStart(node: Node, offset: number): { node: Node; offset: number } {
  if (node.nodeType !== Node.TEXT_NODE) return { node, offset };

  const text = node.textContent ?? '';

  // Only snap if char at offset is a word char (we're inside a word),
  // OR if we're at end-of-node and previous char is a word char (cross-span entry)
  const atWordChar = offset < text.length && WORD_CHAR.test(text[offset]);
  const crossSpanEntry = offset === text.length && offset > 0 && WORD_CHAR.test(text[offset - 1]);

  if (!atWordChar && !crossSpanEntry) {
    return { node, offset };
  }

  let pos = offset;

  // Walk backward through text while chars are word chars
  while (pos > 0 && WORD_CHAR.test(text[pos - 1])) {
    pos--;
  }

  // If we reached the start and the first char is a word char, try crossing into previous text node
  if (pos === 0 && text.length > 0 && WORD_CHAR.test(text[0])) {
    const prev = previousTextNode(node);
    if (prev) {
      const prevText = prev.textContent ?? '';
      if (prevText.length > 0 && WORD_CHAR.test(prevText[prevText.length - 1])) {
        return snapToWordStart(prev, prevText.length);
      }
    }
  }

  return { node, offset: pos };
}

/** Snap a position to the end of the word containing it */
export function snapToWordEnd(node: Node, offset: number): { node: Node; offset: number } {
  if (node.nodeType !== Node.TEXT_NODE) return { node, offset };

  const text = node.textContent ?? '';
  let pos = offset;

  // Walk forward through text while chars are word chars
  while (pos < text.length && WORD_CHAR.test(text[pos])) {
    pos++;
  }

  // If we reached the end and the last char is a word char, try crossing into next text node
  if (pos === text.length && text.length > 0 && WORD_CHAR.test(text[text.length - 1])) {
    const next = nextTextNode(node);
    if (next) {
      const nextText = next.textContent ?? '';
      if (nextText.length > 0 && WORD_CHAR.test(nextText[0])) {
        return snapToWordEnd(next, 0);
      }
    }
  }

  return { node, offset: pos };
}

/** Expand a Range to full word boundaries. Returns a new Range (doesn't mutate input). */
export function snapRangeToWordBoundaries(range: Range): Range {
  const start = snapToWordStart(range.startContainer, range.startOffset);
  const end = snapToWordEnd(range.endContainer, range.endOffset);

  const snapped = document.createRange();
  snapped.setStart(start.node, start.offset);
  snapped.setEnd(end.node, end.offset);

  // Guard: if snapped range is collapsed or whitespace-only, return original
  if (snapped.collapsed || !snapped.toString().trim()) {
    return range;
  }

  return snapped;
}
