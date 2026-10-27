export type StatChangeFormat = 'percent' | 'number';
export type StatTrendTone = 'success' | 'danger' | 'neutral';

/**
 * Изменение со знаком: «+12,5 %», «−3», «0 %». `percent` принимает проценты (12.5), а не долю (0.125):
 * так пишут в данных статистики, и так короче вызывать
 */
export function formatChange(change: number, format: StatChangeFormat, locale = 'ru'): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: format === 'percent' ? 'percent' : 'decimal',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  });

  return formatter.format(format === 'percent' ? change / 100 : change);
}

/**
 * Тон изменения: рост — хорошо, если `goodDirection` = up (участники), и плохо, если down (жалобы,
 * время ответа). Ноль — нейтрально
 */
export function changeTone(change: number, goodDirection: 'up' | 'down' = 'up'): StatTrendTone {
  if (change === 0 || Number.isNaN(change)) return 'neutral';

  const good = goodDirection === 'up' ? change > 0 : change < 0;

  return good ? 'success' : 'danger';
}
