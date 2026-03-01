<script lang="ts">
  interface Props {
    note: string;
    onSave: (note: string) => void;
    onCancel: () => void;
  }

  let { note, onSave, onCancel }: Props = $props();
  // svelte-ignore state_referenced_locally
  let value = $state(note);
  let textarea: HTMLTextAreaElement;

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSave(value);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  $effect(() => {
    textarea?.focus();
  });
</script>

<div class="note-editor">
  <textarea
    bind:this={textarea}
    bind:value
    placeholder="Add a note..."
    rows="3"
    onkeydown={handleKeydown}
    onblur={() => onSave(value)}
  ></textarea>
  <div class="hint">Ctrl+Enter to save, Esc to cancel</div>
</div>

<style>
  .note-editor {
    margin: 4px 0;
  }

  textarea {
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    min-height: 50px;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: none;
    border-color: #60a5fa;
  }

  .hint {
    font-size: 10px;
    color: #aaa;
    margin-top: 2px;
  }
</style>
