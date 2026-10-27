import { describe, expect, it } from 'vitest';

import { random } from './noise';
import { blipFromPoint, blipIntensity, lagBehind, seedBlips, sweepAngle } from './radar';

describe('radar', () => {
  it('луч обходит круг за период', () => {
    expect(sweepAngle(0, 4)).toBe(0);
    expect(sweepAngle(1, 4)).toBeCloseTo(Math.PI / 2);
    expect(sweepAngle(4, 4)).toBeCloseTo(0);
    expect(sweepAngle(-1, 4)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('отставание от луча — в [0, 2π)', () => {
    expect(lagBehind(1, 1)).toBe(0);
    expect(lagBehind(1, 0.5)).toBeCloseTo(0.5);
    expect(lagBehind(0.5, 1)).toBeCloseTo(Math.PI * 2 - 0.5);
  });

  it('метка вспыхивает под лучом и гаснет за ним', () => {
    expect(blipIntensity(2, 2)).toBe(1);
    expect(blipIntensity(2.5, 2)).toBeLessThan(1);
    expect(blipIntensity(2 + Math.PI, 2)).toBeLessThan(0.1);
    expect(blipIntensity(2.5, 2)).toBeGreaterThan(blipIntensity(3, 2));
  });

  it('метка из точки: угол и доля радиуса; вне круга — null', () => {
    const blip = blipFromPoint(150, 100, 100, 100, 100, 3);

    expect(blip).toMatchObject({ angle: 0, radius: 0.5, bornAt: 3 });
    expect(blipFromPoint(100, 250, 100, 100, 100, 0)).toBeNull();
  });

  it('постоянные метки — внутри круга', () => {
    for (const blip of seedBlips(20, random(1))) {
      expect(blip.radius).toBeGreaterThan(0);
      expect(blip.radius).toBeLessThan(1);
      expect(blip.ttl).toBe(Infinity);
    }
  });
});
