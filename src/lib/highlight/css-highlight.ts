import { COLOR_IDS, type ColorId } from '../colors';
import { ErrorCode, GlowNoteError } from '../errors';

/** Map of annotation ID → { range, colorId } for tracking active highlights */
const activeHighlights = new Map<string, { range: Range; colorId: ColorId }>();

/** Ensure CSS Custom Highlight API is available */
export function isHighlightApiSupported(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS;
}

/** Initialize one Highlight per color in the CSS.highlights registry */
export function initHighlightRegistry(): void {
  if (!isHighlightApiSupported()) {
    throw new GlowNoteError(ErrorCode.HIGHLIGHT_API_UNSUPPORTED, 'CSS Custom Highlight API is not supported in this browser');
  }

  for (const colorId of COLOR_IDS) {
    const name = `glownote-${colorId}`;
    if (!CSS.highlights.has(name)) {
      CSS.highlights.set(name, new Highlight());
    }
  }
}

/** Add a highlight for an annotation */
export function addHighlight(annotationId: string, range: Range, colorId: ColorId): void {
  // Remove existing if re-adding
  removeHighlight(annotationId);

  const highlight = CSS.highlights.get(`glownote-${colorId}`);
  if (highlight) {
    highlight.add(range);
    activeHighlights.set(annotationId, { range, colorId });
  }
}

/** Remove a highlight by annotation ID */
export function removeHighlight(annotationId: string): void {
  const entry = activeHighlights.get(annotationId);
  if (!entry) return;

  const highlight = CSS.highlights.get(`glownote-${entry.colorId}`);
  if (highlight) {
    highlight.delete(entry.range);
  }
  activeHighlights.delete(annotationId);
}

/** Change the color of an existing highlight */
export function changeHighlightColor(annotationId: string, newColorId: ColorId): void {
  const entry = activeHighlights.get(annotationId);
  if (!entry) return;

  // Remove from old color's highlight set
  const oldHighlight = CSS.highlights.get(`glownote-${entry.colorId}`);
  if (oldHighlight) {
    oldHighlight.delete(entry.range);
  }

  // Add to new color's highlight set
  const newHighlight = CSS.highlights.get(`glownote-${newColorId}`);
  if (newHighlight) {
    newHighlight.add(entry.range);
  }

  activeHighlights.set(annotationId, { range: entry.range, colorId: newColorId });
}

/** Clear all highlights */
export function clearAllHighlights(): void {
  for (const colorId of COLOR_IDS) {
    const highlight = CSS.highlights.get(`glownote-${colorId}`);
    if (highlight) {
      highlight.clear();
    }
  }
  activeHighlights.clear();
}

/** Get the Range for an annotation (for scrolling, positioning) */
export function getHighlightRange(annotationId: string): Range | null {
  return activeHighlights.get(annotationId)?.range ?? null;
}

/** Get all active highlight entries */
export function getActiveHighlights(): Map<string, { range: Range; colorId: ColorId }> {
  return activeHighlights;
}

/** Find which annotation was clicked by hit-testing against active ranges */
export function hitTestHighlight(x: number, y: number): string | null {
  for (const [id, { range }] of activeHighlights) {
    const rects = range.getClientRects();
    for (const rect of rects) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return id;
      }
    }
  }
  return null;
}

/** Hit-test returning annotationId + colorId */
export function hitTestHighlightWithColor(x: number, y: number): { annotationId: string; colorId: ColorId } | null {
  for (const [id, { range, colorId }] of activeHighlights) {
    const rects = range.getClientRects();
    for (const rect of rects) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return { annotationId: id, colorId };
      }
    }
  }
  return null;
}

/** Check if inner range is fully contained within outer range.
 *  Uses compareBoundaryPoints first; falls back to rect-based check
 *  for cases like PDF text layers where absolutely-positioned spans
 *  can cause boundary comparisons to be unreliable. */
function rangeContainedIn(inner: Range, outer: Range): boolean {
  try {
    const startOk = outer.compareBoundaryPoints(Range.START_TO_START, inner) <= 0;
    const endOk = outer.compareBoundaryPoints(Range.END_TO_END, inner) >= 0;
    if (startOk && endOk) return true;
  } catch {
    // compareBoundaryPoints can throw for detached or cross-document ranges
  }

  // Fallback: check that inner text is a substring of outer text
  // AND inner rects are geometrically within outer rects
  const innerText = inner.toString();
  const outerText = outer.toString();
  if (!innerText || !outerText.includes(innerText)) return false;

  return rectsContainedIn(inner.getClientRects(), outer.getClientRects());
}

/** Check if all inner rects are geometrically covered by the outer rects */
function rectsContainedIn(innerRects: DOMRectList, outerRects: DOMRectList): boolean {
  if (innerRects.length === 0 || outerRects.length === 0) return false;

  // Build a bounding box for outer rects
  let oLeft = Infinity, oTop = Infinity, oRight = -Infinity, oBottom = -Infinity;
  for (const r of outerRects) {
    oLeft = Math.min(oLeft, r.left);
    oTop = Math.min(oTop, r.top);
    oRight = Math.max(oRight, r.right);
    oBottom = Math.max(oBottom, r.bottom);
  }

  // Every inner rect must be within the outer bounding box (with 2px tolerance)
  const TOL = 2;
  for (const r of innerRects) {
    if (r.left < oLeft - TOL || r.top < oTop - TOL ||
        r.right > oRight + TOL || r.bottom > oBottom + TOL) {
      return false;
    }
  }
  return true;
}

/** Find highlights that fully contain the given range */
export function findContainingHighlights(range: Range): Array<{ annotationId: string; colorId: ColorId; range: Range }> {
  const results: Array<{ annotationId: string; colorId: ColorId; range: Range }> = [];
  for (const [id, entry] of activeHighlights) {
    if (rangeContainedIn(range, entry.range)) {
      results.push({ annotationId: id, colorId: entry.colorId, range: entry.range });
    }
  }
  return results;
}
