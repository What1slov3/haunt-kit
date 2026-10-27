import { describe, expect, it } from 'vitest';

import { dayLabel, daysAgo } from './day-label';

// Местное время: граница дня — та, что видит пользователь
const now = new Date(2026, 9, 27, 0, 30);

describe('daysAgo', () => {
  it('по календарю, а не по 24 часам', () => {
    expect(daysAgo(new Date(2026, 9, 26, 23, 59), now)).toBe(1);
    expect(daysAgo(new Date(2026, 9, 27, 0, 0), now)).toBe(0);
    expect(daysAgo(new Date(2026, 9, 28, 12, 0), now)).toBe(-1);
    expect(daysAgo(new Date(2026, 8, 27), now)).toBe(30);
  });
});

describe('dayLabel', () => {
  it('сегодня и вчера — словами локали', () => {
    expect(dayLabel(new Date(2026, 9, 27, 0, 5), now, 'ru')).toBe('сегодня');
    expect(dayLabel(new Date(2026, 9, 26, 23, 0), now, 'ru')).toBe('вчера');
    expect(dayLabel(new Date(2026, 9, 26, 23, 0), now, 'en')).toBe('yesterday');
  });

  it('раньше — день недели и дата без года', () => {
    expect(dayLabel(new Date(2026, 9, 25), now, 'ru')).toBe('воскресенье, 25 октября');
    expect(dayLabel(new Date(2026, 9, 25), now, 'en')).toBe('Sunday, October 25');
  });

  it('год — только если не текущий', () => {
    expect(dayLabel(new Date(2025, 9, 26), now, 'en')).toBe('Sunday, October 26, 2025');
  });

  it('relative: false — дата и для сегодня', () => {
    expect(dayLabel(new Date(2026, 9, 27), now, 'ru', { relative: false })).toBe(
      'вторник, 27 октября',
    );
  });

  it('неверная дата — пусто', () => {
    expect(dayLabel(new Date(Number.NaN), now, 'ru')).toBe('');
  });
});
