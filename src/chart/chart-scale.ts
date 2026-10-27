/*
 * Масштабы графика — чистые функции без DOM: значения → пиксели и «красивые» деления осей. Компонент
 * только рисует то, что посчитано здесь.
 */

export interface NiceTicks {
  /** Нижняя граница оси — кратна шагу и не больше минимума данных */
  min: number;
  /** Верхняя граница оси — кратна шагу и не меньше максимума данных */
  max: number;
  step: number;
  ticks: number[];
}

/** Шаг из ряда 1, 2, 2.5, 5 × 10ⁿ: деления 0 / 250 / 500 читаются, 0 / 233 / 466 — нет */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || count < 1) return 1;

  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;

  return nice * power;
}

/** Убирает хвосты плавающей точки: 0.1 + 0.2 → 0.3, иначе подпись деления — «0.30000000000000004» */
function clean(value: number): number {
  return Number.parseFloat(value.toPrecision(12));
}

/**
 * Деления оси под `count` интервалов. Ровный ряд (min = max) раздвигается до шага вокруг значения;
 * ноль в данных не обязателен — шкалу от нуля задаёт вызывающий (`includeZero`).
 */
export function niceTicks(min: number, max: number, count = 4): NiceTicks {
  let low = Math.min(min, max);
  let high = Math.max(min, max);

  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    low = 0;
    high = 1;
  }

  // Ровный ряд — коридор в половину значения вокруг него; неотрицательные данные не уходят ниже нуля
  if (low === high) {
    const pad = Math.abs(low) * 0.5 || 1;

    low = low >= 0 ? Math.max(0, low - pad) : low - pad;
    high += pad;
  }

  let step = niceStep(high - low, count);
  let start = Math.floor(low / step) * step;
  let end = Math.ceil(high / step) * step;

  // Округление границ может дать на интервал больше просимого — второй проход с шагом крупнее
  if ((end - start) / step > count + 1) {
    step = niceStep(end - start, count);
    start = Math.floor(low / step) * step;
    end = Math.ceil(high / step) * step;
  }

  const ticks: number[] = [];

  for (let value = start; value <= end + step / 2; value += step) ticks.push(clean(value));

  return { min: clean(start), max: clean(end), step: clean(step), ticks };
}

export interface LinearScale {
  (value: number): number;
  domain: readonly [number, number];
  range: readonly [number, number];
}

/** Линейная шкала domain → range; вырожденный домен — середина диапазона, без деления на ноль */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const scale = ((value: number) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0)) as LinearScale;

  scale.domain = domain;
  scale.range = range;

  return scale;
}

export interface BandScale {
  /** Левый край полосы категории */
  start: (index: number) => number;
  /** Центр полосы — сюда встают подписи и подсказка */
  center: (index: number) => number;
  /** Ширина полосы */
  band: number;
  count: number;
}

/** Полосы под столбцы: ширина делится поровну, `padding` — доля полосы на воздух по краям */
export function bandScale(count: number, range: readonly [number, number]): BandScale {
  const [r0, r1] = range;
  const band = count > 0 ? (r1 - r0) / count : 0;

  return {
    start: (index) => r0 + index * band,
    center: (index) => r0 + (index + 0.5) * band,
    band,
    count,
  };
}

/** Точки для линии: первая и последняя — по краям области, остальные — равномерно */
export function pointScale(
  count: number,
  range: readonly [number, number],
): (index: number) => number {
  const [r0, r1] = range;

  if (count <= 1) return () => (r0 + r1) / 2;

  const step = (r1 - r0) / (count - 1);

  return (index) => r0 + index * step;
}

/** Ближайший индекс к координате на равномерной шкале — подсказка «прилипает» к точке по X */
export function nearestPointIndex(
  x: number,
  count: number,
  range: readonly [number, number],
): number {
  if (count <= 1) return 0;

  const [r0, r1] = range;
  const index = Math.round(((x - r0) / (r1 - r0)) * (count - 1));

  return Math.min(count - 1, Math.max(0, index));
}

/**
 * Какие подписи категорий показать, чтобы они не налезали: каждая k-я, где k — сколько полос занимает
 * одна подпись. Последняя видна всегда, если не налезает на предыдущую показанную: «сегодня» важнее.
 */
export function thinLabels(count: number, slot: number, labelWidth: number): number[] {
  if (count <= 0) return [];
  if (slot <= 0) return [0];

  const every = Math.max(1, Math.ceil(labelWidth / slot));
  const shown: number[] = [];

  for (let index = 0; index < count; index += every) shown.push(index);

  const last = count - 1;
  const previous = shown.at(-1)!;

  if (previous !== last) {
    if ((last - previous) * slot >= labelWidth) shown.push(last);
    else if (shown.length > 1) shown[shown.length - 1] = last;
  }

  return shown;
}

/** Ширина моно-подписи без измерения DOM: знак JetBrains Mono ≈ 0.6 кегля */
export function monoTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}
