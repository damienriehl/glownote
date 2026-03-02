import { GlowNoteError, ErrorCode } from '../errors';
import { snapRangeToWordBoundaries } from './word-snap';

/** Capture the current user selection as an array of Ranges */
export function captureSelection(): Range[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    throw new GlowNoteError(ErrorCode.SELECTION_EMPTY, 'No text selected');
  }

  // Check if selection is inside an iframe
  if (selection.anchorNode?.ownerDocument !== document) {
    throw new GlowNoteError(ErrorCode.SELECTION_IN_IFRAME, 'Selection inside iframes is not supported');
  }

  const ranges: Range[] = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const text = range.toString().trim();
    if (text.length > 0) {
      ranges.push(snapRangeToWordBoundaries(range.cloneRange()));
    }
  }

  if (ranges.length === 0) {
    throw new GlowNoteError(ErrorCode.SELECTION_EMPTY, 'Selection contains only whitespace');
  }

  return ranges;
}

/** Get the selected text from the current selection */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString().trim() ?? '';
}

/** Clear the current selection */
export function clearSelection(): void {
  window.getSelection()?.removeAllRanges();
}
