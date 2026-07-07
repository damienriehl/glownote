/**
 * Component tests for the selection toolbar (`SelectionToolbar.svelte`).
 *
 * Mounts the REAL Svelte component (via @sveltejs/vite-plugin-svelte in the
 * Vitest config) and drives it through @testing-library/svelte. Covers the
 * color-button + keyboard contract and the selection-preservation hardening
 * (`onmousedown` preventDefault) that was part of the L5.6 toolbar/popover fix.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SelectionToolbar from '../../src/entrypoints/glownote.content/SelectionToolbar.svelte';
import { COLOR_IDS, DEFAULT_CATEGORIES } from '../../src/lib/colors';
import { makeRect } from './helpers';

function renderToolbar(props: Partial<Parameters<typeof SelectionToolbar>[1]> = {}) {
  const onHighlight = vi.fn();
  const onDismiss = vi.fn();
  render(SelectionToolbar, {
    rect: makeRect(),
    activeColorId: 'yellow',
    onHighlight,
    onDismiss,
    ...props,
  });
  return { onHighlight, onDismiss };
}

describe('SelectionToolbar.svelte', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders one button per color with the category label + shortcut in the title', () => {
    renderToolbar();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(COLOR_IDS.length);
    COLOR_IDS.forEach((id, i) => {
      const label = DEFAULT_CATEGORIES[id].label;
      // title is `${label} (${i + 1})`
      expect(screen.getByTitle(`${label} (${i + 1})`)).toBeTruthy();
    });
  });

  it('calls onHighlight exactly once with the clicked color', async () => {
    const { onHighlight } = renderToolbar();
    const blueLabel = DEFAULT_CATEGORIES.blue.label; // "Definition", index 2 → " (3)"
    const blueBtn = screen.getByTitle(`${blueLabel} (3)`);
    await fireEvent.click(blueBtn);
    expect(onHighlight).toHaveBeenCalledTimes(1);
    expect(onHighlight).toHaveBeenCalledWith('blue');
  });

  it('marks the active color button with the .active class', () => {
    renderToolbar({ activeColorId: 'green' });
    const greenBtn = screen.getByTitle(`${DEFAULT_CATEGORIES.green.label} (4)`);
    expect(greenBtn.classList.contains('active')).toBe(true);
    const yellowBtn = screen.getByTitle(`${DEFAULT_CATEGORIES.yellow.label} (1)`);
    expect(yellowBtn.classList.contains('active')).toBe(false);
  });

  it('maps number keys 1-6 to onHighlight with the corresponding color', async () => {
    const { onHighlight } = renderToolbar();
    const toolbar = document.querySelector('.toolbar') as HTMLElement;
    await fireEvent.keyDown(toolbar, { key: '3' });
    expect(onHighlight).toHaveBeenCalledWith(COLOR_IDS[2]); // blue
    await fireEvent.keyDown(toolbar, { key: '6' });
    expect(onHighlight).toHaveBeenCalledWith(COLOR_IDS[5]); // purple
  });

  it('dismisses on Escape', async () => {
    const { onDismiss } = renderToolbar();
    const toolbar = document.querySelector('.toolbar') as HTMLElement;
    await fireEvent.keyDown(toolbar, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('prevents default on mousedown so the page selection is preserved (L5.6 hardening)', () => {
    renderToolbar();
    const toolbar = document.querySelector('.toolbar') as HTMLElement;
    // A real mousedown inside the toolbar would otherwise collapse the page
    // selection before onHighlight can read it.
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    toolbar.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
