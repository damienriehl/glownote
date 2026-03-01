import type { GlowNoteMessage } from './types';

/** Send a message to the background service worker or side panel */
export function sendMessage(message: GlowNoteMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

/** Send a message to a specific tab's content script */
export function sendTabMessage(tabId: number, message: GlowNoteMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

/** Listen for messages with type safety */
export function onMessage(
  handler: (message: GlowNoteMessage, sender: chrome.runtime.MessageSender) => void | Promise<unknown>
): void {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const result = handler(msg as GlowNoteMessage, sender);
    if (result instanceof Promise) {
      result.then(sendResponse).catch(() => sendResponse(undefined));
      return true; // Keep message channel open for async response
    }
  });
}
