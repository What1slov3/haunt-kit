import { describe, expect, it } from 'vitest';

import { countUnread, dayLabel, filterNotifications, groupByDay } from './inbox-groups';

const now = new Date(2026, 9, 26, 15, 0);

describe('dayLabel', () => {
  it('сегодня и вчера — словами, с заглавной', () => {
    expect(dayLabel(new Date(2026, 9, 26, 0, 5), now)).toBe('Сегодня');
    expect(dayLabel(new Date(2026, 9, 25, 23, 59), now)).toBe('Вчера');
  });

  it('другие языки — словами своего языка', () => {
    expect(dayLabel(new Date(2026, 9, 26, 9), now, 'en')).toBe('Today');
    expect(dayLabel(new Date(2026, 9, 25, 9), now, 'en')).toBe('Yesterday');
  });

  it('раньше — дата без года, в другом году — с годом', () => {
    expect(dayLabel(new Date(2026, 9, 24, 12), now)).toBe('24 октября');
    expect(dayLabel(new Date(2025, 11, 31, 12), now)).toBe('31 декабря 2025 г.');
  });

  it('будущее — датой', () => {
    expect(dayLabel(new Date(2026, 9, 28, 12), now)).toBe('28 октября');
  });
});

const items = [
  { id: 'a', time: new Date(2026, 9, 26, 14, 0), unread: true },
  { id: 'b', time: new Date(2026, 9, 25, 10, 0), mention: true },
  { id: 'c', time: new Date(2026, 9, 26, 9, 0), unread: true, mention: true },
  { id: 'd', time: new Date(2026, 9, 20, 9, 0) },
];

describe('filterNotifications', () => {
  it('все, упоминания, непрочитанные', () => {
    expect(filterNotifications(items, 'all').map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterNotifications(items, 'mentions').map((item) => item.id)).toEqual(['b', 'c']);
    expect(filterNotifications(items, 'unread').map((item) => item.id)).toEqual(['a', 'c']);
  });
});

describe('countUnread', () => {
  it('считает непрочитанные', () => {
    expect(countUnread(items)).toBe(2);
    expect(countUnread([])).toBe(0);
  });
});

describe('groupByDay', () => {
  it('новые сверху, заголовок перед каждым днём', () => {
    const rows = groupByDay(items, now);

    expect(rows.map((row) => (row.type === 'day' ? row.label : row.item.id))).toEqual([
      'Сегодня',
      'a',
      'c',
      'Вчера',
      'b',
      '20 октября',
      'd',
    ]);
  });

  it('одно время — порядок прихода', () => {
    const same = new Date(2026, 9, 26, 12);
    const rows = groupByDay(
      [
        { id: 'x', time: same },
        { id: 'y', time: same },
      ],
      now,
    );

    expect(rows.map((row) => row.key)).toEqual([rows[0]?.key, 'x', 'y']);
  });

  it('ISO-строки и миллисекунды', () => {
    const rows = groupByDay(
      [
        { id: 'iso', time: new Date(2026, 9, 25, 8).toISOString() },
        { id: 'ms', time: new Date(2026, 9, 26, 8).getTime() },
      ],
      now,
    );

    expect(rows.map((row) => (row.type === 'day' ? row.label : row.item.id))).toEqual([
      'Сегодня',
      'ms',
      'Вчера',
      'iso',
    ]);
  });

  it('пусто — без строк', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
