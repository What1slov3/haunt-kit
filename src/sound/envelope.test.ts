import { describe, expect, it } from 'vitest';

import { envelopeAt, envelopeDuration, envelopeSteps, SILENCE, type Envelope } from './envelope';

const full: Envelope = {
  attack: 0.01,
  hold: 0.02,
  decay: 0.1,
  sustain: 0.5,
  sustainTime: 0.05,
  release: 0.04,
};

describe('envelopeDuration', () => {
  it('сумма всех фаз', () => {
    expect(envelopeDuration(full)).toBeCloseTo(0.22);
    expect(envelopeDuration({ attack: 0.002, decay: 0.03 })).toBeCloseTo(0.032);
  });
});

describe('envelopeSteps', () => {
  it('точки по фазам: тишина, пик, удержание, спад, sustain, ноль', () => {
    const steps = envelopeSteps(full, 0.8);

    expect(steps.map((step) => step.curve)).toEqual([
      'set',
      'linear',
      'set',
      'exponential',
      'set',
      'linear',
    ]);
    expect(steps[1]).toMatchObject({ value: 0.8 });
    expect(steps[3]!.value).toBeCloseTo(0.4);
    expect(steps.at(-1)).toMatchObject({ value: 0 });
    expect(steps.at(-1)!.time).toBeCloseTo(0.22);
  });

  it('ударная огибающая без sustain спадает к «тишине», а не к нулю — экспонента не принимает 0', () => {
    const steps = envelopeSteps({ attack: 0.002, decay: 0.03 }, 1);

    expect(steps).toHaveLength(3);
    expect(steps.at(-1)).toMatchObject({ value: SILENCE, curve: 'exponential' });
  });

  it('время идёт только вперёд', () => {
    const times = envelopeSteps(full, 1).map((step) => step.time);

    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe('envelopeAt', () => {
  it('атака линейная, пик в конце атаки', () => {
    expect(envelopeAt(full, 0.005, 1)).toBeCloseTo(0.5, 2);
    expect(envelopeAt(full, 0.01, 1)).toBeCloseTo(1);
    expect(envelopeAt(full, 0.02, 1)).toBeCloseTo(1);
  });

  it('спад экспоненциальный: середина — геометрическое среднее', () => {
    const mid = envelopeAt(full, 0.03 + 0.05, 1);

    expect(mid).toBeCloseTo(Math.sqrt(1 * 0.5), 3);
  });

  it('до начала и после конца — тишина; громкость масштабирует', () => {
    expect(envelopeAt(full, -1)).toBe(0);
    expect(envelopeAt(full, 1)).toBe(0);
    expect(envelopeAt(full, 0.01, 0.3)).toBeCloseTo(0.3);
  });
});
