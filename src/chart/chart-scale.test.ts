import { describe, expect, it } from 'vitest';

import {
  bandScale,
  linearScale,
  nearestPointIndex,
  niceStep,
  niceTicks,
  pointScale,
  thinLabels,
} from './chart-scale';

describe('niceStep', () => {
  it('шаг из ряда 1, 2, 2.5, 5 × 10ⁿ', () => {
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(1000, 5)).toBe(200);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(0.9, 4)).toBe(0.25);
    expect(niceStep(43, 4)).toBe(20);
  });

  it('пустой размах — единица', () => {
    expect(niceStep(0, 4)).toBe(1);
    expect(niceStep(Number.NaN, 4)).toBe(1);
  });
});

describe('niceTicks', () => {
  it('границы кратны шагу и охватывают данные', () => {
    expect(niceTicks(0, 87, 4)).toEqual({
      min: 0,
      max: 100,
      step: 25,
      ticks: [0, 25, 50, 75, 100],
    });
  });

  it('отрицательные значения', () => {
    const { min, max, ticks } = niceTicks(-12, 30, 4);

    expect(min).toBeLessThanOrEqual(-12);
    expect(max).toBeGreaterThanOrEqual(30);
    expect(ticks).toContain(0);
  });

  it('без хвостов плавающей точки', () => {
    expect(niceTicks(0, 0.3, 3).ticks).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it('ровный ряд раздвигается, ноль не уходит в минус', () => {
    const flat = niceTicks(10, 10);

    expect(flat.min).toBeGreaterThanOrEqual(0);
    expect(flat.max).toBeGreaterThan(10);
    expect(niceTicks(0, 0)).toMatchObject({ min: 0, max: 1 });
  });

  it('интервалов не больше просимого плюс один', () => {
    for (const [low, high] of [
      [0, 1234],
      [3, 97],
      [-50, 1],
      [0.001, 0.0093],
    ] as const) {
      const { ticks } = niceTicks(low, high, 4);

      expect(ticks.length - 1).toBeLessThanOrEqual(5);
    }
  });

  it('нечисла — шкала 0–1', () => {
    expect(niceTicks(Number.NaN, Infinity)).toMatchObject({ min: 0, max: 1 });
  });
});

describe('linearScale', () => {
  it('переводит домен в диапазон, в том числе перевёрнутый (y вниз)', () => {
    const y = linearScale([0, 100], [200, 0]);

    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  it('вырожденный домен — середина', () => {
    expect(linearScale([5, 5], [0, 10])(5)).toBe(5);
  });
});

describe('bandScale / pointScale', () => {
  it('полосы делят ширину поровну', () => {
    const band = bandScale(4, [0, 200]);

    expect(band.band).toBe(50);
    expect(band.start(2)).toBe(100);
    expect(band.center(0)).toBe(25);
  });

  it('точки — от края до края', () => {
    const x = pointScale(5, [0, 100]);

    expect([0, 1, 4].map(x)).toEqual([0, 25, 100]);
    expect(pointScale(1, [0, 100])(0)).toBe(50);
  });

  it('ближайшая точка к курсору', () => {
    expect(nearestPointIndex(30, 5, [0, 100])).toBe(1);
    expect(nearestPointIndex(-20, 5, [0, 100])).toBe(0);
    expect(nearestPointIndex(500, 5, [0, 100])).toBe(4);
  });
});

describe('thinLabels', () => {
  it('всё влезает — все подписи', () => {
    expect(thinLabels(4, 60, 40)).toEqual([0, 1, 2, 3]);
  });

  it('тесно — каждая k-я, последняя видна', () => {
    expect(thinLabels(30, 10, 36)).toEqual([0, 4, 8, 12, 16, 20, 24, 29]);
  });

  it('последняя заменяет предыдущую, если налезает', () => {
    expect(thinLabels(10, 10, 30)).toEqual([0, 3, 6, 9]);
    expect(thinLabels(11, 10, 30)).toEqual([0, 3, 6, 10]);
  });
});
