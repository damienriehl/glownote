<script lang="ts">
  interface Props {
    query: string;
  }

  let { query = $bindable() }: Props = $props();
  let inputEl: HTMLInputElement;
  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      query = value;
    }, 300);
  }

  export function focus() {
    inputEl?.focus();
  }
</script>

<div class="search-bar">
  <span class="icon">&#x1F50D;</span>
  <input
    bind:this={inputEl}
    type="text"
    placeholder="Search highlights..."
    value={query}
    oninput={handleInput}
  />
  {#if query}
    <button class="clear" onclick={() => { query = ''; inputEl.value = ''; }}>&times;</button>
  {/if}
</div>

<style>
  .search-bar {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 0 8px;
    border: 1px solid transparent;
  }

  .search-bar:focus-within {
    border-color: #60a5fa;
    background: white;
  }

  .icon {
    font-size: 12px;
    margin-right: 6px;
    opacity: 0.5;
  }

  input {
    flex: 1;
    border: none;
    background: none;
    font-size: 12px;
    padding: 7px 0;
    outline: none;
  }

  .clear {
    border: none;
    background: none;
    font-size: 16px;
    cursor: pointer;
    color: #888;
    padding: 0 4px;
    line-height: 1;
  }

  .clear:hover {
    color: #333;
  }
</style>
