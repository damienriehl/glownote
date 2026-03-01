<script lang="ts">
  import { renderPdf } from './pdf-renderer';
  import { initPdfHighlighting } from './pdf-annotator';
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
    const ann = await highlighter.highlightSelection(colorId ?? activeColor);
    if (ann) {
      await refreshAnnotations();
      status = 'Highlighted!';
      setTimeout(() => status = '', 1500);
    }
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

  /** Auto-highlight on text selection (mouseup) */
  function handleMouseup() {
    // Short delay so the browser finalizes the selection
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        handleHighlight();
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
