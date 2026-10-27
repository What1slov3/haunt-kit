import { describe, expect, it } from 'vitest';

import { random } from './noise';
import { advanceStars, jumpSpeed, layoutStars, projectStar, STRIDE } from './starfield';

describe('starfield', () => {
  it('раскладка — в объёме и детерминирована', () => {
    const stars = layoutStars(200, random(3));

    expect(Array.from(layoutStars(200, random(3)))).toEqual(Array.from(stars));

    for (let o = 0; o < stars.length; o += STRIDE) {
      expect(Math.abs(stars[o]!)).toBeLessThanOrEqual(1);
      expect(Math.abs(stars[o + 1]!)).toBeLessThanOrEqual(1);
      expect(stars[o + 2]).toBeGreaterThan(0);
      expect(stars[o + 2]).toBeLessThanOrEqual(1);
    }
  });

  it('полёт к камере и возврат в глубину', () => {
    const stars = new Float32Array([0.5, 0.5, 0.05, 1]);

    advanceStars(stars, 0.02, 1, random(1));

    expect(stars[2]).toBeGreaterThan(0.9);
  });

  it('проекция: центр в центре, ближняя звезда дальше от центра и сильнее сдвигается за курсором', () => {
    const out = { x: 0, y: 0, size: 0, alpha: 0 };
    const stars = new Float32Array([0, 0, 0.5, 1, 0.2, 0, 0.8, 1, 0.2, 0, 0.2, 1]);

    projectStar(stars, 0, 200, 100, 0, 0, out);
    expect(out).toMatchObject({ x: 100, y: 50 });

    const far = projectStar(stars, 1, 200, 100, 0, 0, { ...out }).x;
    const near = projectStar(stars, 2, 200, 100, 0, 0, { ...out }).x;

    expect(near).toBeGreaterThan(far);

    const shiftFar = far - projectStar(stars, 1, 200, 100, 1, 0, { ...out }).x;
    const shiftNear = near - projectStar(stars, 2, 200, 100, 1, 0, { ...out }).x;

    expect(shiftNear).toBeGreaterThan(shiftFar);
  });

  it('прыжок: ноль до и после, пик в начале', () => {
    expect(jumpSpeed(-0.1)).toBe(0);
    expect(jumpSpeed(0)).toBe(0);
    expect(jumpSpeed(2)).toBe(0);
    expect(jumpSpeed(0.28)).toBeGreaterThan(jumpSpeed(1));
  });
});
