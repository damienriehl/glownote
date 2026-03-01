<script lang="ts">
  import { DEFAULT_CATEGORIES, COLOR_IDS, type ColorId } from '../../lib/colors';
  import type { Annotation } from '../../lib/types';

  interface Props {
    annotation: Annotation;
    rect: DOMRect;
    editMode?: boolean;
    onSaveNote: (note: string) => void;
    onChangeColor: (colorId: ColorId) => void;
    onDelete: () => void;
    onResize?: () => void;
    onClose: () => void;
  }

  let { annotation, rect, editMode = false, onSaveNote, onChangeColor, onDelete, onResize, onClose }: Props = $props();
  // svelte-ignore state_referenced_locally
  let noteText = $state(annotation.note ?? '');
  let isAbove = $state(false);

  // Position calculation
  let top = $derived.by(() => {
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 200) {
      isAbove = true;
      return rect.top + window.scrollY - 8;
    }
    isAbove = false;
    return rect.bottom + window.scrollY + 8;
  });

  let left = $derived(Math.max(8, Math.min(rect.left, window.innerWidth - 320)));

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSaveNote(noteText);
    }
    e.stopPropagation(); // Don't trigger content script shortcuts
  }

  function handleBlur() {
    if (noteText !== (annotation.note ?? '')) {
      onSaveNote(noteText);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="popover"
  class:above={isAbove}
  style="top: {top}px; left: {left}px;"
  onkeydown={handleKeydown}
>
  {#if editMode}
    <div class="edit-hint">Adjust selection handles, then:</div>
    <button class="resize-btn" onclick={() => onResize?.()}>Update Boundaries</button>
  {/if}

  <div class="color-row">
    {#each COLOR_IDS as colorId}
      <button
        class="color-btn"
        class:active={annotation.colorId === colorId}
        style="--color: {DEFAULT_CATEGORIES[colorId].color}"
        title={DEFAULT_CATEGORIES[colorId].label}
        onclick={() => onChangeColor(colorId)}
      >
        <span class="color-swatch"></span>
      </button>
    {/each}
  </div>

  <textarea
    bind:value={noteText}
    placeholder="Add a note..."
    rows="3"
    onblur={handleBlur}
  ></textarea>

  <div class="actions">
    <button class="delete-btn" onclick={onDelete}>Delete</button>
    <button class="close-btn" onclick={onClose}>Close</button>
  </div>
</div>

<style>
  .popover {
    position: absolute;
    z-index: 2147483647;
    width: 300px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
  }

  .popover.above {
    transform: translateY(-100%);
  }

  .edit-hint {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }

  .resize-btn {
    width: 100%;
    padding: 6px 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .resize-btn:hover {
    background: #1d4ed8;
  }

  .color-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .color-btn {
    width: 24px;
    height: 24px;
    border: 2px solid transparent;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-btn.active {
    border-color: #333;
  }

  .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color);
  }

  textarea {
    width: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    min-height: 60px;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: none;
    border-color: #60a5fa;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
  }

  .actions button {
    border: none;
    background: none;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .delete-btn {
    color: #dc2626;
  }

  .delete-btn:hover {
    background: #fef2f2;
  }

  .close-btn {
    color: #666;
  }

  .close-btn:hover {
    background: #f0f0f0;
  }
</style>
