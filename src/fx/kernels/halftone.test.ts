import { describe, expect, it } from 'vitest';

import type { Rgb } from '../../filtered-image/image-filters';

import { halftonePixels, sampleBilinear, screenCoverage, type HalftoneOptions } from './halftone';
import { solid } from './test-helpers';

const black: Rgb = [0, 0, 0];
const white: Rgb = [255, 255, 255];

function mean(out: Uint8ClampedArray, channel: number): number {
  let sum = 0;

  for (let i = channel; i < out.length; i += 4) sum += out[i]!;

  return sum / (out.length / 4) / 255;
}

const grid = (rgb: readonly [number, number, number]) => ({
  data: solid(8, 8, rgb),
  width: 8,
  height: 8,
});

const mono: HalftoneOptions = {
  period: 8,
  angle: Math.PI / 4,
  shape: 'dot',
  channels: 'mono',
  paper: black,
  ink: white,
};

describe('screenCoverage', () => {
  it('без краски точки нет, полная краска закрывает центр и угол ячейки', () => {
    expect(screenCoverage(0.5, 0.5, 0, 'dot', 0.1)).toBe(0);
    expect(screenCoverage(0.5, 0.5, 1, 'dot', 0.1)).toBe(1);
    expect(screenCoverage(0.02, 0.02, 1, 'dot', 0.1)).toBeGreaterThan(0.5);
  });

  it('линия: ширина растёт с краской', () => {
    expect(screenCoverage(0.5, 0.3, 0.2, 'line', 0.05)).toBe(0);
    expect(screenCoverage(0.5, 0.3, 0.8, 'line', 0.05)).toBe(1);
  });
});

describe('sampleBilinear', () => {
  it('между двумя пикселями — среднее', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 200, 200, 200, 255]);
    const out = [0, 0, 0];

    sampleBilinear({ data, width: 2, height: 1 }, 1, 0.5, out);

    expect(out[0]).toBeCloseTo(100);
  });
});

describe('halftonePixels', () => {
  it('доля краски растёт с яркостью', () => {
    const dark = halftonePixels(grid([50, 50, 50]), 64, 64, mono);
    const light = halftonePixels(grid([200, 200, 200]), 64, 64, mono);

    expect(mean(light, 0)).toBeGreaterThan(mean(dark, 0));
    expect(mean(dark, 0)).toBeGreaterThan(0);
  });

  it('на светлой бумаге цветной растр вычитает: красное остаётся красным', () => {
    const out = halftonePixels(grid([255, 0, 0]), 64, 64, {
      ...mono,
      channels: 'cmyk',
      paper: white,
    });

    expect(mean(out, 0)).toBeGreaterThan(mean(out, 2) * 2);
  });

  it('на тёмной бумаге растры складываются светом', () => {
    const out = halftonePixels(grid([0, 0, 255]), 64, 64, { ...mono, channels: 'cmyk' });

    expect(mean(out, 2)).toBeGreaterThan(0.3);
    expect(mean(out, 0)).toBe(0);
  });
});
