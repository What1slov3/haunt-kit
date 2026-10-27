import { describe, expect, it } from 'vitest';

import { barrel, phosphorMask, rgbSplit, scanline } from './screen';
import { solid } from './test-helpers';

describe('barrel', () => {
  it('центр на месте, край уезжает наружу', () => {
    expect(barrel(0.5, 0.5, 0.1)).toEqual([0.5, 0.5]);
    expect(barrel(1, 0.5, 0.1)[0]).toBeGreaterThan(1);
  });
});

describe('scanline', () => {
  it('середина строки светлая, промежуток тёмный на глубину', () => {
    expect(scanline(-0.5, 4, 0.5)).toBeCloseTo(1);
    expect(scanline(1.5, 4, 0.5)).toBeCloseTo(0.5);
  });
});

describe('phosphorMask', () => {
  it('полосы R, G, B по очереди', () => {
    const out = [0, 0, 0];

    phosphorMask(0, 2, 0.5, out);
    expect(out).toEqual([1, 0.5, 0.5]);

    phosphorMask(5, 2, 0.5, out);
    expect(out).toEqual([0.5, 0.5, 1]);
  });
});

describe('rgbSplit', () => {
  it('ровная заливка не меняется', () => {
    expect([...rgbSplit(solid(4, 4, [10, 20, 30]), 4, 4, 2).slice(0, 4)]).toEqual([
      10, 20, 30, 255,
    ]);
  });

  it('на границе — цветная кайма: красный берётся правее, синий левее', () => {
    // Слева чёрное, справа белое
    const edge = new Uint8ClampedArray(8 * 4);

    for (let x = 4; x < 8; x++) edge.set([255, 255, 255, 255], x * 4);

    const out = rgbSplit(edge, 8, 1, 2);

    expect([...out.slice(16, 19)]).toEqual([255, 255, 0]);
  });
});
