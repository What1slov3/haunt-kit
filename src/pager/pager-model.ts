/*
 * Постраничный вывод, как `more` / `less`: сколько строк показано и что делает клавиша. Чистые функции —
 * компонент только хранит число показанных строк.
 */

export type PagerAction = 'page' | 'line' | 'back' | 'all' | 'collapse';

/** Сколько показать после действия: страница, строка, страница назад, всё, свернуть до первой */
export function pagerStep(
  shown: number,
  total: number,
  pageSize: number,
  action: PagerAction,
): number {
  const page = Math.max(1, pageSize);
  const first = Math.min(page, total);

  if (action === 'page') return Math.min(total, shown + page);
  if (action === 'line') return Math.min(total, shown + 1);
  if (action === 'back') return Math.max(first, shown - page);
  if (action === 'all') return total;

  return first;
}

/** Процент показанного — целым, как в `more`: последние строки не округляются до 100 раньше конца */
export function pagerPercent(shown: number, total: number): number {
  if (total <= 0 || shown >= total) return 100;

  return Math.min(99, Math.floor((shown / total) * 100));
}

/** Клавиша → действие; null — не наша */
export function pagerKey(key: string): PagerAction | null {
  switch (key) {
    case ' ':
    case 'PageDown':
    case 'f':
      return 'page';
    case 'Enter':
    case 'ArrowDown':
    case 'j':
      return 'line';
    case 'b':
    case 'PageUp':
      return 'back';
    case 'G':
    case 'End':
      return 'all';
    case 'q':
    case 'Escape':
      return 'collapse';
    default:
      return null;
  }
}
