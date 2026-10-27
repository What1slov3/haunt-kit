import { describe, expect, it } from 'vitest';

import {
  centerX,
  nearestIndex,
  scaleBars,
  scaleSeries,
  segmentsAreaPath,
  segmentsPath,
  splitSegments,
} from './sparkline-geometry';

describe('scaleSeries', () => {
  it('пропуск остаётся на своём месте — x по индексу в исходном ряду', () => {
    expect(scaleSeries([0, null, 10], 100, 50)).toEqual([{ x: 0, y: 50 }, null, { x: 100, y: 0 }]);
  });

  it('NaN и бесконечность — тоже пропуск', () => {
    const points = scaleSeries([0, Number.NaN, 5, Number.POSITIVE_INFINITY, 10], 100, 40);

    expect(points.map((point) => point === null)).toEqual([false, true, false, true, false]);
    expect(points[2]).toEqual({ x: 50, y: 20 });
  });

  it('все пропуски — все null; ровный ряд — посередине', () => {
    expect(scaleSeries([null, null], 100, 40)).toEqual([null, null]);
    expect(scaleSeries([3, null, 3], 100, 40).map((point) => point?.y ?? null)).toEqual([
      20,
      null,
      20,
    ]);
  });
});

describe('куски и пути', () => {
  const points = scaleSeries([0, 10, null, 5, null, null, 10, 0], 70, 10);
  const segments = splitSegments(points);

  it('ряд режется на непрерывные куски', () => {
    expect(segments.map((segment) => segment.length)).toEqual([2, 1, 2]);
    expect(splitSegments([null, null])).toEqual([]);
  });

  it('у каждого куска свой M, одиночная точка — отрезок нулевой длины', () => {
    expect(segmentsPath(segments)).toBe('M0 10 L10 0 M30 5 L30 5 M60 0 L70 10');
  });

  it('заливка прерывается: область под каждым куском, одиночная — без области', () => {
    expect(segmentsAreaPath(segments, 10)).toBe(
      'M0 10 L10 0 L10 10 L0 10 Z M60 0 L70 10 L70 10 L60 10 Z',
    );
  });
});

describe('scaleBars', () => {
  it('полосы равной ширины, столбик — 70 % по центру, от нуля', () => {
    const bars = scaleBars([5, 10], 100, 20);

    expect(bars).toEqual([
      { x: 7.5, y: 10, width: 35, height: 10 },
      { x: 57.5, y: 0, width: 35, height: 20 },
    ]);
  });

  it('ноль — черта в 1 px, пропуск — null', () => {
    const bars = scaleBars([0, null, 4], 30, 10);

    expect(bars[0]!.height).toBe(1);
    expect(bars[1]).toBeNull();
  });

  it('отрицательные — вниз от нуля', () => {
    const [negative, positive] = scaleBars([-5, 5], 20, 20);

    expect(negative).toMatchObject({ y: 10, height: 10 });
    expect(positive).toMatchObject({ y: 0, height: 10 });
  });
});

describe('подсказка', () => {
  it('centerX — точка сама, столбик — середина', () => {
    expect(centerX({ x: 10, y: 0 })).toBe(10);
    expect(centerX({ x: 10, y: 0, width: 6, height: 4 })).toBe(13);
  });

  it('nearestIndex пропускает пропуски', () => {
    expect(nearestIndex([0, null, 100], 45)).toBe(0);
    expect(nearestIndex([0, null, 100], 55)).toBe(2);
    expect(nearestIndex([null, null], 10)).toBe(-1);
  });
});
