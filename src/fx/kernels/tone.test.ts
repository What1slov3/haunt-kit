import { describe, expect, it } from 'vitest';

import type { Rgb } from '../../filtered-image/image-filters';

import { grays, solid } from './test-helpers';
import {
  gradientMap,
  ledPixels,
  meanLuminance,
  posterize,
  sampleRamp,
  thresholdPixels,
  THERMAL_RAMP,
} from './tone';

const black: Rgb = [0, 0, 0];
const white: Rgb = [255, 255, 255];
const red: Rgb = [255, 0, 0];

describe('sampleRamp', () => {
  it('концы и середина шкалы', () => {
    const out = [0, 0, 0];

    sampleRamp([black, white], 0, out);
    expect(out).toEqual([0, 0, 0]);

    sampleRamp([black, white], 1, out);
    expect(out).toEqual([255, 255, 255]);

    sampleRamp([black, red, white], 0.5, out);
    expect(out).toEqual([255, 0, 0]);
  });
});

describe('gradientMap', () => {
  it('тёмное — в первый цвет, светлое — в последний', () => {
    const out = gradientMap(grays([0, 255]), 2, 1, [red, white]);

    expect([...out.slice(0, 3)]).toEqual([255, 0, 0]);
    expect([...out.slice(4, 7)]).toEqual([255, 255, 255]);
  });

  it('тепловая шкала: холодное чёрное, горячее белое', () => {
    const out = gradientMap(grays([0, 255]), 2, 1, THERMAL_RAMP);

    expect([...out.slice(0, 3)]).toEqual([0, 0, 0]);
    expect([...out.slice(4, 7)]).toEqual([255, 255, 255]);
  });
});

describe('posterize', () => {
  it('два уровня — каналы только 0 или 255', () => {
    const out = posterize(solid(1, 1, [100, 200, 30]), 1, 1, 2);

    expect([...out.slice(0, 3)]).toEqual([0, 255, 0]);
  });

  it('четыре уровня — ступени по 85', () => {
    expect(posterize(grays([90]), 1, 1, 4)[0]).toBe(85);
  });
});

describe('meanLuminance', () => {
  it('среднее по кадру', () => {
    expect(meanLuminance(grays([0, 255]), 2, 1)).toBeCloseTo(0.5);
  });
});

describe('thresholdPixels', () => {
  it('выше порога — краска, ниже — пусто', () => {
    const out = thresholdPixels(grays([100, 160]), 2, 1, 0.5, black, red);

    expect([...out.slice(0, 3)]).toEqual([0, 0, 0]);
    expect([...out.slice(4, 7)]).toEqual([255, 0, 0]);
  });
});

describe('ledPixels', () => {
  it('выключенный диод слегка светится, включённый — цветом табло', () => {
    const out = ledPixels(grays([0, 255]), 2, 1, { ink: red, off: black, levels: 4, floor: 0.2 });

    expect(out[0]).toBe(51);
    expect([...out.slice(4, 7)]).toEqual([255, 0, 0]);
  });

  it('цветной диод — оттенок пикселя на полной насыщенности', () => {
    const out = ledPixels(solid(1, 1, [128, 0, 0]), 1, 1, {
      ink: null,
      off: black,
      levels: 2,
      floor: 1,
    });

    expect([...out.slice(0, 3)]).toEqual([255, 0, 0]);
  });
});
