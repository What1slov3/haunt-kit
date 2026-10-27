/** Окно склейки по умолчанию: сообщения одного автора ближе пяти минут друг к другу — одна группа */
export const GROUP_WINDOW = 5 * 60_000;

export interface GroupMessagesOptions<T> {
  /** Устойчивый id автора (не отображаемое имя: у двух людей оно может совпасть) */
  author: (message: T) => string;
  time: (message: T) => Date | string | number;
  /** Окно склейки, мс; по умолчанию 5 минут — от предыдущего сообщения, не от начала группы */
  window?: number;
  /** Своя причина начать группу заново: ответ, системное сообщение, не отправленное */
  breakBefore?: (message: T, previous: T) => boolean;
}

const toTime = (value: Date | string | number) =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

/** Один календарный день по местному времени — граница, на которой стоит разделитель с датой */
export function sameDay(a: Date | string | number, b: Date | string | number): boolean {
  const left = new Date(toTime(a));
  const right = new Date(toTime(b));

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/**
 * Продолжение ли группы — по сообщению, массив той же длины: `grouped[i]` прямо в проп `MessageItem`.
 * Группа рвётся на другом авторе, на паузе не меньше окна, на смене дня (там разделитель с датой), на
 * времени назад (порядок нарушен — надёжнее показать шапку) и по `breakBefore`.
 */
export function groupMessages<T>(
  messages: readonly T[],
  { author, time, window = GROUP_WINDOW, breakBefore }: GroupMessagesOptions<T>,
): boolean[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1];

    if (previous === undefined || author(message) !== author(previous)) return false;

    const current = toTime(time(message));
    const before = toTime(time(previous));
    const gap = current - before;

    if (!Number.isFinite(gap) || gap < 0 || gap >= window) return false;

    if (!sameDay(current, before)) return false;

    return !breakBefore?.(message, previous);
  });
}
