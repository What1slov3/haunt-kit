export type TimestampInput = Date | string | number;

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** До этой разницы — «сейчас»: секунды в ленте сообщений только отвлекают */
const JUST_NOW = 45 * SECOND;

/** Пока в подписи минуты — обновлять раз в 30 с: точнее не нужно, а чаще — лишние рендеры */
export const MINUTES_REFRESH = 30 * SECOND;

/** Часы меняются редко: раз в 5 минут достаточно */
export const HOURS_REFRESH = 5 * MINUTE;

/*
 * Связка «вчера в 12:40»: в Intl её нет (DateTimeFormat не знает «вчера», RelativeTimeFormat — время),
 * поэтому слово-связка — по языку, а для незнакомого — запятая: «yesterday, 12:40» читается везде.
 */
const AT_WORD: Record<string, string> = { ru: 'в', en: 'at', uk: 'о', be: 'у' };

const formatters = new Map<
  string,
  Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat
>();

// Конструкторы Intl дороги, а список сообщений пересчитывает сотни подписей раз в 30 с — кешируем
function cached<T extends Intl.DateTimeFormat | Intl.NumberFormat | Intl.RelativeTimeFormat>(
  key: string,
  create: () => T,
): T {
  let formatter = formatters.get(key) as T | undefined;

  if (!formatter) {
    formatter = create();
    formatters.set(key, formatter);
  }

  return formatter;
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return cached(
    `d|${locale}|${JSON.stringify(options)}`,
    () => new Intl.DateTimeFormat(locale, options),
  );
}

function relativeFormat(locale: string): Intl.RelativeTimeFormat {
  return cached(
    `r|${locale}`,
    () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' }),
  );
}

/** «5 мин», «3 ч» — без «назад»: компактно, как время в ленте Discord и Linear */
function unitFormat(locale: string, unit: 'minute' | 'hour', value: number): string {
  return cached(
    `u|${locale}|${unit}`,
    () => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }),
  ).format(value);
}

export function toDate(input: TimestampInput): Date {
  return input instanceof Date ? input : new Date(input);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Сколько календарных дней назад (локальное время); round — переход на летнее время даёт сутки 23 или 25 ч */
function calendarDaysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY);
}

function msUntilMidnight(now: Date): number {
  return startOfDay(now) + DAY - now.getTime();
}

export function formatClock(date: Date, locale: string): string {
  return dateFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDate(date: Date, locale: string, withYear = true): string {
  return dateFormat(
    locale,
    withYear
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short' },
  ).format(date);
}

/** Полная дата и время — для подсказки */
export function formatExact(date: Date, locale: string): string {
  return dateFormat(locale, { dateStyle: 'full', timeStyle: 'medium' }).format(date);
}

function withTime(day: string, date: Date, locale: string): string {
  const at = AT_WORD[locale.split('-')[0]?.toLowerCase() ?? ''];
  const clock = formatClock(date, locale);

  return at ? `${day} ${at} ${clock}` : `${day}, ${clock}`;
}

/**
 * Относительная подпись: «сейчас», «5 мин», «3 ч», «вчера в 12:40», «12 мар.», «12 мар. 2025 г.».
 * Будущее — «через 5 мин.», «завтра в 12:40». `now` — параметром: функция чистая и тестируется
 * с фиксированным «сейчас».
 */
export function formatRelative(date: Date, now: Date, locale = 'ru'): string {
  const diff = now.getTime() - date.getTime();
  const abs = Math.abs(diff);

  if (abs < JUST_NOW) return relativeFormat(locale).format(0, 'second');

  const days = calendarDaysAgo(date, now);

  if (diff > 0) {
    if (diff < HOUR) return unitFormat(locale, 'minute', Math.max(1, Math.floor(diff / MINUTE)));
    if (days === 0) return unitFormat(locale, 'hour', Math.floor(diff / HOUR));
    if (days === 1) return withTime(relativeFormat(locale).format(-1, 'day'), date, locale);
  } else {
    if (abs < HOUR) {
      return relativeFormat(locale).format(Math.max(1, Math.floor(abs / MINUTE)), 'minute');
    }

    if (days === 0) return relativeFormat(locale).format(Math.floor(abs / HOUR), 'hour');
    if (days === -1) return withTime(relativeFormat(locale).format(1, 'day'), date, locale);
  }

  return formatDate(date, locale, date.getFullYear() !== now.getFullYear());
}

/**
 * Через сколько мс подпись может измениться; `null` — уже не изменится (старая дата). Подпись с
 * минутами — каждые 30 с, с часами — раз в 5 мин, «вчера» — в полночь, когда станет датой.
 */
export function refreshDelay(date: Date, now: Date): number | null {
  const abs = Math.abs(now.getTime() - date.getTime());

  if (abs < HOUR) return MINUTES_REFRESH;

  const days = calendarDaysAgo(date, now);
  const untilMidnight = msUntilMidnight(now);

  if (days === 0) return Math.min(HOURS_REFRESH, untilMidnight);
  if (days === 1 || days === -1) return untilMidnight;

  return null;
}
