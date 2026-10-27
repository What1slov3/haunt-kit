import { describe, expect, it } from 'vitest';

import {
  countOn,
  isSpanning,
  layoutDayColumns,
  layoutWeekLanes,
  timedOn,
  weekDays,
  type CalendarEventBase,
} from './calendar-view-layout';

// Неделя с понедельника 2026-10-19
const days = weekDays('2026-10-19');

const ev = (
  id: string,
  start: string,
  rest: Partial<CalendarEventBase> = {},
): CalendarEventBase => ({
  id,
  start,
  ...rest,
});

describe('isSpanning', () => {
  it('весь день, без времени и многодневные — полосой', () => {
    expect(isSpanning(ev('a', '2026-10-19'))).toBe(true);
    expect(isSpanning(ev('b', '2026-10-19', { startTime: '10:00', end: '2026-10-20' }))).toBe(true);
    expect(isSpanning(ev('c', '2026-10-19', { startTime: '10:00', allDay: true }))).toBe(true);
    expect(isSpanning(ev('d', '2026-10-19', { startTime: '10:00' }))).toBe(false);
  });
});

describe('layoutWeekLanes', () => {
  it('многодневное — одной полосой, соседи — в свободные строки', () => {
    const { bars, rows } = layoutWeekLanes(days, [
      ev('long', '2026-10-20', { end: '2026-10-23' }),
      ev('tue', '2026-10-20'),
      ev('mon', '2026-10-19'),
      ev('sat', '2026-10-24'),
    ]);
    const byId = Object.fromEntries(bars.map((bar) => [bar.event.id, bar]));

    expect(byId.long).toMatchObject({ column: 1, span: 4, row: 0 });
    expect(byId.tue).toMatchObject({ column: 1, row: 1 });
    expect(byId.mon).toMatchObject({ column: 0, row: 0 });
    expect(byId.sat).toMatchObject({ column: 5, row: 0 });
    expect(rows).toBe(2);
  });

  it('событие через границу недели обрезается и помечается', () => {
    const { bars } = layoutWeekLanes(days, [ev('trip', '2026-10-15', { end: '2026-10-28' })]);

    expect(bars[0]).toMatchObject({
      column: 0,
      span: 7,
      continuesBefore: true,
      continuesAfter: true,
    });
  });

  it('не влезло в maxRows — «ещё N» по дням', () => {
    const { bars, hidden } = layoutWeekLanes(
      days,
      [
        ev('a', '2026-10-21'),
        ev('b', '2026-10-21'),
        ev('c', '2026-10-21'),
        ev('d', '2026-10-21', { end: '2026-10-22' }),
      ],
      2,
    );

    expect(bars).toHaveLength(2);
    expect(hidden).toEqual([0, 0, 2, 0, 0, 0, 0]);
    expect(bars[0]!.event.id).toBe('d');
  });

  it('вне недели — пусто', () => {
    expect(layoutWeekLanes(days, [ev('x', '2026-11-01')]).bars).toEqual([]);
  });
});

describe('layoutDayColumns', () => {
  it('не пересекаются — по одной колонке', () => {
    const boxes = layoutDayColumns([
      ev('a', '2026-10-19', { startTime: '09:00', endTime: '10:00' }),
      ev('b', '2026-10-19', { startTime: '10:00', endTime: '11:00' }),
    ]);

    expect(boxes.map((box) => [box.event.id, box.column, box.columns])).toEqual([
      ['a', 0, 1],
      ['b', 0, 1],
    ]);
  });

  it('пересечения — колонками, у всей цепочки одна ширина', () => {
    const boxes = layoutDayColumns([
      ev('a', '2026-10-19', { startTime: '09:00', endTime: '11:00' }),
      ev('b', '2026-10-19', { startTime: '09:30', endTime: '10:00' }),
      ev('c', '2026-10-19', { startTime: '10:30', endTime: '12:00' }),
      ev('d', '2026-10-19', { startTime: '13:00' }),
    ]);
    const byId = Object.fromEntries(boxes.map((box) => [box.event.id, box]));

    expect(byId.a).toMatchObject({ column: 0, columns: 2, start: 540, duration: 120 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    // c начинается после конца b — встаёт в его колонку
    expect(byId.c).toMatchObject({ column: 1, columns: 2 });
    expect(byId.d).toMatchObject({ column: 0, columns: 1, duration: 60 });
  });

  it('короткое — не ниже минимальной высоты', () => {
    expect(
      layoutDayColumns([ev('a', '2026-10-19', { startTime: '09:00', endTime: '09:05' })])[0]!
        .duration,
    ).toBe(20);
  });

  it('timedOn и countOn', () => {
    const list = [
      ev('a', '2026-10-19', { startTime: '09:00' }),
      ev('b', '2026-10-19'),
      ev('c', '2026-10-18', { end: '2026-10-20' }),
    ];

    expect(timedOn(list, '2026-10-19').map((item) => item.id)).toEqual(['a']);
    expect(countOn(list, '2026-10-19')).toBe(3);
  });
});
