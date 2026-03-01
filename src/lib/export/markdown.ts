import type { Annotation } from '../types';
import { DEFAULT_CATEGORIES, type ColorId } from '../colors';

/** Generate YAML front matter + highlight blocks */
export function exportPageMarkdown(
  annotations: Annotation[],
  pageTitle: string,
  pageUrl: string,
  customLabels?: Record<ColorId, string>
): string {
  if (annotations.length === 0) {
    return `---\nsource_url: "${pageUrl}"\ntitle: "${escapeYaml(pageTitle)}"\nhighlight_count: 0\n---\n\nNo highlights on this page.\n`;
  }

  // Sort by document position
  const sorted = [...annotations].sort(
    (a, b) => a.selectors.position.start - b.selectors.position.start
  );

  const capturedAt = new Date().toISOString();

  // YAML front matter
  let md = `---\nsource_url: "${pageUrl}"\ntitle: "${escapeYaml(pageTitle)}"\ncaptured_at: "${capturedAt}"\ndoc_type: "web_highlight"\nhighlight_count: ${sorted.length}\n---\n\n`;

  // Highlight blocks
  for (const annotation of sorted) {
    const label = customLabels?.[annotation.colorId]
      ?? DEFAULT_CATEGORIES[annotation.colorId]?.label
      ?? annotation.colorId;

    md += `> [!highlight-${annotation.colorId}] ${label}\n`;
    md += `> "${escapeBlockquote(annotation.selectedText)}"\n`;

    if (annotation.note) {
      md += `>\n> **Note:** ${escapeBlockquote(annotation.note)}\n`;
    }

    md += `>\n> *Location: chars ${annotation.selectors.position.start}-${annotation.selectors.position.end}*\n\n`;
  }

  return md;
}

/** Escape special YAML characters */
function escapeYaml(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

/** Escape text for blockquote lines */
function escapeBlockquote(s: string): string {
  return s.replace(/\n/g, '\n> ');
}
