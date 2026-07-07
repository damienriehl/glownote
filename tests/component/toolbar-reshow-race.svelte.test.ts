/**
 * Regression test for the L5.6 "toolbar re-shows over the popover" composedPath
 * race — at the component level.
 *
 * Root cause (see docs/solutions + STATUS-lane-5-browser): the content script's
 * document `mouseup` handler re-showed the selection toolbar. When the user
 * clicked a toolbar color button, that click's mouseup bubbled to the document
 * handler, which re-showed the toolbar on top of the note popover that
 * `onHighlight` had just opened. The fix guards the handler with
 * `isInsideGlowNoteUi(e)` — read synchronously — which uses `composedPath()` to
 * detect that the event originated inside GlowNote's own shadow-hosted UI.
 *
 * This test reproduces the exact geometry: it mounts the REAL toolbar component
 * inside a REAL `<glownote-selection-toolbar>` shadow host, wires up the REAL
 * guard as a document `mouseup` listener, and asserts that clicking a color
 * button does NOT trip the "re-show" path — while a click on the plain page
 * still does (negative control). If the guard regresses or the host tag name
 * drifts, this test fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import SelectionToolbar from '../../src/entrypoints/glownote.content/SelectionToolbar.svelte';
import {
  isInsideGlowNoteUi,
  isInsideSelectionToolbar,
  GLOWNOTE_UI_HOSTS,
} from '../../src/lib/dom/ui-guard';
import { makeRect } from './helpers';

describe('composedPath guard (unit)', () => {
  it('flags events whose composedPath includes a GlowNote host', () => {
    for (const host of GLOWNOTE_UI_HOSTS) {
      const el = document.createElement(host);
      const fake = { composedPath: () => [document.createElement('button'), el, document.body] } as unknown as Event;
      expect(isInsideGlowNoteUi(fake)).toBe(true);
    }
  });

  it('does not flag events from plain page elements', () => {
    const fake = { composedPath: () => [document.createElement('button'), document.body] } as unknown as Event;
    expect(isInsideGlowNoteUi(fake)).toBe(false);
  });

  it('isInsideSelectionToolbar matches only the toolbar host, not the popover', () => {
    const toolbar = document.createElement('glownote-selection-toolbar');
    const popover = document.createElement('glownote-popover');
    const inToolbar = { composedPath: () => [toolbar, document.body] } as unknown as Event;
    const inPopover = { composedPath: () => [popover, document.body] } as unknown as Event;
    expect(isInsideSelectionToolbar(inToolbar)).toBe(true);
    expect(isInsideSelectionToolbar(inPopover)).toBe(false);
    // ...but the popover IS still "GlowNote UI" for the broader guard.
    expect(isInsideGlowNoteUi(inPopover)).toBe(true);
  });
});

describe('toolbar re-show race — real shadow host', () => {
  let host: HTMLElement;
  let component: ReturnType<typeof mount> | null = null;
  let onMouseUp: ((e: MouseEvent) => void) | null = null;
  let onHighlight: ReturnType<typeof vi.fn>;
  let reShowToolbar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onHighlight = vi.fn();
    // Stands in for showSelectionToolbar(): if this fires after a color click,
    // the toolbar would re-appear over the popover — the bug.
    reShowToolbar = vi.fn();

    // Real custom-element host + shadow root, mirroring createShadowRootUi().
    host = document.createElement(GLOWNOTE_UI_HOSTS[0]); // 'glownote-selection-toolbar'
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadow.appendChild(container);

    component = mount(SelectionToolbar, {
      target: container,
      props: {
        rect: makeRect(),
        activeColorId: 'yellow',
        onHighlight,
        onDismiss: vi.fn(),
      },
    });

    // The REAL content-script mouseup handler, distilled: read composedPath
    // synchronously, bail if the event came from our own UI, else re-show.
    onMouseUp = (e: MouseEvent) => {
      if (isInsideGlowNoteUi(e)) return;
      reShowToolbar();
    };
    document.addEventListener('mouseup', onMouseUp);
  });

  afterEach(() => {
    if (onMouseUp) document.removeEventListener('mouseup', onMouseUp);
    if (component) unmount(component);
    host.remove();
  });

  it('clicking a color button fires onHighlight once and does NOT re-show the toolbar', async () => {
    const shadow = host.shadowRoot!;
    const colorBtn = shadow.querySelector('.color-btn') as HTMLButtonElement;
    expect(colorBtn).toBeTruthy();

    // A real user click dispatches mousedown → mouseup → click, all of which
    // bubble (composed) out to the document. The mouseup is the dangerous one.
    colorBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
    colorBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
    colorBtn.click();

    expect(onHighlight).toHaveBeenCalledTimes(1);
    expect(onHighlight).toHaveBeenCalledWith('yellow');
    // The guard suppressed the re-show → toolbar would NOT cover the popover.
    expect(reShowToolbar).not.toHaveBeenCalled();
  });

  it('negative control: a mouseup on the plain page DOES reach the re-show path', () => {
    const pageEl = document.createElement('p');
    document.body.appendChild(pageEl);
    pageEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
    expect(reShowToolbar).toHaveBeenCalledTimes(1);
    pageEl.remove();
  });
});
