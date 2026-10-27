/*
 * Диапазон дат календаря. Концы включительно, `start <= end` всегда: строки ISO сравниваются обычным `<`,
 * поэтому порядок кликов не важен — второй клик раньше первого просто меняет концы местами.
 */

import { addDays, addMonths, startOfMonth, type IsoDate } from './calendar-date';

export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

/** Где день стоит в диапазоне: `single` — диапазон из одного дня */
export type RangePosition = 'single' | 'start' | 'end' | 'middle';

/** Насколько далеко от начала можно растянуть диапазон; без поля — граница дальше просмотренных дней */
export interface RangeBounds {
  from?: IsoDate;
  to?: IsoDate;
}

export function normalizeRange(a: IsoDate, b: IsoDate): DateRange {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function isSameRange(a: DateRange | null, b: DateRange | null): boolean {
  return a?.start === b?.start && a?.end === b?.end;
}

export function rangePosition(day: IsoDate, range: DateRange | null): RangePosition | null {
  if (!range || day < range.start || day > range.end) return null;
  if (range.start === range.end) return 'single';
  if (day === range.start) return 'start';
  if (day === range.end) return 'end';

  return 'middle';
}

/**
 * Края, до которых диапазон растягивается от `anchor`, не перешагивая выключенный день: занятая дата
 * посреди периода делает период недействительным. Обход идёт только по `[scanFrom, scanTo]` — по
 * видимым дням: дальше человек всё равно не может кликнуть, а `isBlocked` бывает дорогим.
 */
export function rangeBounds(
  anchor: IsoDate,
  isBlocked: (day: IsoDate) => boolean,
  scanFrom: IsoDate,
  scanTo: IsoDate,
): RangeBounds {
  const bounds: RangeBounds = {};
  let day = anchor;

  while (day > scanFrom) {
    const previous = addDays(day, -1);

    if (isBlocked(previous)) {
      bounds.from = day;
      break;
    }

    day = previous;
  }

  day = anchor;

  while (day < scanTo) {
    const next = addDays(day, 1);

    if (isBlocked(next)) {
      bounds.to = day;
      break;
    }

    day = next;
  }

  return bounds;
}

export function isWithinBounds(day: IsoDate, { from, to }: RangeBounds): boolean {
  return (!from || day >= from) && (!to || day <= to);
}

/** Что показать, пока выбран только первый конец: от него до дня под курсором, но не за край */
export function previewRange(anchor: IsoDate, target: IsoDate, bounds: RangeBounds): DateRange {
  let end = target;

  if (bounds.from && end < bounds.from) end = bounds.from;
  if (bounds.to && end > bounds.to) end = bounds.to;

  return normalizeRange(anchor, end);
}

/**
 * Первый показанный месяц при нескольких месяцах рядом: окно сдвигается ровно настолько, чтобы день в
 * фокусе остался в нём. Иначе стрелка с последнего дня левого месяца перелистывала бы оба.
 */
export function visibleStartMonth(start: IsoDate, focused: IsoDate, months: number): IsoDate {
  const first = startOfMonth(start);

  if (focused < first) return startOfMonth(focused);
  if (focused >= addMonths(first, months)) return startOfMonth(addMonths(focused, 1 - months));

  return first;
}
