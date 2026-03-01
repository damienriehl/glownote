import Dexie, { type EntityTable } from 'dexie';
import type { Annotation, TextQuoteSelector, TextPositionSelector } from '../types';
import type { ColorId } from '../colors';

export const db = new Dexie('GlowNoteDB') as Dexie & {
  annotations: EntityTable<Annotation, 'id'>;
};

db.version(1).stores({
  annotations: 'id, pageUrl, colorId, createdAt',
});

/** Normalize URL by stripping hash fragments */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

/** Get all annotations for a page URL */
export async function getAnnotationsForPage(pageUrl: string): Promise<Annotation[]> {
  const normalized = normalizeUrl(pageUrl);
  return db.annotations
    .where('pageUrl')
    .equals(normalized)
    .sortBy('createdAt');
}

/** Save a new annotation */
export async function saveAnnotation(annotation: Annotation): Promise<void> {
  await db.annotations.put({
    ...annotation,
    pageUrl: normalizeUrl(annotation.pageUrl),
  });
}

/** Delete an annotation by ID */
export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id);
}

/** Update the note for an annotation */
export async function updateAnnotationNote(id: string, note: string): Promise<void> {
  await db.annotations.update(id, { note: note || null, updatedAt: Date.now() });
}

/** Update the color of an annotation */
export async function updateAnnotationColor(id: string, colorId: ColorId): Promise<void> {
  await db.annotations.update(id, { colorId, updatedAt: Date.now() });
}

/** Update the selectors and text of an annotation (for boundary resizing) */
export async function updateAnnotationSelectors(
  id: string,
  selectedText: string,
  quote: TextQuoteSelector,
  position: TextPositionSelector
): Promise<void> {
  await db.annotations.update(id, {
    selectedText,
    selectors: { quote, position },
    updatedAt: Date.now(),
  });
}

/** Search annotations by text content and notes */
export async function searchAnnotations(query: string): Promise<Annotation[]> {
  const q = query.toLowerCase();
  return db.annotations
    .filter(a =>
      a.selectedText.toLowerCase().includes(q) ||
      (a.note ?? '').toLowerCase().includes(q)
    )
    .toArray();
}

/** Get all annotations (for export) */
export async function getAllAnnotations(): Promise<Annotation[]> {
  return db.annotations.toArray();
}
