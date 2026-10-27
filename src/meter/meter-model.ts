export type MeterTone = 'accent' | 'warning' | 'danger';

/** high-is-bad — много плохо (место занято, лимит), low-is-bad — мало плохо (заряд, свободное место) */
export type MeterDirection = 'high-is-bad' | 'low-is-bad';

export interface MeterThresholds {
  /** С этого значения — предупреждение (при low-is-bad — с этого и ниже) */
  warning?: number;
  /** С этого значения — опасно; сильнее warning (при low-is-bad — с этого и ниже) */
  danger?: number;
}

/** Доля заполнения 0…1; значение за пределами шкалы прижимается к краю, вырожденная шкала — пусто */
export function meterRatio(value: number, min: number, max: number): number {
  if (!(max > min) || Number.isNaN(value)) return 0;

  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Перешло ли значение порог в плохую сторону; пороги включительно */
function crossed(value: number, mark: number | undefined, direction: MeterDirection): boolean {
  if (mark === undefined) return false;

  return direction === 'low-is-bad' ? value <= mark : value >= mark;
}

/** Тон по порогам: «лимит почти исчерпан» — warning, «исчерпан» — danger; пороги включительно */
export function meterTone(
  value: number,
  thresholds: MeterThresholds,
  direction: MeterDirection = 'high-is-bad',
): MeterTone {
  if (crossed(value, thresholds.danger, direction)) return 'danger';
  if (crossed(value, thresholds.warning, direction)) return 'warning';

  return 'accent';
}

export interface MeterSegment {
  filled: boolean;
  /** Деление в зоне порога — пустое подкрашивается её тоном: видно, где начинается плохо */
  zone: Exclude<MeterTone, 'accent'> | null;
}

/**
 * Деления сегментированной шкалы. Заполнено `round(доля × n)`, но не меньше одного при ненулевом
 * значении: 3 % заряда на десяти делениях — одно горящее, а не пустая шкала. Зона деления — по его
 * середине относительно порогов.
 */
export function meterSegments(
  value: number,
  min: number,
  max: number,
  count: number,
  thresholds: MeterThresholds,
  direction: MeterDirection = 'high-is-bad',
): MeterSegment[] {
  const total = Math.max(0, Math.floor(count));
  const ratio = meterRatio(value, min, max);
  const filled = ratio > 0 ? Math.max(1, Math.round(ratio * total)) : 0;

  return Array.from({ length: total }, (_, index) => {
    const middle = min + ((index + 0.5) / total) * (max - min);
    const zone = meterTone(middle, thresholds, direction);

    return { filled: index < filled, zone: zone === 'accent' ? null : zone };
  });
}
