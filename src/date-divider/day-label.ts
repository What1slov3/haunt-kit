const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Сколько календарных дней назад по местному времени: 0 — сегодня, 1 — вчера, −1 — завтра */
export function daysAgo(date: Date, now: Date): number {
  // round, а не floor: в день перевода часов сутки длятся 23 или 25 часов
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY);
}

export interface DayLabelOptions {
  /** «Сегодня» и «вчера» вместо даты; по умолчанию да */
  relative?: boolean;
}

/**
 * Подпись дня в ленте: «сегодня», «вчера», иначе день недели и дата — «понедельник, 26 октября»; год — только
 * если не текущий. Слова и порядок — из Intl для локали, своих строк нет.
 */
export function dayLabel(
  date: Date,
  now: Date,
  locale: string,
  { relative = true }: DayLabelOptions = {},
): string {
  if (Number.isNaN(date.getTime())) return '';

  const days = daysAgo(date, now);

  if (relative && (days === 0 || days === 1)) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}
