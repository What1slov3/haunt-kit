import { describe, expect, it } from 'vitest';

import { smoothLevel, syntheticVoice, waveSample } from './waveform';

describe('smoothLevel', () => {
  it('атака быстрее спада', () => {
    const up = smoothLevel(0, 1, 0.05);
    const down = 1 - smoothLevel(1, 0, 0.05);

    expect(up).toBeGreaterThan(down);
  });

  it('сходится к цели и не выходит за 0…1', () => {
    let level = 0;

    for (let i = 0; i < 200; i++) level = smoothLevel(level, 3, 0.016);

    expect(level).toBeCloseTo(1, 3);
    expect(smoothLevel(0.5, -2, 10)).toBeCloseTo(0, 3);
  });
});

describe('waveSample', () => {
  it('у краёв — ноль, в тишине — почти ровно, с голосом — размах', () => {
    expect(waveSample(0, 1, 1, 0)).toBeCloseTo(0);
    expect(waveSample(1, 1, 1, 0)).toBeCloseTo(0);

    let quiet = 0;
    let loud = 0;

    for (let i = 1; i < 100; i++) {
      quiet = Math.max(quiet, Math.abs(waveSample(i / 100, 2, 0, 0)));
      loud = Math.max(loud, Math.abs(waveSample(i / 100, 2, 1, 0)));
    }

    expect(quiet).toBeLessThan(0.06);
    expect(loud).toBeGreaterThan(0.5);
    expect(loud).toBeLessThanOrEqual(1);
  });
});

describe('syntheticVoice', () => {
  it('уровень в 0…1, есть и слоги, и паузы', () => {
    const values = Array.from({ length: 600 }, (_, i) => syntheticVoice(i / 60));

    expect(Math.min(...values)).toBe(0);
    expect(Math.max(...values)).toBeGreaterThan(0.5);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });
});
