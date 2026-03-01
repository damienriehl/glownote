import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES, COLOR_IDS, colorIdFromNumber, getCategory, generateHighlightCSS } from '../../src/lib/colors';

describe('colors', () => {
  it('should have 6 color categories', () => {
    expect(COLOR_IDS).toHaveLength(6);
    expect(Object.keys(DEFAULT_CATEGORIES)).toHaveLength(6);
  });

  it('should map all COLOR_IDS to categories', () => {
    for (const id of COLOR_IDS) {
      expect(DEFAULT_CATEGORIES[id]).toBeDefined();
      expect(DEFAULT_CATEGORIES[id].id).toBe(id);
      expect(DEFAULT_CATEGORIES[id].label).toBeTruthy();
      expect(DEFAULT_CATEGORIES[id].color).toBeTruthy();
      expect(DEFAULT_CATEGORIES[id].bgColor).toBeTruthy();
    }
  });

  it('should map number keys 1-6 to color IDs', () => {
    expect(colorIdFromNumber(1)).toBe('yellow');
    expect(colorIdFromNumber(2)).toBe('pink');
    expect(colorIdFromNumber(3)).toBe('blue');
    expect(colorIdFromNumber(4)).toBe('green');
    expect(colorIdFromNumber(5)).toBe('orange');
    expect(colorIdFromNumber(6)).toBe('purple');
  });

  it('should return null for out-of-range numbers', () => {
    expect(colorIdFromNumber(0)).toBeNull();
    expect(colorIdFromNumber(7)).toBeNull();
    expect(colorIdFromNumber(-1)).toBeNull();
  });

  it('should override label with custom labels', () => {
    const cat = getCategory('yellow', { yellow: 'Key Finding' } as any);
    expect(cat.label).toBe('Key Finding');
    expect(cat.color).toBe(DEFAULT_CATEGORIES.yellow.color);
  });

  it('should use default label when no custom label', () => {
    const cat = getCategory('yellow');
    expect(cat.label).toBe('Highlight');
  });

  it('should generate valid CSS for all highlight colors', () => {
    const css = generateHighlightCSS();
    for (const id of COLOR_IDS) {
      expect(css).toContain(`::highlight(glownote-${id})`);
      expect(css).toContain('background-color');
    }
  });
});
