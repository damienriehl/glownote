import type { GlowNoteSettings } from '../types';
import { DEFAULT_CATEGORIES, type ColorId } from '../colors';

const SETTINGS_KEY = 'glownote_settings';

function defaultSettings(): GlowNoteSettings {
  const labels = {} as Record<ColorId, string>;
  for (const [id, cat] of Object.entries(DEFAULT_CATEGORIES)) {
    labels[id as ColorId] = cat.label;
  }
  return {
    noteMode: 'popover',
    autoSync: false,
    activeColorId: 'yellow',
    categoryLabels: labels,
  };
}

/** Get settings from chrome.storage.sync */
export async function getSettings(): Promise<GlowNoteSettings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  if (result[SETTINGS_KEY]) {
    return { ...defaultSettings(), ...result[SETTINGS_KEY] };
  }
  return defaultSettings();
}

/** Save settings to chrome.storage.sync */
export async function saveSettings(settings: GlowNoteSettings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

/** Listen for settings changes */
export function onSettingsChange(callback: (settings: GlowNoteSettings) => void): void {
  chrome.storage.sync.onChanged.addListener((changes) => {
    if (changes[SETTINGS_KEY]?.newValue) {
      callback({ ...defaultSettings(), ...changes[SETTINGS_KEY].newValue });
    }
  });
}
