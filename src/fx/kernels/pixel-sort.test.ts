import { describe, expect, it } from 'vitest';

import { pixelSort } from './pixel-sort';
import { grays } from './test-helpers';

const reds = (data: Uint8ClampedArray) => [...data].filter((_, i) => i % 4 === 0);
const horizontal = { low: 0.2, high: 0.9, vertical: false };

describe('pixelSort', () => {
  it('отрезок в диапазоне сортируется по яркости, края вне диапазона на месте', () => {
    expect(reds(pixelSort(grays([0, 200, 100, 150, 255]), 5, 1, horizontal))).toEqual([
      0, 100, 150, 200, 255,
    ]);
  });

  it('пиксель вне диапазона разрывает отрезок', () => {
    expect(reds(pixelSort(grays([200, 100, 0, 180, 120]), 5, 1, horizontal))).toEqual([
      100, 200, 0, 120, 180,
    ]);
  });

  it('по столбцам', () => {
    const out = pixelSort(grays([200, 100]), 1, 2, { low: 0, high: 1, vertical: true });

    expect(reds(out)).toEqual([100, 200]);
  });
});
