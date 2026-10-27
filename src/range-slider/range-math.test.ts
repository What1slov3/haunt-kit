import { describe, expect, it } from 'vitest';

import {
  keyAction,
  moveThumb,
  nearestThumb,
  normalizeRange,
  snapValue,
  thumbBounds,
  valueFromRatio,
  valueRatio,
} from './range-math';

const options = { min: 0, max: 100, step: 5, minDistance: 10 };

describe('snapValue', () => {
  it('на сетку шага от min и в пределы шкалы', () => {
    expect(snapValue(12, options)).toBe(10);
    expect(snapValue(13, options)).toBe(15);
    expect(snapValue(-20, options)).toBe(0);
    expect(snapValue(140, options)).toBe(100);
  });

  it('дробный шаг без хвостов плавающей точки', () => {
    expect(snapValue(0.30000001, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
    expect(snapValue(7, { min: 1, max: 10, step: 3 })).toBe(7);
  });
});

describe('moveThumb', () => {
  it('нижний не заходит за верхний минус зазор', () => {
    expect(moveThumb([20, 60], 0, 80, options)).toEqual([50, 60]);
  });

  it('верхний не заходит под нижний плюс зазор', () => {
    expect(moveThumb([20, 60], 1, 0, options)).toEqual([20, 30]);
  });

  it('свободное движение — на сетку шага', () => {
    expect(moveThumb([20, 60], 0, 33, options)).toEqual([35, 60]);
  });

  it('без зазора бегунки могут встать в одну точку, но не поменяться', () => {
    const touching = { ...options, minDistance: 0 };

    expect(moveThumb([20, 60], 0, 90, touching)).toEqual([60, 60]);
  });
});

describe('границы и порядок', () => {
  it('границы бегунка — для aria-valuemin/max', () => {
    expect(thumbBounds([20, 60], 0, options)).toEqual([0, 50]);
    expect(thumbBounds([20, 60], 1, options)).toEqual([30, 100]);
  });

  it('пришедшее значение сортируется и раздвигается на зазор', () => {
    expect(normalizeRange([70, 30], options)).toEqual([30, 70]);
    expect(normalizeRange([40, 42], options)).toEqual([40, 50]);
    expect(normalizeRange([98, 100], options)).toEqual([90, 100]);
  });
});

describe('шкала', () => {
  it('доля и значение по доле', () => {
    expect(valueRatio(25, 0, 100)).toBe(0.25);
    expect(valueRatio(5, 10, 10)).toBe(0);
    expect(valueFromRatio(0.33, options)).toBe(35);
  });

  it('ближний бегунок; в одной точке — по стороне клика', () => {
    expect(nearestThumb([20, 60], 30)).toBe(0);
    expect(nearestThumb([20, 60], 50)).toBe(1);
    expect(nearestThumb([40, 40], 10)).toBe(0);
    expect(nearestThumb([40, 40], 90)).toBe(1);
  });
});

describe('keyAction', () => {
  it('стрелки, Shift, страницы и края', () => {
    expect(keyAction('ArrowRight', false, 5, 25)).toEqual({ delta: 5 });
    expect(keyAction('ArrowDown', true, 5, 25)).toEqual({ delta: -25 });
    expect(keyAction('PageUp', false, 5, 25)).toEqual({ delta: 25 });
    expect(keyAction('Home', false, 5, 25)).toEqual({ edge: 'start' });
    expect(keyAction('a', false, 5, 25)).toBeNull();
  });
});
