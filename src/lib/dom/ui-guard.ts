/**
 * Guards for events that originate inside GlowNote's own in-page UI.
 *
 * GlowNote renders its selection toolbar and note popover inside closed-ish
 * shadow roots hosted by custom elements (`<glownote-selection-toolbar>` /
 * `<glownote-popover>`). Document-level pointer handlers must be able to tell
 * "the user clicked our own UI" from "the user clicked the page", otherwise
 * clicking a toolbar color button re-enters the mouseup handler and re-shows
 * the toolbar on top of the freshly-opened popover — the L5.6 "not really
 * working" composedPath race.
 *
 * `Event.composedPath()` pierces shadow boundaries and lists the shadow host,
 * even though `event.target` is retargeted to the host at the document level.
 * It MUST be read synchronously in the handler (before any setTimeout), because
 * the path is only populated while the event is being dispatched.
 */

/** Shadow-host tag names for GlowNote's own in-page UI. */
export const GLOWNOTE_UI_HOSTS = [
  'glownote-selection-toolbar',
  'glownote-popover',
] as const;

export type GlowNoteUiHost = (typeof GLOWNOTE_UI_HOSTS)[number];

/** True when `path` contains a host element whose tag is in `hosts`. */
function pathHitsHost(path: EventTarget[], hosts: readonly string[]): boolean {
  return path.some(
    (el) =>
      el instanceof HTMLElement && hosts.includes(el.tagName.toLowerCase())
  );
}

/**
 * True when the event originated inside any of GlowNote's shadow UIs
 * (selection toolbar or note popover). Read the event synchronously.
 */
export function isInsideGlowNoteUi(e: Event): boolean {
  return pathHitsHost(e.composedPath(), GLOWNOTE_UI_HOSTS);
}

/**
 * True when the event originated inside the selection toolbar specifically.
 * Used by the mousedown handler, which only wants to avoid dismissing the
 * toolbar when the user is clicking a toolbar button (the popover manages its
 * own dismissal).
 */
export function isInsideSelectionToolbar(e: Event): boolean {
  return pathHitsHost(e.composedPath(), ['glownote-selection-toolbar']);
}
