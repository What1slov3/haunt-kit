import { describe, expect, it } from 'vitest';

import { particleAlpha, seedParticles, STRIDE, stepParticles, streamVelocity } from './flow-field';
import { random } from './noise';

describe('streamVelocity', () => {
  it('поле без дивергенции: ∂vx/∂x + ∂vy/∂y ≈ 0', () => {
    const e = 1e-4;
    const a: [number, number] = [0, 0];
    const b: [number, number] = [0, 0];

    for (let i = 0; i < 50; i++) {
      const x = i * 0.31;
      const y = i * 0.17;

      streamVelocity(x + e, y, 2, a);
      streamVelocity(x - e, y, 2, b);

      const dvx = (a[0] - b[0]) / (2 * e);

      streamVelocity(x, y + e, 2, a);
      streamVelocity(x, y - e, 2, b);

      const dvy = (a[1] - b[1]) / (2 * e);

      expect(dvx + dvy).toBeCloseTo(0, 4);
    }
  });

  it('меняется во времени', () => {
    const a = streamVelocity(1, 1, 0, [0, 0]);
    const b = streamVelocity(1, 1, 10, [0, 0]);

    expect(a).not.toEqual(b);
  });
});

describe('stepParticles', () => {
  it('частицы не уходят за край: ушедшие рождаются заново внутри', () => {
    const rand = random(5);
    const particles = seedParticles(300, 200, 100, rand);

    for (let step = 0; step < 400; step++) {
      stepParticles(particles, 200, 100, step / 30, 1 / 30, rand);
    }

    for (let o = 0; o < particles.length; o += STRIDE) {
      expect(particles[o]).toBeGreaterThanOrEqual(0);
      expect(particles[o]).toBeLessThanOrEqual(200);
      expect(particles[o + 1]).toBeGreaterThanOrEqual(0);
      expect(particles[o + 1]).toBeLessThanOrEqual(100);
      expect(particles[o + 4]).toBeLessThanOrEqual(particles[o + 5]!);
    }
  });

  it('частица движется по полю и помнит прошлое положение', () => {
    const particles = new Float32Array([100, 50, 100, 50, 0, 10]);
    const v = streamVelocity(100 * 0.004, 50 * 0.004, 0, [0, 0]);

    stepParticles(particles, 1000, 1000, 0, 0.1, random(1));

    expect(particles[0]).toBeCloseTo(100 + v[0] * 22 * 0.1, 4);
    expect(particles[1]).toBeCloseTo(50 + v[1] * 22 * 0.1, 4);
    expect([particles[2], particles[3]]).toEqual([100, 50]);
  });
});

describe('particleAlpha', () => {
  it('ноль на рождении и в конце, единица посередине', () => {
    expect(particleAlpha(0, 6)).toBe(0);
    expect(particleAlpha(6, 6)).toBe(0);
    expect(particleAlpha(3, 6)).toBe(1);
  });
});
