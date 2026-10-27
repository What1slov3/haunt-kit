import { describe, expect, it } from 'vitest';

import type { Rgb } from '../../filtered-image/image-filters';

import { diffuseError } from './error-diffusion';
import { solid } from './test-helpers';

const black: Rgb = [0, 0, 0];
const white: Rgb = [255, 255, 255];

function litShare(out: Uint8ClampedArray): number {
  let lit = 0;

  for (let i = 0; i < out.length; i += 4) if (out[i] === 255) lit++;

  return lit / (out.length / 4);
}

const gray = (value: number) => solid(32, 32, [value, value, value]);

describe('diffuseError', () => {
  it('Флойд — Стейнберг сохраняет среднюю яркость', () => {
    expect(litShare(diffuseError(gray(64), 32, 32, [black, white], 'floyd'))).toBeCloseTo(
      64 / 255,
      1,
    );
  });

  it('в результате только цвета шкалы', () => {
    const mid: Rgb = [128, 0, 0];
    const out = diffuseError(solid(8, 8, [90, 90, 90]), 8, 8, [black, mid, white], 'floyd');
    const allowed = [
      [0, 0, 0],
      [128, 0, 0],
      [255, 255, 255],
    ];

    for (let i = 0; i < out.length; i += 4) {
      expect(allowed).toContainEqual([out[i], out[i + 1], out[i + 2]]);
    }
  });

  it('Аткинсон раздаёт не всю ошибку: светлое выгорает в чистый цвет', () => {
    const floyd = litShare(diffuseError(gray(235), 32, 32, [black, white], 'floyd'));
    const atkinson = litShare(diffuseError(gray(235), 32, 32, [black, white], 'atkinson'));

    expect(floyd).toBeLessThan(1);
    expect(atkinson).toBe(1);
  });

  it('чёрное и белое — без узора', () => {
    expect(litShare(diffuseError(gray(0), 32, 32, [black, white], 'atkinson'))).toBe(0);
    expect(litShare(diffuseError(gray(255), 32, 32, [black, white], 'floyd'))).toBe(1);
  });

  it('меньше двух цветов — ошибка', () => {
    expect(() => diffuseError(solid(1, 1, [0, 0, 0]), 1, 1, [black], 'floyd')).toThrow();
  });
});
