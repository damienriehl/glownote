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
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
    action: {
      default_title: 'GlowNote — toggle side panel (Alt+G)',
      default_icon: {
        16: '/icon/16.png',
        32: '/icon/32.png',
        48: '/icon/48.png',
        128: '/icon/128.png',
      },
    },
    // v0.1.0 ships pure local-first: no network/identity permissions.
    // (Google Drive export is code-complete but gated off until an OAuth
    // client_id + privacy policy are in place — see docs/store/SUBMISSION.md.)
    permissions: [
      'sidePanel',
      'activeTab',
      'contextMenus',
      'storage',
      'unlimitedStorage',
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
