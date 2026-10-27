import { describe, expect, it } from 'vitest';

import {
  easeInOut,
  easeOut,
  fillMask,
  hash2,
  smoothstep,
  transitionThresholds,
  valueNoise,
} from './transition-masks';

describe('transitionThresholds', () => {
  it.each(['reveal', 'wipe'] as const)('%s растянут на весь диапазон 0…1', (effect) => {
    const thresholds = [...transitionThresholds(effect, 32, 18, 7)];

    expect(Math.min(...thresholds)).toBeCloseTo(0);
    expect(Math.max(...thresholds)).toBeCloseTo(1);
  });

  it('reveal: центр раньше углов', () => {
    const cols = 32;
    const thresholds = transitionThresholds('reveal', cols, 18);

    expect(thresholds[9 * cols + 16]!).toBeLessThan(thresholds[0]!);
    expect(thresholds[9 * cols + 16]!).toBeLessThan(thresholds[17 * cols + 31]!);
  });

  it('wipe: левый верх раньше правого низа', () => {
    const cols = 32;
    const thresholds = transitionThresholds('wipe', cols, 18);

    expect(thresholds[0]!).toBeLessThan(thresholds[17 * cols + 31]!);
  });
});

describe('fillMask', () => {
  const thresholds = transitionThresholds('wipe', 16, 9);
  const out = new Uint8ClampedArray(thresholds.length * 4);

  it('прогресс 0 — ничего, 1 — всё', () => {
    expect(fillMask(thresholds, 0, 0.2, out)).toBe(0);
    expect(out.every((value, i) => i % 4 !== 3 || value === 0)).toBe(true);

    expect(fillMask(thresholds, 1, 0.2, out)).toBe(1);
    expect(out.every((value, i) => i % 4 !== 3 || value === 255)).toBe(true);
  });

  it('край мягкий: в середине есть клетки между 0 и 255', () => {
    fillMask(thresholds, 0.5, 0.2, out);

    const alphas = [...out].filter((_, i) => i % 4 === 3);

    expect(alphas.some((alpha) => alpha > 0 && alpha < 255)).toBe(true);
  });

  it('видимое только растёт с прогрессом', () => {
    const shown = [0.1, 0.3, 0.5, 0.7, 0.9].map((progress) =>
      fillMask(thresholds, progress, 0.2, out),
    );

    expect(shown).toEqual([...shown].sort((a, b) => a - b));
  });
});

describe('шум и сглаживание', () => {
  it('хэш детерминирован и в 0…1', () => {
    expect(hash2(3, 4, 1)).toBe(hash2(3, 4, 1));
    expect(hash2(3, 4, 1)).toBeGreaterThanOrEqual(0);
    expect(hash2(3, 4, 1)).toBeLessThan(1);
  });

  it('шум значений в узле равен хэшу узла', () => {
    expect(valueNoise(2, 5, 9)).toBeCloseTo(hash2(2, 5, 9));
  });

  it('ступени и сглаживания: концы на месте', () => {
    for (const ease of [easeInOut, easeOut, smoothstep]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    }

    expect(easeInOut(0.5)).toBe(0.5);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});
