import { addDays, type IsoDate } from '../calendar/calendar-date';
import { toMinutes, type IsoTime } from '../time-picker/time';

/*
 * Раскладка экрана событий — чистые функции. Многодневные и «весь день» — полосами через дни недели
 * (как у календарей Google и Apple), события со временем в неделе — колонками там, где они пересекаются.
 */

export interface CalendarEventBase {
  id: string;
  /** Первый день */
  start: IsoDate;
  /** Последний день включительно; по умолчанию — `start` */
  end?: IsoDate;
  /** Начало `HH:MM`; без него событие — на весь день */
  startTime?: IsoTime;
  /** Конец `HH:MM`; по умолчанию — час после начала */
  endTime?: IsoTime;
  /** На весь день, даже если время указано */
  allDay?: boolean;
}

export function eventEnd(event: CalendarEventBase): IsoDate {
  return event.end && event.end > event.start ? event.end : event.start;
}

/** Полосой через дни: весь день, без времени или дольше одного дня */
export function isSpanning(event: CalendarEventBase): boolean {
  return event.allDay === true || !event.startTime || eventEnd(event) > event.start;
}

export interface LaneBar<T> {
  event: T;
  /** Колонка дня недели 0–6 */
  column: number;
  span: number;
  row: number;
  /** Событие началось раньше этой недели / продолжается после неё — край полосы без скругления */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface WeekLanes<T> {
  bars: LaneBar<T>[];
  /** Сколько событий не влезло в каждый день — «ещё N» */
  hidden: number[];
  /** Сколько строк занято (не больше `maxRows`) */
  rows: number;
}

function laneOrder(a: CalendarEventBase, b: CalendarEventBase): number {
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;

  const spanA = eventEnd(a) > a.start;
  const spanB = eventEnd(b) > b.start;

  // Длинные первыми: полоса через несколько дней держит верхние строки, короткие заполняют дыры под ней
  if (eventEnd(a) !== eventEnd(b)) return eventEnd(a) > eventEnd(b) ? -1 : 1;
  if (spanA !== spanB) return spanA ? -1 : 1;
  if (isSpanning(a) !== isSpanning(b)) return isSpanning(a) ? -1 : 1;

  return (a.startTime ?? '') < (b.startTime ?? '')
    ? -1
    : (a.startTime ?? '') > (b.startTime ?? '')
      ? 1
      : 0;
}

/**
 * Полосы недели: каждое событие — в первую строку, где свободны все его дни. Не влезло в `maxRows` —
 * считается в «ещё N» каждого своего дня. `days` — семь дней недели по порядку.
 */
export function layoutWeekLanes<T extends CalendarEventBase>(
  days: readonly IsoDate[],
  events: readonly T[],
  maxRows = Infinity,
): WeekLanes<T> {
  const first = days[0];
  const last = days.at(-1);
  const hidden = days.map(() => 0);

  if (!first || !last) return { bars: [], hidden, rows: 0 };

  const inWeek = events
    .filter((event) => event.start <= last && eventEnd(event) >= first)
    .sort(laneOrder);
  const taken: boolean[][] = [];
  const bars: LaneBar<T>[] = [];

  for (const event of inWeek) {
    const from = event.start < first ? 0 : days.indexOf(event.start);
    const to = eventEnd(event) > last ? days.length - 1 : days.indexOf(eventEnd(event));

    if (from < 0 || to < 0) continue;

    let row = 0;

    while (taken[row]?.slice(from, to + 1).some(Boolean)) row += 1;

    if (row >= maxRows) {
      for (let column = from; column <= to; column += 1) hidden[column]! += 1;

      continue;
    }

    taken[row] ??= days.map(() => false);
    for (let column = from; column <= to; column += 1) taken[row]![column] = true;

    bars.push({
      event,
      column: from,
      span: to - from + 1,
      row,
      continuesBefore: event.start < first,
      continuesAfter: eventEnd(event) > last,
    });
  }

  return { bars, hidden, rows: taken.length };
}

export interface TimedBox<T> {
  event: T;
  /** Начало и длительность в минутах от полуночи */
  start: number;
  duration: number;
  /** Колонка внутри группы пересекающихся и их число */
  column: number;
  columns: number;
}

/** Короче этого событие рисуется всё равно этой высоты — иначе подпись не влезет */
export const MIN_DURATION = 20;

function minutesOf(event: CalendarEventBase): [number, number] {
  const start = event.startTime ? toMinutes(event.startTime) : 0;
  const end = event.endTime ? toMinutes(event.endTime) : start + 60;

  return [start, Math.max(end, start + 1)];
}

/**
 * События одного дня со временем — колонками. Группа — события, связанные пересечениями (цепочкой):
 * у всей группы одинаковая ширина колонки, иначе соседние плашки разной ширины читаются как разные дни.
 * Внутри группы событие встаёт в первую колонку, где предыдущее уже кончилось.
 */
export function layoutDayColumns<T extends CalendarEventBase>(events: readonly T[]): TimedBox<T>[] {
  const sorted = events
    .map((event) => {
      const [start, end] = minutesOf(event);

      return { event, start, end: Math.max(end, start + MIN_DURATION) };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const boxes: TimedBox<T>[] = [];
  let group: { item: (typeof sorted)[number]; column: number }[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const columns = columnEnds.length;

    for (const { item, column } of group) {
      boxes.push({
        event: item.event,
        start: item.start,
        duration: item.end - item.start,
        column,
        columns,
      });
    }

    group = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd && group.length) flush();

    let column = columnEnds.findIndex((end) => end <= item.start);

    if (column < 0) {
      column = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[column] = item.end;
    }

    group.push({ item, column });
    groupEnd = Math.max(group.length === 1 ? item.end : groupEnd, item.end);
  }

  if (group.length) flush();

  return boxes;
}

/** События со временем в этот день — для колонки недели */
export function timedOn<T extends CalendarEventBase>(events: readonly T[], day: IsoDate): T[] {
  return events.filter((event) => !isSpanning(event) && event.start === day);
}

/** Семь дней недели с `start` */
export function weekDays(start: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Сколько событий в день — для подписи дня скринридеру */
export function countOn(events: readonly CalendarEventBase[], day: IsoDate): number {
  return events.filter((event) => event.start <= day && eventEnd(event) >= day).length;
}
