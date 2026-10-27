import { describe, expect, it } from 'vitest';

import { random } from './noise';
import { cellBrightness, createRain, RAIN_GLYPHS, stepRain } from './rain';

describe('rain', () => {
  it('символы — индексы набора', () => {
    const state = createRain(10, 20, random(1));

    for (const glyph of state.glyphs) expect(glyph).toBeLessThan(RAIN_GLYPHS.length);
  });

  it('голова падает со скоростью колонки', () => {
    const state = createRain(4, 30, random(2));
    const before = state.head[0]!;
    const speed = state.speed[0]!;

    stepRain(state, 0.5, random(3));

    expect(state.head[0]).toBeCloseTo(before + speed * 0.5, 4);
  });

  it('ушедшая за низ капля начинается заново выше экрана', () => {
    const state = createRain(1, 10, random(4));

    state.head[0] = 10 + state.length[0]! + 0.5;
    stepRain(state, 0.01, random(5));

    expect(state.head[0]).toBeLessThanOrEqual(0);
  });

  it('яркость: голова 1, хвост гаснет, вне капли 0', () => {
    const state = createRain(1, 30, random(6));

    state.head[0] = 15;
    state.length[0] = 10;

    expect(cellBrightness(state, 0, 15)).toBe(1);
    expect(cellBrightness(state, 0, 10)).toBeCloseTo(0.5);
    expect(cellBrightness(state, 0, 16)).toBe(0);
    expect(cellBrightness(state, 0, 4)).toBe(0);
  });
});
