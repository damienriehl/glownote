<script lang="ts">
  import { renderPdf } from './pdf-renderer';
  import { initPdfHighlighting } from './pdf-annotator';
  import { removeHighlight, addHighlight, hitTestHighlightWithColor, getHighlightRange } from '../lib/highlight/css-highlight';
  import ColorPicker from '../components/ColorPicker.svelte';
  import ExportControls from '../components/ExportControls.svelte';
  import { colorIdFromNumber, type ColorId } from '../lib/colors';
  import { getAnnotationsForPage } from '../lib/storage/db';
  import { exportPageMarkdown } from '../lib/export/markdown';
  import { copyToClipboard } from '../lib/export/clipboard';
  import type { Annotation } from '../lib/types';

  let container: HTMLDivElement;
  let pdfUrl = $state('');
  let status = $state('Loading...');
  let activeColor = $state<ColorId>('yellow');
  let annotations = $state<Annotation[]>([]);
  let editingHighlightId = $state<string | null>(null);
  let editingColorId = $state<ColorId | null>(null);
  let editCleanup: (() => void) | null = null;

  // Get original PDF URL from query params
  const params = new URLSearchParams(window.location.search);
  pdfUrl = params.get('url') ?? '';

  let highlighter: ReturnType<typeof initPdfHighlighting>;

  async function loadPdf() {
    if (!pdfUrl) {
      status = 'No PDF URL provided';
      return;
    }

    try {
      status = 'Rendering PDF...';
      await renderPdf(pdfUrl, container);
      highlighter = initPdfHighlighting(pdfUrl);
      const anchored = await highlighter.reanchor();
      await refreshAnnotations();
      status = anchored > 0 ? `Restored ${anchored} highlights` : 'Ready — select text to highlight';
      setTimeout(() => status = '', 4000);
    } catch (e) {
      status = `Error: ${(e as Error).message}`;
    }
  }

  async function refreshAnnotations() {
    if (pdfUrl) {
      annotations = await getAnnotationsForPage(pdfUrl);
    }
  }

  async function handleHighlight(colorId?: ColorId) {
    if (!highlighter) return;
    const color = colorId ?? activeColor;

    // Check if selection is within an existing same-color highlight
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
      const range = sel.getRangeAt(0);
      const containing = highlighter.findContaining(range);
      const sameColor = containing.find(h => h.colorId === color);
      if (sameColor) {
        sel.removeAllRanges();
        enterPdfEditMode(sameColor.annotationId, sameColor.colorId, sameColor.range);
        return;
      }
    }

    const ann = await highlighter.highlightSelection(color);
    if (ann) {
      await refreshAnnotations();
      status = 'Highlighted!';
      setTimeout(() => status = '', 1500);
    }
  }

  /** Find the .glownote-pdf-page ancestor of a node */
  function findPageDiv(node: Node): HTMLDivElement | null {
    let el: Node | null = node;
    while (el) {
      if (el instanceof HTMLElement && el.classList.contains('glownote-pdf-page')) {
        return el as HTMLDivElement;
      }
      el = el.parentNode;
    }
    return null;
  }

  /** Position a handle element at the edge of a rect, relative to pageDiv */
  function positionHandle(handle: HTMLDivElement, rect: DOMRect, pageDiv: HTMLDivElement, side: 'left' | 'right') {
    const pageRect = pageDiv.getBoundingClientRect();
    const x = side === 'left' ? rect.left - pageRect.left : rect.right - pageRect.left;
    const y = rect.top - pageRect.top;
    handle.style.left = `${x - 3}px`;
    handle.style.top = `${y - 2}px`;
    handle.style.height = `${rect.height + 4}px`;
  }

  /** Position the toolbar below the last rect of the highlight */
  function positionToolbar(toolbar: HTMLDivElement, rects: DOMRect[], pageDiv: HTMLDivElement) {
    const pageRect = pageDiv.getBoundingClientRect();
    const lastRect = rects[rects.length - 1];
    const midX = (lastRect.left + lastRect.right) / 2 - pageRect.left;
    toolbar.style.left = `${midX}px`;
    toolbar.style.top = `${lastRect.bottom - pageRect.top + 6}px`;
  }

  function enterPdfEditMode(annotationId: string, colorId: ColorId, range: Range) {
    // Clean up any previous edit mode
    exitPdfEditMode();

    editingHighlightId = annotationId;
    editingColorId = colorId;
    status = 'Drag handles to resize — Delete or Cancel below';

    const pageDiv = findPageDiv(range.startContainer);
    if (!pageDiv) return;

    const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
    if (rects.length === 0) return;

    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];

    // Current range boundaries (mutable during drag)
    let currentRange = range.cloneRange();

    // --- Create start handle ---
    const startHandle = document.createElement('div');
    Object.assign(startHandle.style, {
      position: 'absolute', width: '6px', borderRadius: '3px',
      background: '#2563eb', cursor: 'col-resize', zIndex: '200',
      boxShadow: '0 0 0 2px rgba(37,99,235,0.3)',
    });
    positionHandle(startHandle, firstRect, pageDiv, 'left');
    pageDiv.appendChild(startHandle);

    // --- Create end handle ---
    const endHandle = document.createElement('div');
    Object.assign(endHandle.style, {
      position: 'absolute', width: '6px', borderRadius: '3px',
      background: '#2563eb', cursor: 'col-resize', zIndex: '200',
      boxShadow: '0 0 0 2px rgba(37,99,235,0.3)',
    });
    positionHandle(endHandle, lastRect, pageDiv, 'right');
    pageDiv.appendChild(endHandle);

    // --- Create toolbar ---
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
      position: 'absolute', display: 'flex', gap: '6px', padding: '4px 8px',
      background: '#1a1a1a', borderRadius: '6px', zIndex: '200',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transform: 'translateX(-50%)',
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    Object.assign(deleteBtn.style, {
      background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px',
      padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
      background: '#555', color: 'white', border: 'none', borderRadius: '4px',
      padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
    });

    toolbar.appendChild(deleteBtn);
    toolbar.appendChild(cancelBtn);
    positionToolbar(toolbar, rects, pageDiv);
    pageDiv.appendChild(toolbar);

    // --- Button handlers ---
    deleteBtn.addEventListener('click', handleDeleteEditing);
    cancelBtn.addEventListener('click', handleCancelEditing);

    // --- Drag logic ---
    let dragging: 'start' | 'end' | null = null;

    function onMouseDown(which: 'start' | 'end') {
      return (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragging = which;
        const handle = which === 'start' ? startHandle : endHandle;
        handle.style.pointerEvents = 'none';
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('mouseup', onMouseUp, true);
      };
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();

      const caretRange = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!caretRange) return;

      const newRange = document.createRange();
      try {
        if (dragging === 'start') {
          newRange.setStart(caretRange.startContainer, caretRange.startOffset);
          newRange.setEnd(currentRange.endContainer, currentRange.endOffset);
        } else {
          newRange.setStart(currentRange.startContainer, currentRange.startOffset);
          newRange.setEnd(caretRange.startContainer, caretRange.startOffset);
        }
      } catch {
        return; // Invalid range (cross-boundary etc.)
      }

      // Reject collapsed or empty ranges
      if (newRange.collapsed || !newRange.toString().trim()) return;

      // Update visual highlight in real time
      removeHighlight(annotationId);
      addHighlight(annotationId, newRange, colorId);
      currentRange = newRange;

      // Reposition the dragged handle
      const newRects = Array.from(newRange.getClientRects()).filter(r => r.width > 0 && r.height > 0);
      if (newRects.length > 0) {
        if (dragging === 'start') {
          positionHandle(startHandle, newRects[0], pageDiv, 'left');
        } else {
          positionHandle(endHandle, newRects[newRects.length - 1], pageDiv, 'right');
        }
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();

      const handle = dragging === 'start' ? startHandle : endHandle;
      handle.style.pointerEvents = '';
      dragging = null;

      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);

      // Persist to DB
      if (highlighter && editingHighlightId && editingColorId) {
        highlighter.resizeHighlight(editingHighlightId, currentRange, editingColorId)
          .then(() => refreshAnnotations());
      }

      // Reposition all elements to final position
      const finalRects = Array.from(currentRange.getClientRects()).filter(r => r.width > 0 && r.height > 0);
      if (finalRects.length > 0) {
        positionHandle(startHandle, finalRects[0], pageDiv, 'left');
        positionHandle(endHandle, finalRects[finalRects.length - 1], pageDiv, 'right');
        positionToolbar(toolbar, finalRects, pageDiv);
      }
    }

    startHandle.addEventListener('mousedown', onMouseDown('start'));
    endHandle.addEventListener('mousedown', onMouseDown('end'));

    // --- Click-outside to dismiss (auto-save already happened on drag mouseup) ---
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (startHandle.contains(target) || endHandle.contains(target) || toolbar.contains(target)) return;
      exitPdfEditMode();
    }
    // Attach after current event cycle so the triggering click doesn't immediately dismiss
    setTimeout(() => document.addEventListener('click', onClickOutside, true), 0);

    // --- Store cleanup ---
    editCleanup = () => {
      startHandle.remove();
      endHandle.remove();
      toolbar.remove();
      deleteBtn.removeEventListener('click', handleDeleteEditing);
      cancelBtn.removeEventListener('click', handleCancelEditing);
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.removeEventListener('click', onClickOutside, true);
    };
  }

  function exitPdfEditMode() {
    if (editCleanup) {
      editCleanup();
      editCleanup = null;
    }
    editingHighlightId = null;
    editingColorId = null;
    status = '';
  }

  async function handleDeleteEditing() {
    if (!highlighter || !editingHighlightId) return;
    await highlighter.removeHighlightById(editingHighlightId);
    exitPdfEditMode();
    await refreshAnnotations();
    status = 'Highlight deleted';
    setTimeout(() => status = '', 1500);
  }

  function handleCancelEditing() {
    exitPdfEditMode();
  }

  async function handleExport() {
    if (annotations.length === 0) return;
    const md = exportPageMarkdown(annotations, document.title, pdfUrl);
    const ok = await copyToClipboard(md);
    if (ok) {
      status = 'Markdown copied to clipboard!';
      setTimeout(() => status = '', 2000);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape' && editingHighlightId) {
      e.preventDefault();
      handleCancelEditing();
      return;
    }

    const key = e.key.toLowerCase();

    if (key === 'h') {
      e.preventDefault();
      handleHighlight();
      return;
    }

    if (key === 'e') {
      e.preventDefault();
      handleExport();
      return;
    }

    // Number keys 1-6 for color
    const num = parseInt(e.key, 10);
    const colorFromKey = colorIdFromNumber(num);
    if (colorFromKey) {
      e.preventDefault();
      activeColor = colorFromKey;
      // If there's a selection, highlight it immediately
      if (window.getSelection()?.toString().trim()) {
        handleHighlight(colorFromKey);
      } else {
        status = `Color: ${colorFromKey}`;
        setTimeout(() => status = '', 1000);
      }
    }
  }

  /** Auto-highlight on text selection (mouseup), or enter edit mode on single-click */
  function handleMouseup(e: MouseEvent) {
    // Don't auto-highlight while user is adjusting boundaries in edit mode
    if (editingHighlightId) return;

    // Short delay so the browser finalizes the selection
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        handleHighlight();
        return;
      }

      // Single click with no selection — check if clicked on a same-color highlight
      if (!highlighter) return;
      const hit = hitTestHighlightWithColor(e.clientX, e.clientY);
      if (hit && hit.colorId === activeColor) {
        const range = getHighlightRange(hit.annotationId);
        if (range) {
          enterPdfEditMode(hit.annotationId, hit.colorId, range);
        }
      }
    }, 10);
  }

  $effect(() => {
    if (container && pdfUrl) loadPdf();
  });
</script>

<svelte:document onkeydown={handleKeydown} onmouseup={handleMouseup} />

<main>
  <header>
    <div class="title-row">
      <h1>GlowNote PDF Viewer</h1>
      <span class="shortcut-hint">Select text to highlight &middot; 1-6 = color &middot; E = export</span>
    </div>
    <div class="toolbar">
      <ColorPicker activeColorId={activeColor} onSelect={(c) => activeColor = c} />
      <button class="export-btn" onclick={handleExport} disabled={annotations.length === 0}>
        Export Markdown (E)
      </button>
    </div>
    <p class="status">{status}&nbsp;</p>
  </header>
  <div bind:this={container} class="pdf-container"></div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #525659;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  main {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  header {
    background: #323639;
    color: white;
    padding: 8px 16px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }

  h1 {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }

  .shortcut-hint {
    font-size: 11px;
    color: #888;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .export-btn {
    background: #555;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
  }

  .export-btn:hover:not(:disabled) {
    background: #666;
  }

  .export-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .status {
    font-size: 11px;
    color: #aaa;
    margin: 4px 0 0;
  }

  .pdf-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  :global(.glownote-pdf-page) {
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  /* Invisible text layer overlays the canvas for text selection */
  :global(.glownote-pdf-text-layer) {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    overflow: clip;
    line-height: 1;
  }

  :global(.glownote-pdf-text-layer ::selection) {
    background: rgba(0, 100, 255, 0.3);
  }

  /* CSS Custom Highlight API rules — needed on this extension page
     since the content script's style.css doesn't load here.
     Must be :global() because ::highlight() is document-level, not scoped. */
  :global(::highlight(glownote-yellow)) { background-color: rgba(250, 204, 21, 0.35); }
  :global(::highlight(glownote-pink)) { background-color: rgba(244, 114, 182, 0.35); }
  :global(::highlight(glownote-blue)) { background-color: rgba(96, 165, 250, 0.35); }
  :global(::highlight(glownote-green)) { background-color: rgba(74, 222, 128, 0.35); }
  :global(::highlight(glownote-orange)) { background-color: rgba(251, 146, 60, 0.35); }
  :global(::highlight(glownote-purple)) { background-color: rgba(192, 132, 252, 0.35); }
</style>
