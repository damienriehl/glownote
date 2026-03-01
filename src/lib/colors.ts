export type ColorId = 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';

export interface ColorCategory {
  id: ColorId;
  label: string;
  color: string;
  /** Lighter shade for highlight background */
  bgColor: string;
}

export const COLOR_IDS: ColorId[] = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];

export const DEFAULT_CATEGORIES: Record<ColorId, ColorCategory> = {
  yellow: { id: 'yellow', label: 'Highlight', color: '#facc15', bgColor: 'rgba(250, 204, 21, 0.35)' },
  pink:   { id: 'pink',   label: 'Important', color: '#f472b6', bgColor: 'rgba(244, 114, 182, 0.35)' },
  blue:   { id: 'blue',   label: 'Definition', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.35)' },
  green:  { id: 'green',  label: 'Agree', color: '#4ade80', bgColor: 'rgba(74, 222, 128, 0.35)' },
  orange: { id: 'orange', label: 'Question', color: '#fb923c', bgColor: 'rgba(251, 146, 60, 0.35)' },
  purple: { id: 'purple', label: 'Disagree', color: '#c084fc', bgColor: 'rgba(192, 132, 252, 0.35)' },
};

/** Generate CSS ::highlight() rules for all colors */
export function generateHighlightCSS(labels?: Record<ColorId, string>): string {
  return COLOR_IDS.map(id => {
    const cat = DEFAULT_CATEGORIES[id];
    return `::highlight(glownote-${id}) { background-color: ${cat.bgColor}; }`;
  }).join('\n');
}

/** Get category with optional custom label override */
export function getCategory(id: ColorId, customLabels?: Record<ColorId, string>): ColorCategory {
  const cat = DEFAULT_CATEGORIES[id];
  if (customLabels?.[id]) {
    return { ...cat, label: customLabels[id] };
  }
  return cat;
}

/** Map number keys 1-6 to color IDs */
export function colorIdFromNumber(n: number): ColorId | null {
  if (n >= 1 && n <= 6) return COLOR_IDS[n - 1];
  return null;
}
