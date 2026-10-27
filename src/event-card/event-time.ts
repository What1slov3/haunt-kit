import { toDate, type TimestampInput } from '../timestamp/timestamp-format';

export type EventPhase = 'upcoming' | 'live' | 'ended';

export interface DateTileParts {
  /** День месяца числом: «14» */
  day: string;
  /** Месяц коротко, без точки сокращения: «мар», «Mar» */
  month: string;
  /** День недели коротко: «пт», «Fri» */
  weekday: string;
}

/** Плитка даты: день крупно, месяц и день недели мелко. `timeZone` — для тестов и событий в чужом поясе */
export function dateTileParts(date: Date, locale: string, timeZone?: string): DateTileParts {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date).replace(/\.$/, '');

  return {
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
    weekday: part({ weekday: 'short' }),
  };
}

/** Фаза события. Без конца после начала оно «идёт»: когда оно закончилось, знает только приложение */
export function eventPhase(
  start: TimestampInput,
  end: TimestampInput | undefined,
  now: Date,
): EventPhase {
  const from = toDate(start).getTime();
  const to = end === undefined ? undefined : toDate(end).getTime();
  const at = now.getTime();

  if (at < from) return 'upcoming';
  if (to === undefined || at < to) return 'live';

  return 'ended';
}

/** Длительность часами и минутами, округление до минуты */
export function durationParts(
  start: TimestampInput,
  end: TimestampInput,
): { hours: number; minutes: number } {
  const total = Math.max(0, Math.round((toDate(end).getTime() - toDate(start).getTime()) / 60_000));

  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** «19:00–21:00»; без конца — только начало. Даты разных дней — у конца ещё и дата */
export function timeRange(
  start: TimestampInput,
  end: TimestampInput | undefined,
  locale: string,
  timeZone?: string,
): string {
  const clock = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone });
  const from = toDate(start);

  if (end === undefined) return clock.format(from);

  const to = toDate(end);
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone });
  const sameDay = day.format(from) === day.format(to);

  return `${clock.format(from)}–${sameDay ? '' : `${day.format(to)}, `}${clock.format(to)}`;
}
