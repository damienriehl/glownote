<script lang="ts">
  import { DEFAULT_CATEGORIES, COLOR_IDS, type ColorId } from '../lib/colors';
  import type { GlowNoteSettings } from '../lib/types';

  interface Props {
    settings: GlowNoteSettings;
    onSave: (settings: GlowNoteSettings) => void;
  }

  let { settings, onSave }: Props = $props();
  // svelte-ignore state_referenced_locally
  let labels = $state({ ...settings.categoryLabels });

  function handleSave() {
    settings.categoryLabels = { ...labels };
    onSave(settings);
  }

  function handleReset(colorId: ColorId) {
    labels[colorId] = DEFAULT_CATEGORIES[colorId].label;
    handleSave();
  }
</script>

<div class="category-manager">
  {#each COLOR_IDS as colorId}
    <div class="category-row">
      <span class="color-dot" style="background: {DEFAULT_CATEGORIES[colorId].color}"></span>
      <input
        type="text"
        bind:value={labels[colorId]}
        onblur={handleSave}
      />
      {#if labels[colorId] !== DEFAULT_CATEGORIES[colorId].label}
        <button class="reset-btn" onclick={() => handleReset(colorId)} title="Reset to default">
          &#x21BA;
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .category-manager {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .category-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 13px;
  }

  input:focus {
    outline: none;
    border-color: #60a5fa;
  }

  .reset-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: #888;
    padding: 4px;
  }

  .reset-btn:hover {
    color: #333;
  }
</style>
