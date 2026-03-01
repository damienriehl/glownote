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
