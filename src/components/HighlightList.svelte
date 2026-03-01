<script lang="ts">
  import { DEFAULT_CATEGORIES, type ColorId } from '../lib/colors';
  import NoteEditor from './NoteEditor.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import type { Annotation } from '../lib/types';

  interface Props {
    annotations: Annotation[];
    onScrollTo: (annotation: Annotation) => void;
    onDelete: (annotation: Annotation) => void;
    onUpdateNote: (annotation: Annotation, note: string) => void;
    onUpdateColor: (annotation: Annotation, colorId: ColorId) => void;
  }

  let { annotations, onScrollTo, onDelete, onUpdateNote, onUpdateColor }: Props = $props();
  let editingNoteId = $state<string | null>(null);
  let editingColorId = $state<string | null>(null);
</script>

<div class="highlight-list">
  {#if annotations.length === 0}
    <div class="empty">No highlights yet. Select text and press <kbd>H</kbd> to highlight.</div>
  {:else}
    {#each annotations as annotation (annotation.id)}
      <div class="card" style="--bar-color: {DEFAULT_CATEGORIES[annotation.colorId]?.color ?? '#ccc'}">
        <div class="card-header">
          <button
            class="color-label"
            onclick={() => editingColorId = editingColorId === annotation.id ? null : annotation.id}
          >
            <span class="dot"></span>
            {DEFAULT_CATEGORIES[annotation.colorId]?.label ?? annotation.colorId}
          </button>
          <div class="card-actions">
            <button class="action-btn" title="Scroll to highlight" onclick={() => onScrollTo(annotation)}>
              &#x2197;
            </button>
            <button class="action-btn delete" title="Delete" onclick={() => onDelete(annotation)}>
              &times;
            </button>
          </div>
        </div>

        {#if editingColorId === annotation.id}
          <ColorPicker
            activeColorId={annotation.colorId}
            onSelect={(colorId) => { onUpdateColor(annotation, colorId); editingColorId = null; }}
          />
        {/if}

        <button class="quote" onclick={() => onScrollTo(annotation)}>
          "{annotation.selectedText.length > 200
            ? annotation.selectedText.slice(0, 200) + '...'
            : annotation.selectedText}"
        </button>

        {#if editingNoteId === annotation.id}
          <NoteEditor
            note={annotation.note ?? ''}
            onSave={(note) => { onUpdateNote(annotation, note); editingNoteId = null; }}
            onCancel={() => editingNoteId = null}
          />
        {:else if annotation.note}
          <button class="note-preview" onclick={() => editingNoteId = annotation.id}>
            {annotation.note}
          </button>
        {:else}
          <button class="add-note" onclick={() => editingNoteId = annotation.id}>
            + Add note
          </button>
        {/if}

        <div class="timestamp">
          {new Date(annotation.createdAt).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .highlight-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px;
  }

  .empty {
    text-align: center;
    color: #888;
    padding: 32px 16px;
    font-size: 13px;
  }

  kbd {
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 1px 5px;
    font-family: monospace;
    font-size: 11px;
  }

  .card {
    background: white;
    border-radius: 6px;
    border-left: 3px solid var(--bar-color);
    padding: 10px 12px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .color-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--bar-color);
  }

  .card-actions {
    display: flex;
    gap: 2px;
  }

  .action-btn {
    border: none;
    background: none;
    font-size: 14px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    color: #888;
    line-height: 1;
  }

  .action-btn:hover {
    background: #f0f0f0;
    color: #333;
  }

  .action-btn.delete:hover {
    color: #dc2626;
  }

  .quote {
    font-size: 12px;
    line-height: 1.5;
    color: #333;
    margin-bottom: 6px;
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
  }

  .quote:hover {
    color: #111;
  }

  .note-preview {
    font-size: 11px;
    color: #555;
    background: #f9f9f9;
    padding: 6px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }

  .note-preview:hover {
    background: #f0f0f0;
  }

  .add-note {
    font-size: 11px;
    color: #888;
    border: none;
    background: none;
    cursor: pointer;
    padding: 2px 0;
  }

  .add-note:hover {
    color: #333;
  }

  .timestamp {
    font-size: 10px;
    color: #aaa;
    margin-top: 4px;
  }
</style>
