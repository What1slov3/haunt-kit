import { describe, expect, it } from 'vitest';

import { nextTick, padPart, splitDuration } from './countdown-math';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

const values = (ms: number, options?: Parameters<typeof splitDuration>[1]) =>
  splitDuration(ms, options).parts.map((part) => `${part.value}${part.unit[0]}`);

describe('splitDuration', () => {
  it('раскладывает по дням, часам, минутам и секундам', () => {
    expect(values(2 * day + 3 * hour + 15 * minute + 9 * second)).toEqual([
      '2d',
      '3h',
      '15m',
      '9s',
    ]);
  });

  it('округляет вверх до младшей единицы', () => {
    expect(values(1500, { units: ['minutes', 'seconds'] })).toEqual(['0m', '2s']);
    expect(values(61.5 * minute, { units: ['hours', 'minutes'] })).toEqual(['1h', '2m']);
  });

  it('старшая единица вбирает остаток', () => {
    expect(values(50 * hour, { units: ['hours', 'minutes'] })).toEqual(['50h', '0m']);
  });

  it('единицы идут по старшинству, в каком бы порядке их ни передали', () => {
    expect(values(90 * second, { units: ['seconds', 'minutes'] })).toEqual(['1m', '30s']);
  });

  it('ноль и прошлое — событие началось', () => {
    expect(splitDuration(0).done).toBe(true);
    expect(splitDuration(-5000).done).toBe(true);
    expect(splitDuration(Number.NaN).done).toBe(true);
    expect(values(-5000)).toEqual(['0d', '0h', '0m', '0s']);
    expect(splitDuration(1).done).toBe(false);
  });

  it('trim убирает ведущие нули, оставляя minParts', () => {
    expect(values(5 * minute + 3 * second, { trim: true })).toEqual(['5m', '3s']);
    expect(values(3 * second, { trim: true })).toEqual(['0m', '3s']);
    expect(values(3 * second, { trim: true, minParts: 1 })).toEqual(['3s']);
    expect(values(hour, { trim: true })).toEqual(['1h', '0m', '0s']);
  });
});

describe('nextTick', () => {
  it('ставит таймер на смену показа', () => {
    expect(nextTick(5300)).toBe(300);
    expect(nextTick(5000)).toBe(1000);
    expect(nextTick(90 * second, ['hours', 'minutes'])).toBe(30 * second);
    expect(nextTick(0)).toBe(1000);
  });
});

describe('padPart', () => {
  it('старшая как есть, остальные двумя цифрами', () => {
    expect(padPart({ unit: 'hours', value: 3 }, true)).toBe('3');
    expect(padPart({ unit: 'minutes', value: 3 }, false)).toBe('03');
    expect(padPart({ unit: 'days', value: 120 }, false)).toBe('120');
  });
});
