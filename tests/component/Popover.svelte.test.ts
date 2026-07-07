/**
 * Component tests for the note popover (`Popover.svelte`).
 *
 * Mounts the REAL Svelte component and drives the note-editing contract:
 * showing the existing note, saving on blur/Ctrl+Enter (only when changed),
 * color switching, delete/close, and the edit-mode "Update Boundaries" affordance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Popover from '../../src/entrypoints/glownote.content/Popover.svelte';
import { DEFAULT_CATEGORIES } from '../../src/lib/colors';
import type { Annotation } from '../../src/lib/types';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'ann-1',
    pageUrl: 'https://example.com/guide',
    pageTitle: 'Guide',
    selectedText: 'voir dire process',
    note: 'existing note',
    colorId: 'yellow',
    selectors: {
      quote: { type: 'TextQuoteSelector', exact: 'voir dire process', prefix: '', suffix: '' },
      position: { type: 'TextPositionSelector', start: 4, end: 21 },
    },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 200, bottom: 220, left: 100, right: 300,
    width: 200, height: 20, x: 100, y: 200,
    toJSON: () => ({}), ...overrides,
  } as DOMRect;
}

function renderPopover(props: Record<string, unknown> = {}) {
  const handlers = {
    onSaveNote: vi.fn(),
    onChangeColor: vi.fn(),
    onDelete: vi.fn(),
    onResize: vi.fn(),
    onClose: vi.fn(),
  };
  render(Popover, {
    annotation: makeAnnotation(),
    rect: makeRect(),
    ...handlers,
    ...props,
  });
  return handlers;
}

describe('Popover.svelte', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the existing note text in the textarea', () => {
    renderPopover();
    const textarea = screen.getByPlaceholderText('Add a note...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('existing note');
  });

  it('saves the note on blur when it changed', async () => {
    const { onSaveNote } = renderPopover();
    const textarea = screen.getByPlaceholderText('Add a note...') as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: 'updated note' } });
    await fireEvent.blur(textarea);
    expect(onSaveNote).toHaveBeenCalledTimes(1);
    expect(onSaveNote).toHaveBeenCalledWith('updated note');
  });

  it('does NOT save on blur when the note is unchanged', async () => {
    const { onSaveNote } = renderPopover();
    const textarea = screen.getByPlaceholderText('Add a note...') as HTMLTextAreaElement;
    await fireEvent.blur(textarea);
    expect(onSaveNote).not.toHaveBeenCalled();
  });

  it('saves the note on Ctrl+Enter', async () => {
    const { onSaveNote } = renderPopover();
    const textarea = screen.getByPlaceholderText('Add a note...') as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: 'quicksave' } });
    await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onSaveNote).toHaveBeenCalledWith('quicksave');
  });

  it('closes on Escape', async () => {
    const { onClose } = renderPopover();
    const popover = document.querySelector('.popover') as HTMLElement;
    await fireEvent.keyDown(popover, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks the annotation color button active and switches color on click', async () => {
    const { onChangeColor } = renderPopover({ annotation: makeAnnotation({ colorId: 'pink' }) });
    const pinkBtn = screen.getByTitle(DEFAULT_CATEGORIES.pink.label);
    expect(pinkBtn.classList.contains('active')).toBe(true);
    const blueBtn = screen.getByTitle(DEFAULT_CATEGORIES.blue.label);
    await fireEvent.click(blueBtn);
    expect(onChangeColor).toHaveBeenCalledWith('blue');
  });

  it('fires onDelete and onClose from the action buttons', async () => {
    const { onDelete, onClose } = renderPopover();
    await fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('only shows the "Update Boundaries" resize affordance in edit mode', async () => {
    const { onResize } = renderPopover({ editMode: false });
    expect(screen.queryByText('Update Boundaries')).toBeNull();

    render(Popover, {
      annotation: makeAnnotation(),
      rect: makeRect(),
      editMode: true,
      onSaveNote: vi.fn(),
      onChangeColor: vi.fn(),
      onDelete: vi.fn(),
      onResize,
      onClose: vi.fn(),
    });
    const resizeBtn = screen.getByText('Update Boundaries');
    await fireEvent.click(resizeBtn);
    expect(onResize).toHaveBeenCalledTimes(1);
  });
});
