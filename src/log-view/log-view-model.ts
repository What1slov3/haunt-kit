export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Пользователь у нижнего края — значит, следит за журналом, и новые строки должны прокручивать вниз.
 * Порог в несколько пикселей: дробный scrollTop при масштабе 125 % не доходит до нуля ровно
 */
export function isNearBottom(metrics: ScrollMetrics, threshold = 8): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold;
}

/** Последние `maxLines` строк: старые уходят сверху, как в терминале с ограниченной историей */
export function visibleLines<T>(lines: readonly T[], maxLines?: number): readonly T[] {
  if (maxLines === undefined || lines.length <= maxLines) return lines;

  return lines.slice(lines.length - Math.max(0, maxLines));
}

const timeFormats = new Map<string, Intl.DateTimeFormat>();

/** Время строки журнала — с секундами, 24 часа: события бота идут чаще раза в минуту */
export function formatLogTime(date: Date, locale = 'ru'): string {
  let format = timeFormats.get(locale);

  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    timeFormats.set(locale, format);
  }

  return format.format(date);
}
