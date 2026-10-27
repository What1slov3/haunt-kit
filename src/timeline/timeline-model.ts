import { toDate, type TimestampInput } from '../timestamp/timestamp-format';

/*
 * Лента событий: сортировка, разбивка по дням и сворачивание похожих подряд. День — местный: событие в
 * 00:30 по Москве — это «сегодня» для человека в Москве, даже если в UTC ещё вчера.
 */

export interface TimelineEventBase {
  id: string;
  date: TimestampInput;
  /** Тип события: иконка и цвет; одинаковые подряд сворачиваются */
  type?: string;
  /** Что считать «похожим» внутри типа: один канал, один участник; без него — весь тип */
  groupKey?: string;
}

export type TimelineEntry<T> =
  { kind: 'event'; event: T } | { kind: 'group'; id: string; events: T[] };

export interface TimelineDay<T> {
  /** `YYYY-MM-DD` в местном поясе */
  key: string;
  /** Полдень дня — для подписи: полночь при переходе на летнее время бывает «вчера» */
  date: Date;
  entries: TimelineEntry<T>[];
}

export interface GroupOptions {
  /** Сворачивать похожие подряд */
  groupSimilar?: boolean;
  /** Сколько похожих подряд — уже группа; по умолчанию 3 */
  minGroup?: number;
  /** Новые сверху (по умолчанию) или снизу */
  order?: 'desc' | 'asc';
}

const pad = (value: number) => String(value).padStart(2, '0');

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameGroup(a: TimelineEventBase, b: TimelineEventBase): boolean {
  return a.type !== undefined && a.type === b.type && a.groupKey === b.groupKey;
}

/** События по дням; внутри дня похожие подряд — одной группой, если их не меньше `minGroup` */
export function groupTimeline<T extends TimelineEventBase>(
  events: readonly T[],
  { groupSimilar = true, minGroup = 3, order = 'desc' }: GroupOptions = {},
): TimelineDay<T>[] {
  const sorted = events
    .map((event) => ({ event, time: toDate(event.date).getTime() }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => (order === 'desc' ? b.time - a.time : a.time - b.time));
  const days: TimelineDay<T>[] = [];

  for (const { event, time } of sorted) {
    const date = new Date(time);
    const key = localDayKey(date);
    let day = days.at(-1);

    if (!day || day.key !== key) {
      day = {
        key,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12),
        entries: [],
      };
      days.push(day);
    }

    const last = day.entries.at(-1);
    const lastEvent = last?.kind === 'group' ? last.events[0] : last?.event;

    if (groupSimilar && last && lastEvent && sameGroup(lastEvent, event)) {
      if (last.kind === 'group') last.events.push(event);
      else
        day.entries[day.entries.length - 1] = {
          kind: 'group',
          id: lastEvent.id,
          events: [lastEvent, event],
        };
    } else {
      day.entries.push({ kind: 'event', event });
    }
  }

  // Короткие «группы» обратно в отдельные события: два похожих подряд сворачивать незачем
  for (const day of days) {
    day.entries = day.entries.flatMap((entry) =>
      entry.kind === 'group' && entry.events.length < minGroup
        ? entry.events.map((event) => ({ kind: 'event' as const, event }))
        : [entry],
    );
  }

  return days;
}

export type DayLabelKind = 'today' | 'yesterday' | 'date';

/** Какой подписью назвать день: «сегодня», «вчера» или датой */
export function dayLabelKind(day: Date, now: Date): DayLabelKind {
  const key = localDayKey(day);

  if (key === localDayKey(now)) return 'today';

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);

  return key === localDayKey(yesterday) ? 'yesterday' : 'date';
}

/** Дата разделителя: год — только если не текущий */
export function formatDayDate(day: Date, now: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: day.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(day);
}
