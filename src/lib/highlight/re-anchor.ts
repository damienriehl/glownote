import type { Annotation } from '../types';
import { getAnnotationsForPage } from '../storage/db';
import { resolveSelectors } from './anchoring';
import { addHighlight, clearAllHighlights } from './css-highlight';

/** Orphaned annotations that couldn't be re-anchored */
let orphanedAnnotations: Annotation[] = [];

/** Re-render all annotations for the current page */
export async function reanchorPage(): Promise<{ anchored: number; orphaned: number }> {
  const url = window.location.href;
  const annotations = await getAnnotationsForPage(url);

  clearAllHighlights();
  orphanedAnnotations = [];

  let anchoredCount = 0;
  for (const annotation of annotations) {
    const range = resolveSelectors(
      annotation.selectors.quote,
      annotation.selectors.position
    );
    if (range) {
      addHighlight(annotation.id, range, annotation.colorId);
      anchoredCount++;
    } else {
      orphanedAnnotations.push(annotation);
    }
  }

  return { anchored: anchoredCount, orphaned: orphanedAnnotations.length };
}

/** Get orphaned annotations from the last re-anchor */
export function getOrphanedAnnotations(): Annotation[] {
  return orphanedAnnotations;
}

/** Set up MutationObserver to re-anchor on significant DOM changes */
export function observeDomChanges(): MutationObserver {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingMutations = 0;

  const observer = new MutationObserver((mutations) => {
    // Count significant mutations (node additions/removals)
    for (const mutation of mutations) {
      pendingMutations += mutation.addedNodes.length + mutation.removedNodes.length;
    }

    // Only re-anchor on significant changes (>3 nodes)
    if (pendingMutations > 3) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        pendingMutations = 0;
        reanchorPage();
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/** Poll location.href for SPA navigation */
export function watchSpaNavigation(callback: () => void): () => void {
  let lastUrl = location.href;
  const interval = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback();
    }
  }, 1000);

  return () => clearInterval(interval);
}
