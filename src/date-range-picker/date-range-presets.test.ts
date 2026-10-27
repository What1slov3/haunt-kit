import { describe, expect, it } from 'vitest';

import { weekday } from '../calendar/calendar-date';

import { defaultDateRangePresets, resolvePreset } from './date-range-presets';

const preset = (id: string) => {
  const found = defaultDateRangePresets.find((item) => item.id === id);

  if (!found) throw new Error(id);

  return found;
};

describe('пресеты по умолчанию', () => {
  const today = '2026-10-26';

  it('считаются от сегодня включительно', () => {
    expect(preset('today').range(today)).toEqual({ start: today, end: today });
    expect(preset('last-7-days').range(today)).toEqual({ start: '2026-10-20', end: today });
    expect(preset('last-30-days').range(today)).toEqual({ start: '2026-09-27', end: today });
    expect(preset('this-month').range(today)).toEqual({ start: '2026-10-01', end: today });
  });

  it('через границу года', () => {
    expect(preset('last-7-days').range('2027-01-03')).toEqual({
      start: '2026-12-28',
      end: '2027-01-03',
    });
  });
});

describe('resolvePreset', () => {
  const today = '2026-10-26';

  it('без ограничений — как есть', () => {
    expect(resolvePreset(preset('last-7-days'), today)).toEqual({
      start: '2026-10-20',
      end: today,
    });
  });

  it('обрезается по min и max', () => {
    expect(resolvePreset(preset('last-30-days'), today, { min: '2026-10-15' })).toEqual({
      start: '2026-10-15',
      end: today,
    });
    expect(resolvePreset(preset('last-7-days'), today, { max: '2026-10-22' })).toEqual({
      start: '2026-10-20',
      end: '2026-10-22',
    });
  });

  it('целиком за границей — недоступен', () => {
    expect(resolvePreset(preset('today'), today, { min: '2026-11-01' })).toBeNull();
    expect(resolvePreset(preset('last-7-days'), today, { max: '2026-10-01' })).toBeNull();
  });

  it('выключенный день внутри делает пресет недоступным, если не разрешено иное', () => {
    const weekend = (day: string) => [0, 6].includes(weekday(day));

    // 2026-10-20 — вторник, 24–25 — выходные
    expect(resolvePreset(preset('last-7-days'), today, { isDateDisabled: weekend })).toBeNull();
    expect(
      resolvePreset(preset('last-7-days'), today, {
        isDateDisabled: weekend,
        allowDisabledInRange: true,
      }),
    ).toEqual({ start: '2026-10-20', end: today });
  });

  it('выключенный конец — недоступен даже с allowDisabledInRange', () => {
    expect(
      resolvePreset(preset('today'), today, {
        isDateDisabled: (day) => day === today,
        allowDisabledInRange: true,
      }),
    ).toBeNull();
  });
});
