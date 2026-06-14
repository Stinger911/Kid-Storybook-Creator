import { describe, it, expect } from 'vitest';
import { generateId, getVectorOutlineFallback, STARTER_TEMPLATES } from './generators';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 200 }, generateId));
    expect(ids.size).toBe(200);
  });
});

describe('getVectorOutlineFallback', () => {
  const knownWords = ['ROCKET', 'MOON', 'STARS', 'OCEAN', 'SHELL', 'WHALE'];

  it.each(knownWords)('returns an SVG string for known word %s', (word) => {
    const svg = getVectorOutlineFallback(word);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('normalises input to uppercase', () => {
    expect(getVectorOutlineFallback('rocket')).toBe(getVectorOutlineFallback('ROCKET'));
    expect(getVectorOutlineFallback('Moon')).toBe(getVectorOutlineFallback('MOON'));
  });

  it('returns fallback SVG for an unknown word', () => {
    const svg = getVectorOutlineFallback('XYZUNKNOWN');
    expect(svg).toContain('<svg');
    expect(svg).toContain('rect');
    expect(svg).toContain('circle');
  });
});

describe('STARTER_TEMPLATES', () => {
  it('exports at least two templates', () => {
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(2);
  });

  it('each template has required KidBook fields', () => {
    for (const book of STARTER_TEMPLATES) {
      expect(book.id).toBeTruthy();
      expect(book.title).toBeTruthy();
      expect(book.author).toBeTruthy();
      expect(book.themeColor).toBeTruthy();
      expect(Array.isArray(book.pages)).toBe(true);
      expect(book.pages.length).toBeGreaterThan(0);
    }
  });

  it('each page has required BookPage fields', () => {
    const validTypes = ['coloring', 'handwriting', 'mixed', 'story'];
    const validLayouts = [
      'coloring-top-writing-bottom',
      'coloring-only',
      'writing-only',
      'story-left-coloring-right',
    ];

    for (const book of STARTER_TEMPLATES) {
      for (const page of book.pages) {
        expect(page.id).toBeTruthy();
        expect(typeof page.pageNumber).toBe('number');
        expect(validTypes).toContain(page.type);
        expect(validLayouts).toContain(page.layout);
      }
    }
  });

  it('page numbers are sequential starting from 1', () => {
    for (const book of STARTER_TEMPLATES) {
      book.pages.forEach((page, index) => {
        expect(page.pageNumber).toBe(index + 1);
      });
    }
  });
});
