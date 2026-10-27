import { describe, expect, it } from 'vitest';

import { contourLevels, contourSegments, sampleHeights } from './contour-field';
import { createNoise3 } from './noise';

describe('contourLevels', () => {
  it('равномерно внутри (0, 1), без краёв', () => {
    expect(contourLevels(3)).toEqual([0.25, 0.5, 0.75]);
  });
});

describe('sampleHeights', () => {
  it('высоты в 0…1 и меняются со временем', () => {
    const noise = createNoise3(2);
    const a = sampleHeights(noise, 20, 12, 0.2, 0);
    const b = sampleHeights(noise, 20, 12, 0.2, 0.5);

    expect(a).toHaveLength(240);

    for (const value of a) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }

    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe('contourSegments', () => {
  it('наклонная плоскость — по прямой изолинии на уровень, индексная — третья', () => {
    const cols = 10;
    const rows = 4;
    const heights = new Float32Array(cols * rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) heights[y * cols + x] = x / (cols - 1);
    }

    const result = contourSegments(heights, cols, rows, contourLevels(5));

    expect(result.map((r) => r.index)).toEqual([false, false, true, false, false]);

    for (const { level, segments } of result) {
      expect(segments.length).toBe((rows - 1) * 4);

      // Все концы — на x, где высота равна уровню
      for (let i = 0; i < segments.length; i += 2) {
        expect(segments[i]).toBeCloseTo(level * (cols - 1), 4);
      }
    }
  });
});
