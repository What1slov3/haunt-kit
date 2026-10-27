import { describe, expect, it } from 'vitest';

import { spring, springPresets, springValue, toLinearEasing } from './spring';

const max = (values: number[]) => Math.max(...values);

describe('springValue', () => {
  it('начинается с нуля и с нулевой скоростью', () => {
    for (const options of [
      { stiffness: 100, damping: 5 },
      { stiffness: 100, damping: 20 },
      { stiffness: 100, damping: 60 },
    ]) {
      expect(springValue(options, 0)).toBeCloseTo(0, 10);
      expect((springValue(options, 1e-6) - springValue(options, 0)) / 1e-6).toBeCloseTo(0, 2);
    }
  });

  it('начальная скорость толкает вперёд', () => {
    expect(springValue({ velocity: 5 }, 0.01)).toBeGreaterThan(springValue({}, 0.01));
  });
});

describe('spring', () => {
  it('сходится: последний кадр — ровно 1, перед ним — уже у цели', () => {
    const curve = spring({ stiffness: 170, damping: 26 });

    expect(curve.keyframes[0]).toBeCloseTo(0, 10);
    expect(curve.keyframes.at(-1)).toBe(1);
    expect(Math.abs(curve.keyframes.at(-2)! - 1)).toBeLessThan(0.002);
    expect(curve.duration).toBe(Math.round((curve.keyframes.length - 1) * (1000 / 60)));
  });

  it('передемпфированная и критическая — без перелёта и монотонно', () => {
    for (const options of [
      { stiffness: 100, damping: 40 },
      { stiffness: 100, damping: 20, mass: 1 },
    ]) {
      const { keyframes } = spring(options);

      expect(max(keyframes)).toBeLessThanOrEqual(1);
      keyframes.forEach((value, index) => {
        if (index > 0) expect(value).toBeGreaterThanOrEqual(keyframes[index - 1]! - 1e-12);
      });
    }
  });

  it('недодемпфированная — перелетает цель и всё равно приходит к ней', () => {
    const curve = spring({ stiffness: 300, damping: 8 });

    expect(max(curve.keyframes)).toBeGreaterThan(1.2);
    expect(curve.keyframes.at(-1)).toBe(1);
  });

  it('пресеты кита: без заметного перелёта и короче полсекунды', () => {
    for (const preset of Object.values(springPresets)) {
      const curve = spring(preset);

      expect(max(curve.keyframes)).toBeLessThan(1.001);
      expect(curve.duration).toBeLessThan(500);
    }
  });

  it('пружина почти без затухания ограничена по длительности', () => {
    expect(spring({ stiffness: 100, damping: 0.01 }).duration).toBeLessThanOrEqual(10_017);
  });
});

describe('toLinearEasing', () => {
  it('точки через запятую, четыре знака', () => {
    expect(toLinearEasing([0, 0.123456, 1])).toBe('linear(0, 0.1235, 1)');
  });
});
