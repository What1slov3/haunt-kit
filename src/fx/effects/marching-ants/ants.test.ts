import { describe, expect, it } from 'vitest';

import { antsDash, roundedRectPerimeter } from './ants';

describe('roundedRectPerimeter', () => {
  it('без скругления — обычный периметр', () => {
    expect(roundedRectPerimeter(100, 50, 0)).toBe(300);
  });

  it('скругление заменяет углы дугами', () => {
    expect(roundedRectPerimeter(100, 50, 10)).toBeCloseTo(300 - 80 + 20 * Math.PI);
  });

  it('радиус больше половины стороны — таблетка, не больше', () => {
    expect(roundedRectPerimeter(100, 20, 50)).toBeCloseTo(roundedRectPerimeter(100, 20, 10));
  });
});

describe('antsDash', () => {
  it('на периметре — целое число штрихов', () => {
    const perimeter = roundedRectPerimeter(237, 81, 9);
    const { period } = antsDash(perimeter, 5, 4);

    expect(Number.isInteger(Math.round((perimeter / period) * 1e9) / 1e9)).toBe(true);
  });

  it('пропорция штриха и промежутка сохраняется, период близок к заданному', () => {
    const { dash, gap, period } = antsDash(301, 6, 3);

    expect(dash / gap).toBeCloseTo(2);
    expect(dash + gap).toBeCloseTo(period);
    expect(Math.abs(period - 9)).toBeLessThan(0.2);
  });

  it('периметр меньше штриха — один штрих на весь контур', () => {
    expect(antsDash(4, 5, 4).period).toBe(4);
  });
});
