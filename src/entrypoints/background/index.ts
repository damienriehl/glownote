import { DEFAULT_CATEGORIES, COLOR_IDS, type ColorId } from '../../lib/colors';
import { getSettings, onSettingsChange } from '../../lib/storage/settings';
import { getAnnotationsForPage } from '../../lib/storage/db';
import { exportPageMarkdown } from '../../lib/export/markdown';
import { getAuthToken, uploadMarkdown, generateFilename } from '../../lib/sync/gdrive';
import type { GlowNoteMessage } from '../../lib/types';

export default defineBackground(() => {
  // ── Context Menus ──
  function createContextMenus(labels?: Record<ColorId, string>) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'glownote-parent',
        title: 'GlowNote: Highlight as...',
        contexts: ['selection'],
      });

      for (const colorId of COLOR_IDS) {
        const label = labels?.[colorId] ?? DEFAULT_CATEGORIES[colorId].label;
        chrome.contextMenus.create({
          id: `glownote-highlight-${colorId}`,
          parentId: 'glownote-parent',
          title: label,
          contexts: ['selection'],
        });
      }

      // PDF viewer — right-click a PDF link
      chrome.contextMenus.create({
        id: 'glownote-open-pdf-link',
        title: 'Open in GlowNote PDF Viewer',
        contexts: ['link'],
        targetUrlPatterns: ['*://*/*.pdf', '*://*/*.pdf?*'],
      });

      // PDF viewer — right-click on a PDF page itself
      chrome.contextMenus.create({
        id: 'glownote-open-pdf-page',
        title: 'Open this PDF in GlowNote Viewer',
        contexts: ['page'],
        documentUrlPatterns: ['*://*/*.pdf', '*://*/*.pdf?*'],
      });
    });
  }

  chrome.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    createContextMenus(settings.categoryLabels);
  });

  // Rebuild context menus when settings change
  onSettingsChange((settings) => {
    createContextMenus(settings.categoryLabels);
  });

  // ── Context Menu Click Handler ──
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    // PDF link context menu
    if (info.menuItemId === 'glownote-open-pdf-link' && info.linkUrl) {
      const viewerUrl = chrome.runtime.getURL(`pdf-viewer.html?url=${encodeURIComponent(info.linkUrl)}`);
      chrome.tabs.create({ url: viewerUrl });
      return;
    }

    // PDF page context menu (when already viewing a PDF)
    if (info.menuItemId === 'glownote-open-pdf-page' && info.pageUrl) {
      const viewerUrl = chrome.runtime.getURL(`pdf-viewer.html?url=${encodeURIComponent(info.pageUrl)}`);
      chrome.tabs.create({ url: viewerUrl });
      return;
    }

    const match = String(info.menuItemId).match(/^glownote-highlight-(.+)$/);
    if (match) {
      const colorId = match[1] as ColorId;
      chrome.tabs.sendMessage(tab.id, {
        type: 'CONTEXT_MENU_HIGHLIGHT',
        colorId,
      } satisfies GlowNoteMessage);
    }
  });

  // ── Chrome Commands ──
  chrome.commands.onCommand.addListener(async (command, tab) => {
    if (!tab?.id) return;

    if (command === 'highlight-selection') {
      const settings = await getSettings();
      chrome.tabs.sendMessage(tab.id, {
        type: 'HIGHLIGHT_SELECTION',
        colorId: settings.activeColorId,
      } satisfies GlowNoteMessage);
    }
  });

  // ── Message Handling (from content script / side panel) ──
  chrome.runtime.onMessage.addListener((msg: GlowNoteMessage, sender, sendResponse) => {
    if (msg.type === 'ANNOTATIONS_UPDATED') {
      // Relay to side panel (if open)
      chrome.runtime.sendMessage(msg).catch(() => {});

      // Auto-sync if enabled
      handleAutoSync(sender.tab).catch(() => {});
    }

    // Open PDF in GlowNote viewer (called from content script banner)
    if (msg.type === 'OPEN_PDF_VIEWER') {
      const viewerUrl = chrome.runtime.getURL(`pdf-viewer.html?url=${encodeURIComponent(msg.pdfUrl)}`);
      chrome.tabs.create({ url: viewerUrl });
    }

    return false;
  });

  // ── Auto Sync ──
  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function handleAutoSync(tab?: chrome.tabs.Tab) {
    const settings = await getSettings();
    if (!settings.autoSync) return;

    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      try {
        if (!tab?.url || !tab?.title) return;
        const annotations = await getAnnotationsForPage(tab.url);
        if (annotations.length === 0) return;

        const token = await getAuthToken(false);
        const md = exportPageMarkdown(annotations, tab.title, tab.url, settings.categoryLabels);
        const filename = generateFilename(tab.title);
        await uploadMarkdown(token, filename, md);
        console.log('GlowNote: Auto-synced to Google Drive');
      } catch (e) {
        console.warn('GlowNote: Auto-sync failed', e);
      }
    }, 30_000);
  }

  console.log('GlowNote background service worker started');
});
