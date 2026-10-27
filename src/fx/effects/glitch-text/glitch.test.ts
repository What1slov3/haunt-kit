import { describe, expect, it } from 'vitest';

import { glitchLayout } from './glitch';

const chars = [...'сигнал потерян, повтор через 3 с'];

describe('glitchLayout', () => {
  it('символы и их порядок не меняются', () => {
    expect(glitchLayout(chars, { seed: 1 }).map((item) => item.char)).toEqual(chars);
  });

  it('тот же seed — та же дрожь, другой — другая', () => {
    expect(glitchLayout(chars, { seed: 5 })).toEqual(glitchLayout(chars, { seed: 5 }));
    expect(glitchLayout(chars, { seed: 5 })).not.toEqual(glitchLayout(chars, { seed: 6 }));
  });

  it('пробелы не дрожат', () => {
    for (const item of glitchLayout(chars, { seed: 2, density: 1 })) {
      if (item.char === ' ') expect(item.jitter).toBe(false);
    }
  });

  it('доля дрожащих — около density', () => {
    const long = [...'x'.repeat(400)];
    const share = glitchLayout(long, { seed: 3, density: 0.25 }).filter((item) => item.jitter);

    expect(share.length / long.length).toBeGreaterThan(0.18);
    expect(share.length / long.length).toBeLessThan(0.32);
  });

  it('сдвиг — в пределах амплитуды и не меньше пикселя, задержки — ступенями', () => {
    for (const item of glitchLayout(chars, { seed: 4, density: 1, amplitude: 3 })) {
      if (!item.jitter) continue;

      expect(Math.abs(item.x)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(item.x)).toBeLessThanOrEqual(3);
      expect(Math.abs(item.y)).toBeLessThanOrEqual(1.5);
      expect(item.delay % 30).toBe(0);
    }
  });
});
