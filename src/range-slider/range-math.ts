/*
 * Математика двух бегунков без DOM. Бегунки не проходят друг через друга: каждый двигается в своих
 * границах — нижний от `min` до верхнего минус `minDistance`, верхний от нижнего плюс `minDistance` до
 * `max`. Поэтому «какой бегунок я тяну» не меняется посреди перетаскивания, как у Radix Slider, где
 * значения сортируются и бегунки меняются местами.
 */

export type RangeValue = readonly [number, number];

export interface RangeOptions {
  min: number;
  max: number;
  step: number;
  /** Наименьший зазор между значениями */
  minDistance: number;
}

/** Знаков после запятой у шага: 0.1 + 0.2 не должно давать 0.30000000000000004 */
function decimals(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);

  if (exponent) return Number(exponent[1]);

  return text.includes('.') ? text.split('.')[1]!.length : 0;
}

/** Значение на сетке шага от `min`, в пределах шкалы */
export function snapValue(
  value: number,
  { min, max, step }: Pick<RangeOptions, 'min' | 'max' | 'step'>,
): number {
  if (Number.isNaN(value)) return min;

  const snapped = min + Math.round((value - min) / step) * step;
  const clamped = Math.min(max, Math.max(min, snapped));

  return Number(clamped.toFixed(decimals(step)));
}

/** Где может стоять бегунок index при текущем положении второго */
export function thumbBounds(
  values: RangeValue,
  index: 0 | 1,
  options: RangeOptions,
): [number, number] {
  return index === 0
    ? [options.min, Math.max(options.min, values[1] - options.minDistance)]
    : [Math.min(options.max, values[0] + options.minDistance), options.max];
}

/** Подвинуть один бегунок: на сетку шага и не дальше второго с учётом зазора */
export function moveThumb(
  values: RangeValue,
  index: 0 | 1,
  next: number,
  options: RangeOptions,
): RangeValue {
  const [low, high] = thumbBounds(values, index, options);
  const value = Math.min(high, Math.max(low, snapValue(next, options)));

  return index === 0 ? [value, values[1]] : [values[0], value];
}

/**
 * Привести пришедшее значение к правилам: по порядку, на сетке, с зазором. Не помещается зазор — верхнее
 * подвигается вверх, у края шкалы — нижнее вниз.
 */
export function normalizeRange(values: RangeValue, options: RangeOptions): RangeValue {
  let low = snapValue(Math.min(values[0], values[1]), options);
  let high = snapValue(Math.max(values[0], values[1]), options);

  if (high - low < options.minDistance) {
    high = Math.min(options.max, low + options.minDistance);
    low = Math.max(options.min, high - options.minDistance);
  }

  return [low, high];
}

/** Доля 0…1 на шкале */
export function valueRatio(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;

  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function valueFromRatio(
  ratio: number,
  options: Pick<RangeOptions, 'min' | 'max' | 'step'>,
): number {
  return snapValue(options.min + ratio * (options.max - options.min), options);
}

/**
 * Какой бегунок брать по клику на дорожке: ближний. Бегунки в одной точке — по стороне клика, иначе
 * нижний нельзя было бы вытянуть влево, а верхний вправо.
 */
export function nearestThumb(values: RangeValue, value: number): 0 | 1 {
  const toLow = Math.abs(value - values[0]);
  const toHigh = Math.abs(value - values[1]);

  if (toLow === toHigh) return value > values[1] ? 1 : 0;

  return toLow < toHigh ? 0 : 1;
}

export type RangeKeyAction = { delta: number } | { edge: 'start' | 'end' };

/** Клавиша бегунка: стрелки — шаг (с Shift — большой), PageUp/PageDown — большой, Home/End — до края */
export function keyAction(
  key: string,
  shift: boolean,
  step: number,
  bigStep: number,
): RangeKeyAction | null {
  const size = shift ? bigStep : step;

  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return { delta: size };
    case 'ArrowLeft':
    case 'ArrowDown':
      return { delta: -size };
    case 'PageUp':
      return { delta: bigStep };
    case 'PageDown':
      return { delta: -bigStep };
    case 'Home':
      return { edge: 'start' };
    case 'End':
      return { edge: 'end' };
    default:
      return null;
  }
}
