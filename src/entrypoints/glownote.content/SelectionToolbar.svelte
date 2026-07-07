<script lang="ts">
  import { DEFAULT_CATEGORIES, COLOR_IDS, type ColorId } from '../../lib/colors';

  interface Props {
    rect: DOMRect;
    activeColorId: ColorId;
    onHighlight: (colorId: ColorId) => void;
    onDismiss: () => void;
  }

  let { rect, activeColorId, onHighlight, onDismiss }: Props = $props();
  let isAbove = $derived(rect.top >= 56);

  let top = $derived(
    isAbove
      ? rect.top + window.scrollY - 8
      : rect.bottom + window.scrollY + 8
  );

  let left = $derived(
    Math.max(8, Math.min(rect.left + rect.width / 2 - 104, window.innerWidth - 208))
  );

  function handleKeydown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onDismiss();
      return;
    }
    const n = parseInt(e.key);
    if (n >= 1 && n <= 6) {
      e.preventDefault();
      onHighlight(COLOR_IDS[n - 1]);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="toolbar"
  class:above={isAbove}
  style="top: {top}px; left: {left}px;"
  onkeydown={handleKeydown}
  onmousedown={(e) => e.preventDefault()}
>
  <div class="color-row">
    {#each COLOR_IDS as colorId, i}
      <button
        class="color-btn"
        class:active={activeColorId === colorId}
        style="--color: {DEFAULT_CATEGORIES[colorId].color}"
        title="{DEFAULT_CATEGORIES[colorId].label} ({i + 1})"
        onclick={() => onHighlight(colorId)}
      >
        <span class="color-swatch"></span>
      </button>
    {/each}
  </div>
  <span class="label">Highlight</span>
</div>

<style>
  .toolbar {
    position: absolute;
    z-index: 2147483647;
    background: #1a1a1a;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    user-select: none;
  }

  .toolbar.above {
    transform: translateY(-100%);
  }

  .color-row {
    display: flex;
    gap: 4px;
  }

  .color-btn {
    width: 28px;
    height: 28px;
    border: 2px solid transparent;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s ease;
  }

  .color-btn:hover {
    transform: scale(1.15);
  }

  .color-btn.active {
    border-color: rgba(255, 255, 255, 0.8);
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color);
  }

  .label {
    font-size: 11px;
    color: #999;
    white-space: nowrap;
  }
</style>
