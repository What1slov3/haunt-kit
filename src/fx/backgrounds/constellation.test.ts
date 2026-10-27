import { describe, expect, it } from 'vitest';

import { driftPoints, linksNear, seedPoints, STRIDE } from './constellation';
import { random } from './noise';

describe('constellation', () => {
  it('дрейф переходит через край, точки остаются в поле', () => {
    const points = seedPoints(50, 100, 80, random(1));

    for (let i = 0; i < 200; i++) driftPoints(points, 100, 80, 0.5);

    for (let o = 0; o < points.length; o += STRIDE) {
      expect(points[o]).toBeGreaterThanOrEqual(0);
      expect(points[o]).toBeLessThanOrEqual(100);
      expect(points[o + 1]).toBeGreaterThanOrEqual(0);
      expect(points[o + 1]).toBeLessThanOrEqual(80);
    }
  });

  it('связи — только между близкими друг к другу точками у курсора', () => {
    // a и b у курсора и рядом, c у курсора, но далеко от них, d далеко от курсора
    const points = new Float32Array([
      100, 100, 0, 0, 110, 100, 0, 0, 100, 190, 0, 0, 400, 400, 0, 0,
    ]);
    const links = linksNear(points, 100, 120, 100, 50);

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ a: 0, b: 1 });
    expect(links[0]!.strength).toBeGreaterThan(0);
    expect(links[0]!.strength).toBeLessThanOrEqual(1);
  });

  it('без точек рядом — без связей', () => {
    expect(linksNear(new Float32Array([0, 0, 0, 0, 5, 5, 0, 0]), 500, 500, 100, 50)).toEqual([]);
  });
});
