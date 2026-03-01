<script lang="ts">
  import { exportPageMarkdown } from '../lib/export/markdown';
  import { copyToClipboard, downloadAsFile } from '../lib/export/clipboard';
  import type { Annotation } from '../lib/types';

  interface Props {
    annotations: Annotation[];
    pageTitle: string;
    pageUrl: string;
  }

  let { annotations, pageTitle, pageUrl }: Props = $props();
  let copied = $state(false);

  async function handleCopy() {
    const md = exportPageMarkdown(annotations, pageTitle, pageUrl);
    const success = await copyToClipboard(md);
    if (success) {
      copied = true;
      setTimeout(() => copied = false, 2000);
    }
  }

  function handleDownload() {
    const md = exportPageMarkdown(annotations, pageTitle, pageUrl);
    const sanitizedTitle = pageTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 50).trim();
    const date = new Date().toISOString().slice(0, 10);
    downloadAsFile(md, `${sanitizedTitle || 'highlights'}_${date}.md`);
  }
</script>

<div class="export-controls">
  <button onclick={handleCopy} disabled={annotations.length === 0}>
    {copied ? 'Copied!' : 'Copy Markdown'}
  </button>
  <button onclick={handleDownload} disabled={annotations.length === 0}>
    Download .md
  </button>
</div>

<style>
  .export-controls {
    display: flex;
    gap: 8px;
  }

  button {
    flex: 1;
    border: 1px solid #ddd;
    background: white;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 500;
  }

  button:hover:not(:disabled) {
    background: #f0f0f0;
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
