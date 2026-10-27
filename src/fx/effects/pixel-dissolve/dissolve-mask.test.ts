import { describe, expect, it } from 'vitest';

import { dissolveCells, dissolveLevel, dissolveTile } from './dissolve-mask';

const count = (cells: boolean[]) => cells.filter(Boolean).length;

describe('dissolveCells', () => {
  it('уровень 0 — ничего, order² — вся плитка', () => {
    expect(count(dissolveCells(0, 4))).toBe(0);
    expect(count(dissolveCells(16, 4))).toBe(16);
  });

  it('на уровне k открыто ровно k клеток, и каждый уровень — надмножество прошлого', () => {
    for (let level = 1; level <= 64; level++) {
      const previous = dissolveCells(level - 1, 8);
      const current = dissolveCells(level, 8);

      expect(count(current)).toBe(level);
      previous.forEach((open, index) => {
        if (open) expect(current[index]).toBe(true);
      });
    }
  });

  it('первые клетки разнесены, а не идут подряд (узор Байера)', () => {
    const cells = dissolveCells(4, 4);
    const open = cells.flatMap((isOpen, index) => (isOpen ? [index] : []));

    // На уровне 4 из 16 — по одной клетке в каждом квадранте 2×2 плитки
    const quadrants = new Set(open.map((index) => `${index % 4 >= 2}:${index >= 8}`));

    expect(quadrants.size).toBe(4);
  });
});

describe('dissolveLevel', () => {
  it('прогресс → уровень, с ограничением 0…1', () => {
    expect(dissolveLevel(0, 4)).toBe(0);
    expect(dissolveLevel(0.5, 4)).toBe(8);
    expect(dissolveLevel(2, 4)).toBe(16);
    expect(dissolveLevel(-1, 4)).toBe(0);
  });
});

describe('dissolveTile', () => {
  it('SVG-плитка размера order × cell с квадратом на каждую открытую клетку', () => {
    const tile = decodeURIComponent(dissolveTile(3, 4, 6));

    expect(tile).toContain('width="24" height="24"');
    expect(tile.match(/h6v6h-6z/g)).toHaveLength(3);
  });

  it('уровень 0 — пустая плитка', () => {
    expect(decodeURIComponent(dissolveTile(0, 4, 6))).not.toContain('<path');
  });
});
