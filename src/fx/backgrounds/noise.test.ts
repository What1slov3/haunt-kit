import { describe, expect, it } from 'vitest';

import { createNoise3, fbm3, random } from './noise';

describe('random', () => {
  it('один seed — одна последовательность, разные seed — разные', () => {
    const a = random(42);
    const b = random(42);
    const c = random(43);
    const first = [a(), a(), a()];

    expect([b(), b(), b()]).toEqual(first);
    expect(c()).not.toBe(first[0]);
  });

  it('значения в [0, 1) и без перекоса', () => {
    const next = random(1);
    let sum = 0;

    for (let i = 0; i < 10000; i++) {
      const value = next();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      sum += value;
    }

    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });
});

describe('createNoise3', () => {
  const noise = createNoise3(7);

  it('в узлах решётки — ноль: градиентный шум', () => {
    expect(noise(3, 5, 1)).toBeCloseTo(0, 6);
    expect(noise(0, 0, 0)).toBeCloseTo(0, 6);
  });

  it('ограничен и гладок: соседние точки близки', () => {
    let max = 0;

    for (let i = 0; i < 2000; i++) {
      const x = i * 0.173;
      const y = i * 0.071;
      const value = noise(x, y, 0.5);

      max = Math.max(max, Math.abs(value));
      expect(Math.abs(noise(x + 0.001, y, 0.5) - value)).toBeLessThan(0.01);
    }

    expect(max).toBeLessThanOrEqual(1.1);
    expect(max).toBeGreaterThan(0.3);
  });

  it('детерминирован по seed', () => {
    expect(createNoise3(7)(1.3, 2.7, 0.4)).toBe(noise(1.3, 2.7, 0.4));
    expect(createNoise3(8)(1.3, 2.7, 0.4)).not.toBe(noise(1.3, 2.7, 0.4));
  });
});

describe('fbm3', () => {
  it('нормирован в пределах одной октавы', () => {
    const noise = createNoise3(3);

    for (let i = 0; i < 500; i++) {
      expect(Math.abs(fbm3(noise, i * 0.37, i * 0.11, 0.2, 4))).toBeLessThanOrEqual(1.1);
    }
  });
});
