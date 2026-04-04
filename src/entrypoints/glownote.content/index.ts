import { createShadowRootUi, type ContentScriptContext } from 'wxt/client';
import { mount } from 'svelte';
import { initHighlightRegistry, addHighlight, removeHighlight, changeHighlightColor, hitTestHighlight, hitTestHighlightWithColor, getHighlightRange, findContainingHighlights, isHighlightApiSupported } from '../../lib/highlight/css-highlight';
import { captureSelection, clearSelection } from '../../lib/highlight/selection';
import { snapRangeToWordBoundaries } from '../../lib/highlight/word-snap';
import { rangeToQuoteSelector, rangeToPositionSelector } from '../../lib/highlight/anchoring';
import { reanchorPage, observeDomChanges, watchSpaNavigation } from '../../lib/highlight/re-anchor';
import { saveAnnotation, deleteAnnotation, updateAnnotationNote, updateAnnotationColor, updateAnnotationSelectors } from '../../lib/storage/db';
import { getSettings } from '../../lib/storage/settings';
import { sendMessage, onMessage } from '../../lib/messages';
import { parseKeyAction } from '../../lib/keyboard';
import { exportPageMarkdown } from '../../lib/export/markdown';
import { copyToClipboard } from '../../lib/export/clipboard';
import { getAnnotationsForPage } from '../../lib/storage/db';
import type { Annotation, GlowNoteMessage } from '../../lib/types';
import type { ColorId } from '../../lib/colors';
import './style.css';

/** Detect whether the current page is a PDF rendered by Chrome's built-in viewer */
function isPdfPage(): boolean {
  // Chrome sets document.contentType for PDFs
  if (document.contentType === 'application/pdf') return true;
  // Fallback: check for the embed element Chrome uses
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed) return true;
  return false;
}

/** Show a floating banner offering to open the PDF in GlowNote's viewer */
function showPdfBanner() {
  const pdfUrl = window.location.href;

  const banner = document.createElement('div');
  banner.id = 'glownote-pdf-banner';
  banner.style.cssText = `
    position: fixed; top: 12px; right: 12px; z-index: 2147483647;
    background: #1a1a1a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px; padding: 10px 14px; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px;
    max-width: 360px;
  `;
  banner.innerHTML = `
    <span style="flex:1">GlowNote can highlight PDFs &mdash; open in our viewer?</span>
    <button id="glownote-pdf-open"
            style="background:#4a90d9; color:#fff; border:none; padding:5px 12px; border-radius:4px; font-weight:500; white-space:nowrap; cursor:pointer; font-size:13px;">
      Open
    </button>
    <button id="glownote-pdf-dismiss"
            style="background:none; border:none; color:#888; cursor:pointer; font-size:16px; padding:0 2px; line-height:1;">
      &times;
    </button>
  `;

  document.body.appendChild(banner);

  banner.querySelector('#glownote-pdf-open')!.addEventListener('click', () => {
    // Send message to background to open the PDF viewer (avoids chrome-extension:// navigation block)
    chrome.runtime.sendMessage({ type: 'OPEN_PDF_VIEWER', pdfUrl });
    banner.remove();
  });

  banner.querySelector('#glownote-pdf-dismiss')!.addEventListener('click', () => {
    banner.remove();
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => banner.remove(), 15000);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx: ContentScriptContext) {
    // ── PDF Detection ──
    if (isPdfPage()) {
      showPdfBanner();
      return; // Don't run highlighting logic on Chrome's PDF viewer
    }

    if (!isHighlightApiSupported()) {
      console.warn('GlowNote: CSS Custom Highlight API not supported');
      return;
    }

    // Initialize highlight registry
    initHighlightRegistry();

    // Re-anchor existing annotations
    const result = await reanchorPage();
    if (result.anchored > 0) {
      console.log(`GlowNote: Restored ${result.anchored} highlights`);
    }
    if (result.orphaned > 0) {
      console.warn(`GlowNote: ${result.orphaned} highlights could not be re-anchored`);
    }

    // Watch for DOM changes and SPA navigation
    observeDomChanges();
    watchSpaNavigation(() => reanchorPage());

    let activeColorId: ColorId = 'yellow';
    let lastHighlightId: string | null = null;
    let popoverUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let selectionToolbarUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    // Load settings
    const settings = await getSettings();
    activeColorId = settings.activeColorId;

    /** Create and save a highlight from the current selection, or select existing same-color highlight */
    async function highlightSelection(colorId?: ColorId): Promise<Annotation | null> {
      try {
        const ranges = captureSelection();
        const range = ranges[0]; // Use first range
        const color = colorId ?? activeColorId;

        // Check if selection is within an existing same-color highlight
        const containing = findContainingHighlights(range);
        const sameColor = containing.find(h => h.colorId === color);
        if (sameColor) {
          // Select the existing highlight for editing instead of creating a duplicate
          selectHighlightForEditing(sameColor.annotationId, sameColor.range);
          return null;
        }

        const annotation: Annotation = {
          id: crypto.randomUUID(),
          pageUrl: window.location.href,
          pageTitle: document.title,
          selectedText: range.toString(),
          note: null,
          colorId: color,
          selectors: {
            quote: rangeToQuoteSelector(range),
            position: rangeToPositionSelector(range),
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Render highlight
        addHighlight(annotation.id, range, color);

        // Save to IndexedDB
        await saveAnnotation(annotation);

        // Notify side panel
        sendMessage({ type: 'ANNOTATIONS_UPDATED' }).catch(() => {});

        clearSelection();
        lastHighlightId = annotation.id;
        return annotation;
      } catch (e) {
        console.warn('GlowNote:', (e as Error).message);
        return null;
      }
    }

    /** Programmatically select a highlight's full range and show edit popover */
    function selectHighlightForEditing(annotationId: string, range: Range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      lastHighlightId = annotationId;
      showPopover(annotationId, true);
    }

    /** Show popover for a highlight */
    async function showPopover(annotationId: string, editMode = false) {
      const range = getHighlightRange(annotationId);
      if (!range) return;

      // Remove existing popover
      if (popoverUi) {
        popoverUi.remove();
        popoverUi = null;
      }

      const annotations = await getAnnotationsForPage(window.location.href);
      const annotation = annotations.find(a => a.id === annotationId);
      if (!annotation) return;

      const rect = range.getBoundingClientRect();

      popoverUi = await createShadowRootUi(ctx, {
        name: 'glownote-popover',
        position: 'inline',
        onMount(container) {
          import('./Popover.svelte').then(({ default: Popover }) => {
            mount(Popover, {
              target: container,
              props: {
                annotation,
                rect,
                editMode,
                onSaveNote: async (note: string) => {
                  await updateAnnotationNote(annotationId, note);
                  sendMessage({ type: 'ANNOTATIONS_UPDATED' }).catch(() => {});
                },
                onChangeColor: async (colorId: ColorId) => {
                  changeHighlightColor(annotationId, colorId);
                  await updateAnnotationColor(annotationId, colorId);
                  sendMessage({ type: 'ANNOTATIONS_UPDATED' }).catch(() => {});
                },
                onDelete: async () => {
                  removeHighlight(annotationId);
                  await deleteAnnotation(annotationId);
                  sendMessage({ type: 'ANNOTATIONS_UPDATED' }).catch(() => {});
                  popoverUi?.remove();
                  popoverUi = null;
                },
                onResize: async () => {
                  // Read current selection as new boundaries
                  const sel = window.getSelection();
                  if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) return;
                  const newRange = snapRangeToWordBoundaries(sel.getRangeAt(0).cloneRange());
                  const newText = newRange.toString();
                  const newQuote = rangeToQuoteSelector(newRange);
                  const newPosition = rangeToPositionSelector(newRange);

                  // Update DB
                  await updateAnnotationSelectors(annotationId, newText, newQuote, newPosition);

                  // Update CSS highlight: remove old, add new
                  removeHighlight(annotationId);
                  addHighlight(annotationId, newRange, annotation.colorId);

                  sendMessage({ type: 'ANNOTATIONS_UPDATED' }).catch(() => {});
                  sel.removeAllRanges();
                  popoverUi?.remove();
                  popoverUi = null;
                },
                onClose: () => {
                  popoverUi?.remove();
                  popoverUi = null;
                },
              },
            });
          });
        },
      });

      popoverUi.mount();
    }

    /** Show the selection toolbar near the given rect */
    async function showSelectionToolbar(rect: DOMRect) {
      hideSelectionToolbar();

      try {
        selectionToolbarUi = await createShadowRootUi(ctx, {
          name: 'glownote-selection-toolbar',
          position: 'inline',
          onMount(container) {
            import('./SelectionToolbar.svelte').then(({ default: SelectionToolbar }) => {
              mount(SelectionToolbar, {
                target: container,
                props: {
                  rect,
                  activeColorId,
                  onHighlight: async (colorId: ColorId) => {
                    hideSelectionToolbar();
                    const annotation = await highlightSelection(colorId);
                    if (annotation) {
                      setTimeout(() => showPopover(annotation.id), 150);
                    }
                  },
                  onDismiss: () => {
                    hideSelectionToolbar();
                  },
                },
              });
            });
          },
        });

        selectionToolbarUi.mount();
      } catch (e) {
        console.warn('GlowNote: Failed to show selection toolbar', e);
      }
    }

    /** Remove the selection toolbar */
    function hideSelectionToolbar() {
      if (selectionToolbarUi) {
        selectionToolbarUi.remove();
        selectionToolbarUi = null;
      }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', async (e) => {
      const action = parseKeyAction(e);
      if (!action) return;

      switch (action.type) {
        case 'highlight':
          e.preventDefault();
          hideSelectionToolbar();
          await highlightSelection();
          break;
        case 'setColor':
          e.preventDefault();
          hideSelectionToolbar();
          if (action.colorId) {
            activeColorId = action.colorId;
            // If there's a selection, highlight it with the new color
            if (window.getSelection()?.toString().trim()) {
              await highlightSelection(action.colorId);
            }
          }
          break;
        case 'openNote':
          e.preventDefault();
          if (lastHighlightId) {
            await showPopover(lastHighlightId);
          }
          break;
        case 'export':
          e.preventDefault();
          const anns = await getAnnotationsForPage(window.location.href);
          const md = exportPageMarkdown(anns, document.title, window.location.href);
          await copyToClipboard(md);
          break;
        case 'dismiss':
          if (selectionToolbarUi) {
            hideSelectionToolbar();
          } else if (popoverUi) {
            popoverUi.remove();
            popoverUi = null;
          }
          break;
      }
    });

    // Click to open popover on highlighted text, or show selection toolbar
    document.addEventListener('mouseup', (e) => {
      // Small delay to let selection complete
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          // Guard against form fields
          const target = e.target as HTMLElement;
          const tag = target.tagName?.toLowerCase();
          if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;

          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          showSelectionToolbar(rect);
          return;
        }

        // No text selected — hit-test highlight for popover
        hideSelectionToolbar();

        const hit = hitTestHighlightWithColor(e.clientX, e.clientY);
        if (hit) {
          // Same-color click → edit mode; different color → normal popover
          const isEditMode = hit.colorId === activeColorId;
          if (isEditMode) {
            const range = getHighlightRange(hit.annotationId);
            if (range) {
              selectHighlightForEditing(hit.annotationId, range);
              return;
            }
          }
          showPopover(hit.annotationId);
        }
      }, 50);
    });

    // Dismiss toolbar on mousedown (new selection starting) or scroll
    // Use composedPath() so clicks inside the toolbar's shadow DOM don't dismiss it
    document.addEventListener('mousedown', (e) => {
      if (selectionToolbarUi) {
        const path = e.composedPath();
        const insideToolbar = path.some(
          (el) => el instanceof HTMLElement && el.tagName.toLowerCase() === 'glownote-selection-toolbar'
        );
        if (insideToolbar) return;
      }
      hideSelectionToolbar();
    });
    document.addEventListener('scroll', () => hideSelectionToolbar(), true);

    // Listen for messages from background/side panel
    onMessage(async (msg) => {
      switch (msg.type) {
        case 'HIGHLIGHT_SELECTION':
        case 'CONTEXT_MENU_HIGHLIGHT':
          await highlightSelection(msg.colorId);
          break;
        case 'REMOVE_HIGHLIGHT':
          removeHighlight(msg.annotationId);
          break;
        case 'CHANGE_HIGHLIGHT_COLOR':
          changeHighlightColor(msg.annotationId, msg.colorId);
          break;
        case 'SCROLL_TO_HIGHLIGHT': {
          const range = getHighlightRange(msg.annotationId);
          if (range) {
            const rect = range.getBoundingClientRect();
            window.scrollTo({
              top: window.scrollY + rect.top - window.innerHeight / 3,
              behavior: 'smooth',
            });
            lastHighlightId = msg.annotationId;
          }
          break;
        }
        case 'OPEN_NOTE':
          await showPopover(msg.annotationId);
          break;
        case 'EXPORT_PAGE': {
          const pageAnns = await getAnnotationsForPage(window.location.href);
          const markdown = exportPageMarkdown(pageAnns, document.title, window.location.href);
          await copyToClipboard(markdown);
          break;
        }
        case 'SET_ACTIVE_COLOR':
          activeColorId = msg.colorId;
          break;
      }
    });
  },
});
