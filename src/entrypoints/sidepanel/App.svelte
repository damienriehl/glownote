<script lang="ts">
  import HighlightList from '../../components/HighlightList.svelte';
  import SearchBar from '../../components/SearchBar.svelte';
  import ExportControls from '../../components/ExportControls.svelte';
  import ColorPicker from '../../components/ColorPicker.svelte';
  import { DEFAULT_CATEGORIES, type ColorId } from '../../lib/colors';
  import { getAnnotationsForPage, deleteAnnotation, updateAnnotationNote, updateAnnotationColor } from '../../lib/storage/db';
  import { sendTabMessage } from '../../lib/messages';
  import type { Annotation } from '../../lib/types';

  let annotations = $state<Annotation[]>([]);
  let filterColor = $state<ColorId | null>(null);
  let searchQuery = $state('');
  let pageTitle = $state('');
  let pageUrl = $state('');

  async function loadAnnotations() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    pageUrl = tab.url;
    pageTitle = tab.title ?? '';
    annotations = await getAnnotationsForPage(tab.url);
  }

  function filteredAnnotations(): Annotation[] {
    let result = annotations;
    if (filterColor) {
      result = result.filter(a => a.colorId === filterColor);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.selectedText.toLowerCase().includes(q) ||
        (a.note ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  async function handleScrollTo(annotation: Annotation) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      sendTabMessage(tab.id, { type: 'SCROLL_TO_HIGHLIGHT', annotationId: annotation.id });
    }
  }

  async function handleDelete(annotation: Annotation) {
    await deleteAnnotation(annotation.id);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      sendTabMessage(tab.id, { type: 'REMOVE_HIGHLIGHT', annotationId: annotation.id });
    }
    await loadAnnotations();
  }

  async function handleUpdateNote(annotation: Annotation, note: string) {
    await updateAnnotationNote(annotation.id, note);
    await loadAnnotations();
  }

  async function handleUpdateColor(annotation: Annotation, colorId: ColorId) {
    await updateAnnotationColor(annotation.id, colorId);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      sendTabMessage(tab.id, { type: 'CHANGE_HIGHLIGHT_COLOR', annotationId: annotation.id, colorId });
    }
    await loadAnnotations();
  }

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ANNOTATIONS_UPDATED') {
      loadAnnotations();
    }
  });

  // Load on mount and tab change
  loadAnnotations();
  chrome.tabs.onActivated.addListener(() => loadAnnotations());
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.status === 'complete') loadAnnotations();
  });
</script>

<main>
  <header>
    <h1>GlowNote</h1>
    <p class="page-info">{pageTitle || 'No page selected'}</p>
    <p class="count">{filteredAnnotations().length} highlight{filteredAnnotations().length !== 1 ? 's' : ''}</p>
  </header>

  <div class="controls">
    <SearchBar bind:query={searchQuery} />
    <div class="color-filter">
      <button
        class="filter-btn"
        class:active={filterColor === null}
        onclick={() => filterColor = null}
      >All</button>
      {#each Object.entries(DEFAULT_CATEGORIES) as [id, cat]}
        <button
          class="filter-btn"
          class:active={filterColor === id}
          style="--color: {cat.color}"
          onclick={() => filterColor = filterColor === id ? null : id as ColorId}
          title={cat.label}
        >
          <span class="color-dot"></span>
        </button>
      {/each}
    </div>
  </div>

  <HighlightList
    annotations={filteredAnnotations()}
    onScrollTo={handleScrollTo}
    onDelete={handleDelete}
    onUpdateNote={handleUpdateNote}
    onUpdateColor={handleUpdateColor}
  />

  <footer>
    <ExportControls {annotations} {pageTitle} {pageUrl} />
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    background: #fafafa;
    color: #1a1a1a;
  }

  main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  header {
    padding: 12px 16px 8px;
    border-bottom: 1px solid #e5e5e5;
    background: white;
  }

  h1 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px;
  }

  .page-info {
    margin: 0;
    font-size: 11px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .count {
    margin: 4px 0 0;
    font-size: 11px;
    color: #888;
  }

  .controls {
    padding: 8px 16px;
    background: white;
    border-bottom: 1px solid #e5e5e5;
  }

  .color-filter {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .filter-btn {
    border: 1px solid #ddd;
    background: white;
    border-radius: 12px;
    padding: 3px 10px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .filter-btn:hover {
    background: #f0f0f0;
  }

  .filter-btn.active {
    background: #1a1a1a;
    color: white;
    border-color: #1a1a1a;
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color);
  }

  footer {
    padding: 8px 16px;
    border-top: 1px solid #e5e5e5;
    background: white;
    margin-top: auto;
  }
</style>
