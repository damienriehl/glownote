<script lang="ts">
  import CategoryManager from '../../components/CategoryManager.svelte';
  import { getSettings, saveSettings } from '../../lib/storage/settings';
  import type { GlowNoteSettings } from '../../lib/types';

  let settings = $state<GlowNoteSettings | null>(null);
  let syncStatus = $state('');
  let importInput = $state<HTMLInputElement>(undefined!);

  async function load() {
    settings = await getSettings();
  }

  async function handleNoteModeChange(mode: 'popover' | 'sidepanel') {
    if (!settings) return;
    settings.noteMode = mode;
    await saveSettings(settings);
  }

  async function handleAutoSyncChange(enabled: boolean) {
    if (!settings) return;
    settings.autoSync = enabled;
    await saveSettings(settings);
  }

  async function authenticateDrive() {
    try {
      const token = await chrome.identity.getAuthToken({ interactive: true });
      if (token) {
        syncStatus = 'Authenticated successfully';
      }
    } catch (e) {
      syncStatus = `Auth failed: ${(e as Error).message}`;
    }
  }

  async function exportAllData() {
    const { db } = await import('../../lib/storage/db');
    const allAnnotations = await db.annotations.toArray();
    const blob = new Blob([JSON.stringify(allAnnotations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glownote-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData() {
    importInput.click();
  }

  async function handleImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const { db } = await import('../../lib/storage/db');
    const data = JSON.parse(text);
    await db.annotations.bulkPut(data);
    alert(`Imported ${data.length} annotations`);
  }

  async function clearAllData() {
    if (!confirm('Delete ALL annotations? This cannot be undone.')) return;
    const { db } = await import('../../lib/storage/db');
    await db.annotations.clear();
    alert('All annotations deleted');
  }

  load();
</script>

<main>
  <h1>GlowNote Settings</h1>

  {#if settings}
    <section>
      <h2>Highlight Categories</h2>
      <CategoryManager {settings} onSave={saveSettings} />
    </section>

    <section>
      <h2>Note Mode</h2>
      <label>
        <input
          type="radio"
          name="noteMode"
          value="popover"
          checked={settings.noteMode === 'popover'}
          onchange={() => handleNoteModeChange('popover')}
        />
        Inline popover
      </label>
      <label>
        <input
          type="radio"
          name="noteMode"
          value="sidepanel"
          checked={settings.noteMode === 'sidepanel'}
          onchange={() => handleNoteModeChange('sidepanel')}
        />
        Side panel only
      </label>
    </section>

    <section>
      <h2>Google Drive Sync</h2>
      <label>
        <input
          type="checkbox"
          checked={settings.autoSync}
          onchange={(e) => handleAutoSyncChange((e.target as HTMLInputElement).checked)}
        />
        Auto-sync after highlighting
      </label>
      <button onclick={authenticateDrive}>Authenticate with Google Drive</button>
      {#if syncStatus}
        <p class="status">{syncStatus}</p>
      {/if}
    </section>

    <section>
      <h2>Data Management</h2>
      <div class="data-buttons">
        <button onclick={exportAllData}>Export all data (JSON)</button>
        <button onclick={importData}>Import data</button>
        <button class="danger" onclick={clearAllData}>Clear all annotations</button>
      </div>
      <input bind:this={importInput} type="file" accept=".json" style="display:none" onchange={handleImportFile} />
    </section>

    <section>
      <h2>Keyboard Shortcuts</h2>
      <table>
        <thead>
          <tr><th>Shortcut</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr><td><kbd>Alt+G</kbd></td><td>Toggle side panel</td></tr>
          <tr><td><kbd>Alt+H</kbd></td><td>Highlight selection</td></tr>
          <tr><td><kbd>H</kbd></td><td>Highlight with current color</td></tr>
          <tr><td><kbd>1-6</kbd></td><td>Set color category</td></tr>
          <tr><td><kbd>N</kbd></td><td>Open note for last highlight</td></tr>
          <tr><td><kbd>E</kbd></td><td>Export page highlights</td></tr>
          <tr><td><kbd>/</kbd></td><td>Focus search</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Dismiss popover</td></tr>
        </tbody>
      </table>
      <p>
        <a href="chrome://extensions/shortcuts" target="_blank">
          Customize global shortcuts in Chrome settings
        </a>
      </p>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    color: #1a1a1a;
  }

  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 24px;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 24px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px;
  }

  section {
    background: white;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    cursor: pointer;
  }

  button {
    border: 1px solid #ddd;
    background: white;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
  }

  button:hover {
    background: #f0f0f0;
  }

  button.danger {
    color: #dc2626;
    border-color: #dc2626;
  }

  button.danger:hover {
    background: #fef2f2;
  }

  .data-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .status {
    margin-top: 8px;
    font-size: 12px;
    color: #666;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid #eee;
  }

  th {
    font-size: 11px;
    text-transform: uppercase;
    color: #888;
  }

  kbd {
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 12px;
    font-family: monospace;
  }

  a {
    color: #2563eb;
    font-size: 12px;
  }
</style>
