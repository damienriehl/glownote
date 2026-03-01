import type { ColorId } from './colors';
import { colorIdFromNumber } from './colors';

export interface KeyboardAction {
  type: 'highlight' | 'setColor' | 'openNote' | 'export' | 'search' | 'dismiss';
  colorId?: ColorId;
}

/** Check if keyboard events should be ignored (user is typing in a form field) */
function isTypingContext(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

/** Parse a keyboard event into a GlowNote action */
export function parseKeyAction(e: KeyboardEvent): KeyboardAction | null {
  // Skip if in a typing context or modifier keys held (except for global shortcuts)
  if (isTypingContext(e)) return null;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;

  const key = e.key.toLowerCase();

  if (key === 'h') return { type: 'highlight' };
  if (key === 'n') return { type: 'openNote' };
  if (key === 'e') return { type: 'export' };
  if (key === '/') return { type: 'search' };
  if (key === 'escape') return { type: 'dismiss' };

  // Number keys 1-6 for color selection
  const num = parseInt(e.key, 10);
  const colorId = colorIdFromNumber(num);
  if (colorId) return { type: 'setColor', colorId };

  return null;
}
