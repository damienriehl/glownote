import type { Annotation } from '../lib/types';
import type { ColorId } from '../lib/colors';
import { rangeToQuoteSelector, rangeToPositionSelector, resolveSelectors } from '../lib/highlight/anchoring';
import { snapRangeToWordBoundaries } from '../lib/highlight/word-snap';
import { addHighlight, removeHighlight, initHighlightRegistry, findContainingHighlights } from '../lib/highlight/css-highlight';
import { saveAnnotation, getAnnotationsForPage, deleteAnnotation, updateAnnotationSelectors } from '../lib/storage/db';

/** Initialize highlighting for a PDF viewer page */
export function initPdfHighlighting(originalPdfUrl: string) {
  initHighlightRegistry();

  return {
    /** Create a highlight from the current selection */
    async highlightSelection(colorId: ColorId): Promise<Annotation | null> {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
        return null;
      }

      const range = snapRangeToWordBoundaries(selection.getRangeAt(0).cloneRange());
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        pageUrl: originalPdfUrl, // Use the original PDF URL, not the viewer URL
        pageTitle: document.title,
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
      selection.removeAllRanges();
      return annotation;
    },

    /** Re-anchor all annotations for this PDF */
    async reanchor(): Promise<number> {
      const annotations = await getAnnotationsForPage(originalPdfUrl);
      let anchored = 0;

      for (const ann of annotations) {
        const range = resolveSelectors(ann.selectors.quote, ann.selectors.position);
        if (range) {
          addHighlight(ann.id, range, ann.colorId);
          anchored++;
        }
      }

      return anchored;
    },

    /** Remove a highlight */
    async removeHighlightById(id: string): Promise<void> {
      removeHighlight(id);
      await deleteAnnotation(id);
    },

    /** Find highlights that fully contain the given range */
    findContaining(range: Range) {
      return findContainingHighlights(range);
    },

    /** Resize an existing highlight to a new range */
    async resizeHighlight(id: string, newRange: Range, colorId: ColorId): Promise<void> {
      const newText = newRange.toString();
      const newQuote = rangeToQuoteSelector(newRange);
      const newPosition = rangeToPositionSelector(newRange);

      // Update DB
      await updateAnnotationSelectors(id, newText, newQuote, newPosition);

      // Update visual: remove old, add new
      removeHighlight(id);
      addHighlight(id, newRange, colorId);
    },
  };
}
