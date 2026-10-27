import { toDate, type TimestampInput } from '../timestamp/timestamp-format';

/*
 * Лента уведомлений: фильтр вкладок и группировка по дням — чистыми функциями, «сейчас» параметром,
 * чтобы тесты не зависели от часов машины.
 */

export type InboxFilter = 'all' | 'mentions' | 'unread';

export interface InboxGroupable {
  id: string;
  time: TimestampInput;
  unread?: boolean;
  mention?: boolean;
}

export type InboxRow<T> =
  { type: 'day'; key: string; label: string } | { type: 'item'; key: string; item: T };

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Календарных дней между датой и «сейчас» в местном времени; round — сутки с переводом часов 23 или 25 ч */
function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY);
}

const formatters = new Map<string, Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function relative(locale: string): Intl.RelativeTimeFormat {
  const key = `r|${locale}`;
  let format = formatters.get(key) as Intl.RelativeTimeFormat | undefined;

  if (!format) {
    format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    formatters.set(key, format);
  }

  return format;
}

function dayDate(locale: string, withYear: boolean): Intl.DateTimeFormat {
  const key = `d|${locale}|${withYear}`;
  let format = formatters.get(key) as Intl.DateTimeFormat | undefined;

  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: withYear ? 'numeric' : undefined,
    });
    formatters.set(key, format);
  }

  return format;
}

/** Заголовок с заглавной: Intl отдаёт «сегодня», а над группой стоит «Сегодня» */
function capitalize(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/**
 * Заголовок дня: «Сегодня», «Вчера» — словами языка (Intl.RelativeTimeFormat), дальше — дата: «24
 * октября», в другом году — с годом. Будущие даты (часы на сервере спешат) — тоже датой.
 */
export function dayLabel(date: Date, now: Date, locale = 'ru'): string {
  const ago = daysAgo(date, now);

  if (ago === 0 || ago === 1) return capitalize(relative(locale).format(-ago, 'day'), locale);

  return dayDate(locale, date.getFullYear() !== now.getFullYear()).format(date);
}

export function filterNotifications<T extends InboxGroupable>(
  items: readonly T[],
  filter: InboxFilter,
): T[] {
  if (filter === 'mentions') return items.filter((item) => item.mention);
  if (filter === 'unread') return items.filter((item) => item.unread);

  return [...items];
}

export function countUnread(items: readonly InboxGroupable[]): number {
  return items.reduce((count, item) => count + (item.unread ? 1 : 0), 0);
}

/**
 * Строки ленты: новые сверху, перед первым уведомлением каждого дня — заголовок дня. Сортировка
 * устойчивая: уведомления одной секунды остаются в порядке, в котором пришли.
 */
export function groupByDay<T extends InboxGroupable>(
  items: readonly T[],
  now: Date,
  locale = 'ru',
): Array<InboxRow<T>> {
  const sorted = items
    .map((item, index) => ({ item, index, time: toDate(item.time).getTime() }))
    .sort((a, b) => b.time - a.time || a.index - b.index);

  const rows: Array<InboxRow<T>> = [];
  let currentDay: number | null = null;

  for (const { item, time } of sorted) {
    const date = new Date(time);
    const day = startOfDay(date);

    if (day !== currentDay) {
      currentDay = day;
      rows.push({ type: 'day', key: `day-${day}`, label: dayLabel(date, now, locale) });
    }

    rows.push({ type: 'item', key: item.id, item });
  }

  return rows;
}
