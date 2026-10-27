/*
 * Даты календаря — «простые» даты без времени и часового пояса, строкой ISO `YYYY-MM-DD`. Строка
 * сериализуется в стор и протокол как есть, сравнивается обычным `<` и не сдвигается на день у
 * человека в другом поясе. Арифметика — через UTC: в UTC нет перевода часов, сутки всегда 24 часа.
 */

/** Дата `YYYY-MM-DD` */
export type IsoDate = string;

/** День недели: 0 — воскресенье … 6 — суббота, как у `Date.getDay()` */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PlainDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

const DAY_MS = 86_400_000;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function toIsoDate({ year, month, day }: PlainDate): IsoDate {
  const pad = (value: number, length: number) => String(value).padStart(length, '0');

  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** null — не дата или несуществующий день (`2026-02-30`) */
export function parseIsoDate(value: string): PlainDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

function parseOrThrow(value: IsoDate): PlainDate {
  const date = parseIsoDate(value);

  if (!date) throw new Error(`Ожидалась дата YYYY-MM-DD, пришло «${value}»`);

  return date;
}

/** Через setUTCFullYear, а не Date.UTC: тот читает годы 0–99 как 1900–1999 */
function toUtc({ year, month, day }: PlainDate): Date {
  const date = new Date(0);

  date.setUTCFullYear(year, month - 1, day);

  return date;
}

function fromUtc(date: Date): IsoDate {
  return toIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function addDays(value: IsoDate, days: number): IsoDate {
  return fromUtc(new Date(toUtc(parseOrThrow(value)).getTime() + days * DAY_MS));
}

/** Месяцы вперёд/назад; 31 января + 1 месяц = последний день февраля, а не 3 марта */
export function addMonths(value: IsoDate, months: number): IsoDate {
  const { year, month, day } = parseOrThrow(value);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index - nextYear * 12 + 1;

  return toIsoDate({
    year: nextYear,
    month: nextMonth,
    day: Math.min(day, daysInMonth(nextYear, nextMonth)),
  });
}

export function addYears(value: IsoDate, years: number): IsoDate {
  return addMonths(value, years * 12);
}

export function weekday(value: IsoDate): Weekday {
  return toUtc(parseOrThrow(value)).getUTCDay() as Weekday;
}

export function startOfWeek(value: IsoDate, weekStartsOn: Weekday): IsoDate {
  return addDays(value, -((weekday(value) - weekStartsOn + 7) % 7));
}

export function endOfWeek(value: IsoDate, weekStartsOn: Weekday): IsoDate {
  return addDays(startOfWeek(value, weekStartsOn), 6);
}

export function startOfMonth(value: IsoDate): IsoDate {
  const { year, month } = parseOrThrow(value);

  return toIsoDate({ year, month, day: 1 });
}

export function endOfMonth(value: IsoDate): IsoDate {
  const { year, month } = parseOrThrow(value);

  return toIsoDate({ year, month, day: daysInMonth(year, month) });
}

export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Сегодня по местным часам — то, что человек видит на своём календаре */
export function todayIsoDate(now: Date = new Date()): IsoDate {
  return toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

export function clampDate(value: IsoDate, min?: IsoDate, max?: IsoDate): IsoDate {
  if (min && value < min) return min;
  if (max && value > max) return max;

  return value;
}

export function isOutOfRange(value: IsoDate, min?: IsoDate, max?: IsoDate): boolean {
  return Boolean((min && value < min) || (max && value > max));
}

/**
 * Сетка месяца: всегда 6 недель по 7 дней, с хвостами соседних месяцев. Шесть строк в любом месяце —
 * чтобы поповер с календарём не менял высоту при листании.
 */
export function monthGrid(month: IsoDate, weekStartsOn: Weekday): IsoDate[][] {
  const first = startOfWeek(startOfMonth(month), weekStartsOn);

  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)),
  );
}

export interface GridKey {
  key: string;
  shiftKey?: boolean;
}

/**
 * Куда уходит фокус в сетке по шаблону WAI-ARIA «date picker»: стрелки — день и неделя, PageUp/PageDown —
 * месяц (с Shift — год), Home/End — начало и конец недели. null — клавиша не сетки.
 */
export function moveByKey(
  value: IsoDate,
  { key, shiftKey }: GridKey,
  weekStartsOn: Weekday,
): IsoDate | null {
  switch (key) {
    case 'ArrowLeft':
      return addDays(value, -1);
    case 'ArrowRight':
      return addDays(value, 1);
    case 'ArrowUp':
      return addDays(value, -7);
    case 'ArrowDown':
      return addDays(value, 7);
    case 'PageUp':
      return shiftKey ? addYears(value, -1) : addMonths(value, -1);
    case 'PageDown':
      return shiftKey ? addYears(value, 1) : addMonths(value, 1);
    case 'Home':
      return startOfWeek(value, weekStartsOn);
    case 'End':
      return endOfWeek(value, weekStartsOn);
    default:
      return null;
  }
}

/*
 * Подписи — через Intl в поясе UTC: дата собрана в UTC, и форматирование в местном поясе показало бы
 * соседний день к западу от Гринвича.
 */
function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
}

/** Форматер под много дат сразу: Intl.DateTimeFormat дорог в создании, а в сетке месяца 42 подписи */
export function createDateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): (value: IsoDate) => string {
  const format = formatter(locale, options);

  return (value) => format.format(toUtc(parseOrThrow(value)));
}

export function formatIsoDate(
  value: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return createDateFormatter(locale, options)(value);
}

/**
 * Период одной подписью через `Intl.DateTimeFormat#formatRange`: общий месяц и год не повторяются
 * («1–7 октября 2026 г.»), а склонение и порядок частей — по правилам локали, не по нашему шаблону.
 */
export function formatIsoDateRange(
  start: IsoDate,
  end: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return formatter(locale, options).formatRange(
    toUtc(parseOrThrow(start)),
    toUtc(parseOrThrow(end)),
  );
}

export interface WeekdayLabel {
  /** «пн» */
  short: string;
  /** «понедельник» — для скринридера */
  long: string;
}

/** Подписи дней недели в порядке сетки */
export function weekdayLabels(locale: string, weekStartsOn: Weekday): WeekdayLabel[] {
  const short = formatter(locale, { weekday: 'short' });
  const long = formatter(locale, { weekday: 'long' });
  // 2023-01-01 — воскресенье: от него берётся нужный день недели
  const sunday = toUtc({ year: 2023, month: 1, day: 1 }).getTime();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday + ((weekStartsOn + index) % 7) * DAY_MS);

    return { short: short.format(date), long: long.format(date) };
  });
}

/** «Октябрь» — название месяца в именительном падеже, с заглавной */
export function monthName(month: IsoDate, locale: string): string {
  const name = formatIsoDate(startOfMonth(month), locale, { month: 'long' });

  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}
