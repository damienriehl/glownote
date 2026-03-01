import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  vite: () => ({
    esbuild: {
      charset: 'ascii',
    },
  }),
  manifest: {
    name: 'GlowNote',
    description: 'Highlight text in semantic colors, attach notes, export AI-ingestable markdown',
    permissions: [
      'sidePanel',
      'activeTab',
      'contextMenus',
      'storage',
      'unlimitedStorage',
      'identity',
    ],
    commands: {
      _execute_side_panel: {
        suggested_key: { default: 'Alt+G' },
        description: 'Toggle GlowNote side panel',
      },
      'highlight-selection': {
        suggested_key: { default: 'Alt+H' },
        description: 'Highlight selected text',
      },
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    web_accessible_resources: [
      {
        resources: ['pdf.worker.min.mjs'],
        matches: ['<all_urls>'],
      },
    ],
  },
  runner: {
    binaries: {
      chrome: '/usr/bin/google-chrome-stable',
    },
  },
});
