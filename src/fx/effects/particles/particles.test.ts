import { describe, expect, it } from 'vitest';

import { particlePresets } from './particle-presets';
import {
  burstDuration,
  createParticles,
  launchSpeed,
  particleAt,
  type ParticleOptions,
} from './particles';

const burst = (overrides: Partial<ParticleOptions> = {}) =>
  createParticles({ ...particlePresets.burst, count: 6, distance: 30, life: 640, ...overrides });

const angleOf = (vx: number, vy: number) => (Math.atan2(vy, vx) * 180) / Math.PI;

describe('createParticles', () => {
  it('тот же seed — та же раскладка', () => {
    expect(burst({ seed: 3 })).toEqual(burst({ seed: 3 }));
    expect(burst({ seed: 3 })).not.toEqual(burst({ seed: 4 }));
  });

  it('полный круг — направления разнесены по секторам, не кучкой', () => {
    const angles = burst({ variance: 0 })
      .map((particle) => (angleOf(particle.vx, particle.vy) + 360) % 360)
      .sort((a, b) => a - b);
    const gaps = angles.map((angle, index) => (angles[index + 1] ?? angles[0]! + 360) - angle);

    for (const gap of gaps) expect(gap).toBeGreaterThan(30);
  });

  it('сектор — все направления внутри него', () => {
    const fan = createParticles({ count: 12, distance: 50, life: 1000, angle: -90, spread: 60 });

    for (const particle of fan) {
      const angle = angleOf(particle.vx, particle.vy);

      expect(angle).toBeGreaterThanOrEqual(-125);
      expect(angle).toBeLessThanOrEqual(-55);
    }
  });
});

describe('particleAt', () => {
  it('в начале все в точке всплеска и яркие', () => {
    for (const particle of burst()) {
      const start = particleAt(particle, 0)!;

      expect(Math.hypot(start.x, start.y)).toBe(0);
      expect(start).toMatchObject({ alpha: 1, scale: 1 });
    }
  });

  it('без гравитации — к концу жизни на дальности distance по своему направлению', () => {
    for (const particle of burst({ variance: 0 })) {
      const end = particleAt(particle, particle.life)!;
      const reached = Math.hypot(end.x, end.y);

      // Жизнь частицы разная (±15 %), а скорость рассчитана на общую — дальность близка, но не ровна
      expect(reached).toBeGreaterThan(30 * 0.9);
      expect(reached).toBeLessThan(30 * 1.1);
      expect(angleOf(end.x, end.y)).toBeCloseTo(angleOf(particle.vx, particle.vy), 6);
    }
  });

  it('дальность растёт монотонно: частица тормозит, но не возвращается', () => {
    const particle = burst()[0]!;
    let previous = -1;

    for (let t = 0; t <= particle.life; t += 16) {
      const state = particleAt(particle, t)!;
      const distance = Math.hypot(state.x, state.y);

      expect(distance).toBeGreaterThanOrEqual(previous);
      previous = distance;
    }
  });

  it('гаснет к концу жизни и пропадает после', () => {
    const particle = burst()[0]!;

    expect(particleAt(particle, particle.life)!.alpha).toBeCloseTo(0);
    expect(particleAt(particle, particle.life + 1)).toBeNull();
    expect(particleAt(particle, -1)).toBeNull();
  });

  it('конфетти взлетает и падает: высшая точка — не в конце', () => {
    const piece = createParticles({
      ...particlePresets.confetti,
      count: 1,
      distance: 120,
      life: 1600,
      spread: 0,
    })[0]!;
    const heights = Array.from(
      { length: 50 },
      (_, index) => particleAt(piece, (index / 49) * piece.life)!.y,
    );
    const peak = Math.min(...heights);

    expect(peak).toBeLessThan(-40);
    expect(heights.at(-1)!).toBeGreaterThan(peak + 40);
  });

  it('кувырок конфетти — в пределах −1…1, у точек всплеска его нет', () => {
    const piece = createParticles({
      ...particlePresets.confetti,
      count: 1,
      distance: 80,
      life: 900,
    })[0]!;

    for (let t = 0; t < piece.life; t += 50) {
      expect(Math.abs(particleAt(piece, t)!.flip)).toBeLessThanOrEqual(1);
    }

    expect(particleAt(burst()[0]!, 100)!.flip).toBe(1);
  });
});

describe('launchSpeed', () => {
  it('частица, брошенная вверх с этой скоростью, поднимается на заданную высоту', () => {
    const speed = launchSpeed(110, 900, 2.2);
    const piece = { vx: 0, vy: -speed, drag: 2.2, gravity: 900, life: 2000, size: 4 };
    const particle = { ...piece, shape: 'dot', color: 0, rotation: 0, spin: 0, flip: 0 } as const;
    const peak = Math.min(...Array.from({ length: 2000 }, (_, t) => particleAt(particle, t)!.y));

    expect(peak).toBeCloseTo(-110, 0);
  });
});

describe('burstDuration', () => {
  it('самая долгая жизнь во всплеске', () => {
    const particles = burst();

    expect(burstDuration(particles)).toBe(Math.max(...particles.map((p) => p.life)));
  });
});
