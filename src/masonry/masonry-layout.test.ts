import { describe, expect, it } from 'vitest';

import { masonryColumns, masonryLayout } from './masonry-layout';

describe('masonryColumns', () => {
  it('столько колонок, сколько влезает с промежутками; не меньше одной', () => {
    expect(masonryColumns(700, 220, 12)).toBe(3);
    expect(masonryColumns(460, 220, 12)).toBe(2);
    expect(masonryColumns(100, 220, 12)).toBe(1);
  });
});

describe('masonryLayout', () => {
  it('плитка встаёт в самую короткую колонку, при равенстве — в левую', () => {
    const { positions, height } = masonryLayout([100, 50, 80, 30], 2, 200, 10);

    expect(positions).toEqual([
      { x: 0, y: 0 },
      { x: 210, y: 0 },
      // Правая колонка короче (50 + 10 < 100 + 10)
      { x: 210, y: 60 },
      { x: 0, y: 110 },
    ]);
    expect(height).toBe(140);
  });

  it('первый ряд — слева направо в порядке разметки', () => {
    const { positions } = masonryLayout([40, 90, 60], 3, 100, 8);

    expect(positions.map((position) => position.y)).toEqual([0, 0, 0]);
    expect(positions.map((position) => position.x)).toEqual([0, 108, 216]);
  });

  it('без плиток высота ноль', () => {
    expect(masonryLayout([], 3, 100, 8)).toEqual({ positions: [], height: 0 });
  });
});
