<script lang="ts">
  import { DEFAULT_CATEGORIES, COLOR_IDS, type ColorId } from '../lib/colors';

  interface Props {
    activeColorId: ColorId;
    onSelect: (colorId: ColorId) => void;
  }

  let { activeColorId, onSelect }: Props = $props();
</script>

<div class="color-picker">
  {#each COLOR_IDS as colorId}
    <button
      class="color-option"
      class:active={activeColorId === colorId}
      style="--color: {DEFAULT_CATEGORIES[colorId].color}"
      title={DEFAULT_CATEGORIES[colorId].label}
      onclick={() => onSelect(colorId)}
    >
      <span class="swatch"></span>
      <span class="label">{DEFAULT_CATEGORIES[colorId].label}</span>
    </button>
  {/each}
</div>

<style>
  .color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 0;
  }

  .color-option {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 12px;
    padding: 3px 8px;
    font-size: 10px;
    cursor: pointer;
  }

  .color-option:hover {
    background: #f5f5f5;
  }

  .color-option.active {
    border-color: var(--color);
    background: color-mix(in srgb, var(--color) 10%, white);
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color);
  }

  .label {
    color: #555;
  }
</style>
