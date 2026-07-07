/** Shared fixtures for the `.svelte` component tests. */
import type { Annotation } from '../../src/lib/types';

/** Minimal DOMRect-like object for the toolbar/popover positioning math. */
export function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    top: 200,
    bottom: 220,
    left: 100,
    right: 300,
    width: 200,
    height: 20,
    x: 100,
    y: 200,
    toJSON: () => ({}),
    ...overrides,
  } as DOMRect;
}

/** A fully-formed annotation for the popover tests. */
export function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
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
