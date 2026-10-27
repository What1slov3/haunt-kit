import { describe, expect, it } from 'vitest';

import { levelFromTotal, xpRatio } from './xp-math';

describe('xpRatio', () => {
  it('доля в пределах 0–1', () => {
    expect(xpRatio(500, 2000)).toBe(0.25);
    expect(xpRatio(2500, 2000)).toBe(1);
    expect(xpRatio(-5, 100)).toBe(0);
  });

  it('последний уровень — полная полоса', () => {
    expect(xpRatio(10, 0)).toBe(1);
  });
});

describe('levelFromTotal', () => {
  const linear = (level: number) => level * 100;

  it('считает уровень и остаток по кривой', () => {
    // 100 на 2-й, 200 на 3-й, 300 на 4-й: 650 = 100 + 200 + 300 + 50
    expect(levelFromTotal(650, linear)).toEqual({ level: 4, xp: 50, xpToNext: 400 });
  });

  it('ровно на границе — новый уровень с нуля', () => {
    expect(levelFromTotal(300, linear)).toEqual({ level: 3, xp: 0, xpToNext: 300 });
  });

  it('с нулём и отрицательным — первый уровень', () => {
    expect(levelFromTotal(-10, linear)).toEqual({ level: 1, xp: 0, xpToNext: 100 });
  });

  it('упирается в последний уровень', () => {
    expect(levelFromTotal(10_000, linear, { maxLevel: 3 })).toEqual({
      level: 3,
      xp: 9700,
      xpToNext: 0,
    });
  });

  it('кривая без роста не зацикливается', () => {
    expect(levelFromTotal(50, () => 0)).toEqual({ level: 1, xp: 50, xpToNext: 0 });
  });

  it('свой начальный уровень', () => {
    expect(levelFromTotal(0, linear, { startLevel: 0 }).level).toBe(0);
  });
});
