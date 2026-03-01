import type { ColorId } from './colors';

/** W3C Web Annotation TextQuoteSelector */
export interface TextQuoteSelector {
  type: 'TextQuoteSelector';
  exact: string;
  prefix: string;
  suffix: string;
}

/** W3C Web Annotation TextPositionSelector */
export interface TextPositionSelector {
  type: 'TextPositionSelector';
  start: number;
  end: number;
}

/** A single annotation stored in IndexedDB */
export interface Annotation {
  id: string;
  pageUrl: string;
  pageTitle: string;
  selectedText: string;
  note: string | null;
  colorId: ColorId;
  selectors: {
    quote: TextQuoteSelector;
    position: TextPositionSelector;
  };
  createdAt: number;
  updatedAt: number;
}

/** User settings synced via chrome.storage.sync */
export interface GlowNoteSettings {
  noteMode: 'popover' | 'sidepanel';
  autoSync: boolean;
  activeColorId: ColorId;
  categoryLabels: Record<ColorId, string>;
}

/** Messages sent between extension components */
export type GlowNoteMessage =
  | { type: 'HIGHLIGHT_SELECTION'; colorId: ColorId }
  | { type: 'REMOVE_HIGHLIGHT'; annotationId: string }
  | { type: 'CHANGE_HIGHLIGHT_COLOR'; annotationId: string; colorId: ColorId }
  | { type: 'SCROLL_TO_HIGHLIGHT'; annotationId: string }
  | { type: 'OPEN_NOTE'; annotationId: string }
  | { type: 'EXPORT_PAGE' }
  | { type: 'ANNOTATIONS_UPDATED' }
  | { type: 'CONTEXT_MENU_HIGHLIGHT'; colorId: ColorId }
  | { type: 'GET_ANNOTATIONS'; pageUrl: string }
  | { type: 'SET_ACTIVE_COLOR'; colorId: ColorId }
  | { type: 'OPEN_PDF_VIEWER'; pdfUrl: string };
