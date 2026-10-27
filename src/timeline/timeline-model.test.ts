import { describe, expect, it } from 'vitest';

import { dayLabelKind, formatDayDate, groupTimeline, localDayKey } from './timeline-model';

// Даты — местным конструктором: день в ленте местный, и тест не зависит от пояса машины
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

const events = [
  { id: 'a', date: at(26, 9), type: 'join' },
  { id: 'b', date: at(26, 10), type: 'join' },
  { id: 'c', date: at(26, 11), type: 'join' },
  { id: 'd', date: at(26, 12), type: 'message' },
  { id: 'e', date: at(25, 23, 50), type: 'join' },
  { id: 'f', date: at(25, 8), type: 'role', groupKey: 'mods' },
  { id: 'g', date: at(25, 7), type: 'role', groupKey: 'admins' },
];

describe('groupTimeline', () => {
  it('по дням, новые сверху', () => {
    const days = groupTimeline(events, { groupSimilar: false });

    expect(days.map((day) => day.key)).toEqual(['2026-10-26', '2026-10-25']);
    expect(
      days[0]!.entries.map((entry) => (entry.kind === 'event' ? entry.event.id : entry.id)),
    ).toEqual(['d', 'c', 'b', 'a']);
  });

  it('похожие подряд — группой с первого', () => {
    const [today] = groupTimeline(events);

    expect(today!.entries).toHaveLength(2);
    expect(today!.entries[1]).toMatchObject({ kind: 'group', id: 'c' });
    expect((today!.entries[1] as { events: unknown[] }).events).toHaveLength(3);
  });

  it('группа не переходит через день и разный groupKey', () => {
    const days = groupTimeline(events);

    expect(days[1]!.entries.every((entry) => entry.kind === 'event')).toBe(true);
  });

  it('два похожих — ещё не группа; порог настраивается', () => {
    const two = events.slice(0, 2);

    expect(groupTimeline(two)[0]!.entries.every((entry) => entry.kind === 'event')).toBe(true);
    expect(groupTimeline(two, { minGroup: 2 })[0]!.entries[0]!.kind).toBe('group');
  });

  it('старые сверху и некорректные даты отброшены', () => {
    const days = groupTimeline([...events, { id: 'x', date: 'не дата' }], {
      order: 'asc',
      groupSimilar: false,
    });

    expect(days[0]!.key).toBe('2026-10-25');
    expect(days.flatMap((day) => day.entries)).toHaveLength(7);
  });
});

describe('подписи дней', () => {
  const now = at(26, 15);

  it('сегодня, вчера, дата', () => {
    expect(dayLabelKind(at(26, 0, 5), now)).toBe('today');
    expect(dayLabelKind(at(25, 23), now)).toBe('yesterday');
    expect(dayLabelKind(at(20, 12), now)).toBe('date');
    expect(localDayKey(at(1, 0))).toBe('2026-10-01');
  });

  it('год — только у прошлых лет', () => {
    expect(formatDayDate(at(20, 12), now, 'ru')).toBe('20 октября');
    expect(formatDayDate(new Date(2025, 0, 3, 12), now, 'ru')).toMatch(/2025/);
  });
});
