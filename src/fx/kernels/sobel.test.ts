import { describe, expect, it } from 'vitest';

import { edgeStrength, sobel } from './sobel';

describe('sobel', () => {
  it('ровное поле — ноль', () => {
    expect(sobel(new Float32Array(9).fill(0.7), 3, 3).every((value) => value === 0)).toBe(true);
  });

  it('вертикальная граница — линия на ней, ноль вдали', () => {
    const field = Float32Array.from([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1]);
    const out = sobel(field, 4, 3);

    expect(out[1 * 4 + 1]).toBe(4);
    expect(out[1 * 4 + 2]).toBe(4);
    expect(out[0]).toBe(0);
  });

  it('сила линии ограничена единицей', () => {
    expect(edgeStrength(4)).toBe(1);
    expect(edgeStrength(0.5)).toBe(0.5);
  });
});
