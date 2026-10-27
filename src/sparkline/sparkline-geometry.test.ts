import { describe, expect, it } from 'vitest';

import { areaPath, linePath, scalePoints } from './sparkline-geometry';

describe('scalePoints', () => {
  it('минимум — внизу, максимум — вверху, по ширине равномерно', () => {
    expect(scalePoints([0, 5, 10], 100, 50)).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ]);
  });

  it('поле padding с каждой стороны', () => {
    const points = scalePoints([0, 10], 100, 50, 5);

    expect(points).toEqual([
      { x: 5, y: 45 },
      { x: 95, y: 5 },
    ]);
  });

  it('ровный ряд — горизонталь посередине, без деления на ноль', () => {
    expect(scalePoints([7, 7, 7], 100, 40).map((point) => point.y)).toEqual([20, 20, 20]);
  });

  it('одно значение — горизонталь во всю ширину', () => {
    expect(scalePoints([3], 100, 40, 2)).toEqual([
      { x: 2, y: 20 },
      { x: 98, y: 20 },
    ]);
  });

  it('пусто и нечисловое — пропускаются', () => {
    expect(scalePoints([], 100, 40)).toEqual([]);
    expect(scalePoints([Number.NaN, 0, Number.POSITIVE_INFINITY, 10], 100, 40)).toHaveLength(2);
  });

  it('шкала задаётся снаружи — чтобы несколько линий были сравнимы', () => {
    expect(scalePoints([5], 100, 40, 0, { min: 0, max: 10 })[0]?.y).toBe(20);
    expect(scalePoints([0, 5], 100, 40, 0, { min: 0, max: 10 }).map((point) => point.y)).toEqual([
      40, 20,
    ]);
  });

  it('координаты округлены до сотых — короткий атрибут d', () => {
    const [, point] = scalePoints([0, 1, 3], 100, 10);

    expect(point).toEqual({ x: 50, y: 6.67 });
  });
});

describe('paths', () => {
  const points = [
    { x: 0, y: 10 },
    { x: 50, y: 0 },
    { x: 100, y: 5 },
  ];

  it('линия — M и L по точкам', () => {
    expect(linePath(points)).toBe('M0 10 L50 0 L100 5');
  });

  it('область замыкается по нижнему краю', () => {
    expect(areaPath(points, 20)).toBe('M0 10 L50 0 L100 5 L100 20 L0 20 Z');
    expect(areaPath([], 20)).toBe('');
  });
});
