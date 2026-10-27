import { describe, expect, it } from 'vitest';

import { meterRatio, meterSegments, meterTone } from './meter-model';

describe('meterRatio', () => {
  it('доля внутри шкалы', () => {
    expect(meterRatio(25, 0, 100)).toBe(0.25);
    expect(meterRatio(15, 10, 20)).toBe(0.5);
  });

  it('за пределами — прижимается к краю', () => {
    expect(meterRatio(-5, 0, 100)).toBe(0);
    expect(meterRatio(140, 0, 100)).toBe(1);
  });

  it('вырожденная шкала и NaN — пусто', () => {
    expect(meterRatio(5, 10, 10)).toBe(0);
    expect(meterRatio(5, 10, 0)).toBe(0);
    expect(meterRatio(Number.NaN, 0, 100)).toBe(0);
  });
});

describe('meterTone', () => {
  const thresholds = { warning: 80, danger: 95 };

  it('ниже порогов — акцент', () => {
    expect(meterTone(50, thresholds)).toBe('accent');
  });

  it('пороги включительно', () => {
    expect(meterTone(80, thresholds)).toBe('warning');
    expect(meterTone(95, thresholds)).toBe('danger');
  });

  it('danger сильнее warning, даже если пороги перепутаны', () => {
    expect(meterTone(90, { warning: 95, danger: 85 })).toBe('danger');
  });

  it('без порогов — всегда акцент', () => {
    expect(meterTone(1000, {})).toBe('accent');
  });
});

describe('low-is-bad', () => {
  const battery = { warning: 30, danger: 10 };

  it('мало — плохо, пороги включительно', () => {
    expect(meterTone(80, battery, 'low-is-bad')).toBe('accent');
    expect(meterTone(30, battery, 'low-is-bad')).toBe('warning');
    expect(meterTone(10, battery, 'low-is-bad')).toBe('danger');
    expect(meterTone(3, battery, 'low-is-bad')).toBe('danger');
  });

  it('по умолчанию — много плохо, как раньше', () => {
    expect(meterTone(30, battery)).toBe('danger');
  });
});

describe('meterSegments', () => {
  it('заполнено по доле, с округлением', () => {
    const segments = meterSegments(64, 0, 100, 10, {});

    expect(segments.filter((segment) => segment.filled)).toHaveLength(6);
    expect(segments).toHaveLength(10);
  });

  it('ненулевое значение — хотя бы одно деление, ноль — ни одного', () => {
    expect(meterSegments(3, 0, 100, 10, {}).filter((s) => s.filled)).toHaveLength(1);
    expect(meterSegments(0, 0, 100, 10, {}).filter((s) => s.filled)).toHaveLength(0);
    expect(meterSegments(100, 0, 100, 10, {}).every((s) => s.filled)).toBe(true);
  });

  it('зоны порогов по середине деления', () => {
    const high = meterSegments(0, 0, 100, 10, { warning: 80, danger: 95 });

    expect(high.map((s) => s.zone)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'warning',
      'danger',
    ]);

    const low = meterSegments(0, 0, 100, 5, { warning: 40, danger: 20 }, 'low-is-bad');

    expect(low.map((s) => s.zone)).toEqual(['danger', 'warning', null, null, null]);
  });

  it('дробное и отрицательное число делений', () => {
    expect(meterSegments(50, 0, 100, 4.7, {})).toHaveLength(4);
    expect(meterSegments(50, 0, 100, -2, {})).toEqual([]);
  });
});
