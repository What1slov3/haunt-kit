import { accentPresets } from '../theme/accent';

/*
 * Модель графика: цвета рядов, складывание, геометрия столбцов и кольца, подписи времени. Чистые функции —
 * компонент только рисует посчитанное.
 */

export type ChartType = 'line' | 'area' | 'bar' | 'donut';

/** Значение ряда: null — нет данных (линия прерывается, столбца нет), а не ноль */
export type ChartValue = number | null;

/** Категория оси X: подпись или момент времени (Date, мс, ISO-строка — при `xType="time"`) */
export type ChartCategory = string | number | Date;

/**
 * Цвет ряда. Номер 1–6 — слот категориальной палитры (у ряда, а не у позиции: при фильтре выжившие ряды
 * не перекрашиваются); `accent` — акцент пространства (по умолчанию у единственного ряда); `neutral` —
 * серый фон для «прочего» и рядов-контекста; статусы — только когда ряд и значит «хорошо / плохо».
 */
export type ChartColor =
  1 | 2 | 3 | 4 | 5 | 6 | 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

export interface ChartSeries {
  /** Устойчивый id: ключ отрисовки и строки таблицы */
  id: string;
  /** Имя ряда в легенде, подсказке и таблице */
  label: string;
  /** Значения по категориям, в том же порядке */
  data: readonly ChartValue[];
  color?: ChartColor;
}

/*
 * Категориальная палитра — шесть цветов из пресетов акцента кита (theme/accent.ts): они уже подобраны
 * под белый текст ≥ 4.5:1, то есть сидят в середине светлоты и проходят обе темы. Порядок — перебором
 * всех перестановок валидатором dataviz (худшая соседняя пара: ΔE 19.5 при протанопии/дейтанопии и 20.1
 * обычным зрением в обеих темах). Порядок и есть защита для дальтоников — не переставлять без валидатора.
 * Седьмого цвета нет нарочно: больше шести рядов — «прочее» (`neutral`) или несколько графиков.
 */
export const chartPalette = [
  accentPresets.sky.accent,
  accentPresets.amber.accent,
  accentPresets.sky.accent2,
  accentPresets.lime.accent,
  accentPresets.violet.accent,
  accentPresets.rose.accent,
] as const;

export const CHART_SLOTS = chartPalette.length;

/**
 * Переменные слотов на корне графика. `--chart-N` — точка переопределения: появится токен в теме или
 * свой цвет у экрана — график возьмёт его, иначе цвет палитры.
 */
export const chartPaletteStyle: Record<string, string> = Object.fromEntries(
  chartPalette.map((color, index) => [
    `--chart-series-${index + 1}`,
    `var(--chart-${index + 1}, ${color})`,
  ]),
);

/** Цвет ряда: свой, акцент у единственного, иначе слот по порядку; после шестого — серый, не новый оттенок */
export function seriesColor(series: ChartSeries, index: number, total: number): ChartColor {
  if (series.color !== undefined) return series.color;
  if (total === 1) return 'accent';

  return index < CHART_SLOTS ? ((index + 1) as ChartColor) : 'neutral';
}

/** CSS-значение цвета; переменные статусов и серого объявлены в chart.module.css */
export function colorValue(color: ChartColor): string {
  return typeof color === 'number' ? `var(--chart-series-${color})` : `var(--chart-${color})`;
}

export const isValue = (value: ChartValue | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export interface Extent {
  min: number;
  max: number;
}

/** Размах значений; у столбцов и областей шкала всегда от нуля — длина столбца должна значить величину */
export function valueExtent(
  series: readonly ChartSeries[],
  { stacked = false, includeZero = false }: { stacked?: boolean; includeZero?: boolean } = {},
): Extent | null {
  let min = Infinity;
  let max = -Infinity;

  if (stacked) {
    for (const [y0, y1] of stackSeries(series).flat().filter(Boolean) as [number, number][]) {
      min = Math.min(min, y0, y1);
      max = Math.max(max, y0, y1);
    }
  } else {
    for (const value of series.flatMap((item) => item.data)) {
      if (!isValue(value)) continue;

      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  if (min === Infinity) return null;

  return includeZero ? { min: Math.min(0, min), max: Math.max(0, max) } : { min, max };
}

/** Отрезок ряда в стопке [низ, верх]; null — значения нет */
export type StackSpan = [number, number] | null;

/**
 * Стопка: положительные значения растут вверх от нуля, отрицательные — вниз, каждый знак своей стопкой.
 * Иначе отрицательный кусок «съедал» бы положительные и столбец показывал разницу, а не части.
 */
export function stackSeries(series: readonly ChartSeries[]): StackSpan[][] {
  const length = Math.max(0, ...series.map((item) => item.data.length));
  const up = new Array<number>(length).fill(0);
  const down = new Array<number>(length).fill(0);

  return series.map((item) =>
    Array.from({ length }, (_, index): StackSpan => {
      const value = item.data[index];

      if (!isValue(value)) return null;

      if (value >= 0) {
        const base = up[index]!;

        up[index] = base + value;

        return [base, base + value];
      }

      const base = down[index]!;

      down[index] = base + value;

      return [base, base + value];
    }),
  );
}

/** Сумма по категории — для подсказки стопки и центра кольца */
export function totalAt(series: readonly ChartSeries[], index: number): number {
  return series.reduce((sum, item) => sum + (isValue(item.data[index]) ? item.data[index]! : 0), 0);
}

/** Спеки dataviz: столбец не толще 24 px, между соседними — 2 px поверхности */
export const BAR_MAX = 24;
export const BAR_GAP = 2;
export const BAR_RADIUS = 4;

export interface BarSlot {
  /** Левый край столбца ряда внутри полосы категории, от начала полосы */
  offset: number;
  width: number;
}

/**
 * Столбцы рядов в полосе категории. Сгруппированные — рядом через 2 px, сложенные — один столбец. Ширина
 * ограничена 24 px и долей полосы: остаток полосы — воздух, а не толще столбец.
 */
export function barSlots(band: number, count: number, stacked: boolean): BarSlot[] {
  if (count <= 0 || band <= 0) return [];

  if (stacked) {
    const width = Math.max(1, Math.min(BAR_MAX, band * 0.6));

    return Array.from({ length: count }, () => ({ offset: (band - width) / 2, width }));
  }

  const usable = band * 0.76 - BAR_GAP * (count - 1);
  const width = Math.max(1, Math.min(BAR_MAX, usable / count));
  const group = width * count + BAR_GAP * (count - 1);
  const start = (band - group) / 2;

  return Array.from({ length: count }, (_, index) => ({
    offset: start + index * (width + BAR_GAP),
    width,
  }));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Столбец от `base` до `end` (пиксели по Y): скруглён только конец со значением, у основания — прямой
 * угол, столбец «стоит» на оси. Радиус не больше половины ширины и высоты: у маленького значения
 * получается капля, а не вывернутая дуга.
 */
export function barPath(
  x: number,
  width: number,
  base: number,
  end: number,
  radius = BAR_RADIUS,
): string {
  const height = Math.abs(end - base);

  if (height === 0) return '';

  const r = Math.min(radius, width / 2, height);
  const right = round(x + width);
  const left = round(x);
  const b = round(base);
  const e = round(end);

  if (end < base) {
    return `M${left} ${b} L${left} ${round(e + r)} Q${left} ${e} ${round(left + r)} ${e} L${round(right - r)} ${e} Q${right} ${e} ${right} ${round(e + r)} L${right} ${b} Z`;
  }

  return `M${left} ${b} L${left} ${round(e - r)} Q${left} ${e} ${round(left + r)} ${e} L${round(right - r)} ${e} Q${right} ${e} ${right} ${round(e - r)} L${right} ${b} Z`;
}

export interface DonutSegment {
  index: number;
  value: number;
  /** Доля от суммы, 0–1 */
  share: number;
  start: number;
  end: number;
}

/** Сумма кольца — только положительные значения: отрицательной доли у целого не бывает */
export function donutTotal(values: readonly ChartValue[]): number {
  return values.reduce<number>((sum, value) => sum + (isValue(value) && value > 0 ? value : 0), 0);
}

/** Кольцо: углы сегментов от 12 часов по часовой; нули и пропуски сегментов не дают */
export function donutSegments(values: readonly ChartValue[]): DonutSegment[] {
  const total = donutTotal(values);

  if (total <= 0) return [];

  let angle = 0;
  const segments: DonutSegment[] = [];

  values.forEach((value, index) => {
    if (!isValue(value) || value <= 0) return;

    const sweep = (value / total) * Math.PI * 2;

    segments.push({ index, value, share: value / total, start: angle, end: angle + sweep });
    angle += sweep;
  });

  return segments;
}

function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [round(cx + radius * Math.sin(angle)), round(cy - radius * Math.cos(angle))];
}

/**
 * Сегмент кольца с зазором `gap` px поверхности между соседями. Зазор — постоянной длины по дуге, поэтому
 * на внутреннем радиусе угол отступа больше. Единственный сегмент — целое кольцо двумя полудугами: дуга в
 * 360° в SVG вырождается в точку.
 */
export function arcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
  gap = 2,
): string {
  if (end - start >= Math.PI * 2 - 1e-6) {
    const [ox, oy] = polar(cx, cy, outer, 0);
    const [ox2, oy2] = polar(cx, cy, outer, Math.PI);
    const [ix, iy] = polar(cx, cy, inner, 0);
    const [ix2, iy2] = polar(cx, cy, inner, Math.PI);

    return `M${ox} ${oy} A${outer} ${outer} 0 1 1 ${ox2} ${oy2} A${outer} ${outer} 0 1 1 ${ox} ${oy} Z M${ix} ${iy} A${inner} ${inner} 0 1 0 ${ix2} ${iy2} A${inner} ${inner} 0 1 0 ${ix} ${iy} Z`;
  }

  const outerPad = Math.min((end - start) / 2, gap / 2 / outer);
  const innerPad = Math.min((end - start) / 2, gap / 2 / Math.max(inner, 1));
  const [x0, y0] = polar(cx, cy, outer, start + outerPad);
  const [x1, y1] = polar(cx, cy, outer, end - outerPad);
  const [x2, y2] = polar(cx, cy, inner, end - innerPad);
  const [x3, y3] = polar(cx, cy, inner, start + innerPad);
  const large = end - start - 2 * outerPad > Math.PI ? 1 : 0;
  const largeInner = end - start - 2 * innerPad > Math.PI ? 1 : 0;

  return `M${x0} ${y0} A${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${inner} ${inner} 0 ${largeInner} 0 ${x3} ${y3} Z`;
}

/**
 * Больше шести сегментов кольца — хвост сворачивается в «прочее»: седьмой оттенок под дальтонизмом не
 * отличить от соседнего. Порядок задаёт вызывающий (обычно по убыванию) — первые пять остаются как есть.
 */
export function foldTail<T extends ChartCategory>(
  categories: readonly T[],
  values: readonly ChartValue[],
  otherLabel: string,
  limit = CHART_SLOTS,
): { categories: (T | string)[]; values: ChartValue[]; folded: number } {
  if (categories.length <= limit) {
    return { categories: [...categories], values: [...values], folded: 0 };
  }

  const keep = limit - 1;
  const rest = values
    .slice(keep)
    .reduce<number>((sum, value) => sum + (isValue(value) ? value : 0), 0);

  return {
    categories: [...categories.slice(0, keep), otherLabel],
    values: [...values.slice(0, keep), rest],
    folded: categories.length - keep,
  };
}

/** Момент времени категории в мс; не время — NaN */
export function categoryTime(category: ChartCategory): number {
  if (category instanceof Date) return category.getTime();
  if (typeof category === 'number') return category;

  return Date.parse(category);
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Формат подписей оси времени по шагу между категориями: часы — «14:00», дни — «12 окт.», месяцы —
 * «окт.»; год — только если ряд переходит через год. Шаг — медиана: пропуск дня не переводит ось на месяцы.
 */
export function timeFormatOptions(times: readonly number[]): Intl.DateTimeFormatOptions {
  const valid = times.filter(Number.isFinite);

  if (valid.length < 2) return { day: 'numeric', month: 'short' };

  const steps = valid
    .slice(1)
    .map((time, index) => Math.abs(time - valid[index]!))
    .sort((a, b) => a - b);
  const step = steps[Math.floor(steps.length / 2)]!;
  const years = new Set(valid.map((time) => new Date(time).getFullYear()));
  const year = years.size > 1 ? ({ year: 'numeric' } as const) : {};

  if (step < DAY) return { hour: '2-digit', minute: '2-digit' };
  if (step < 27 * DAY) return { day: 'numeric', month: 'short' };

  return { month: 'short', ...year };
}

/** Формат подсказки — подробнее оси: у часов ещё и день, у дней — день недели */
export function timeTooltipOptions(axis: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  if (axis.hour) return { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  if (axis.day) return { weekday: 'short', day: 'numeric', month: 'long' };

  return { month: 'long', year: 'numeric' };
}

/**
 * Подписи концов линий — только если они не налезают друг на друга. Раздвигать их нельзя: подпись
 * отрывается от своей линии и читается как шум (dataviz); тогда остаются легенда и подсказка.
 */
export function endLabelsFit(ys: readonly number[], minGap: number): boolean {
  const sorted = [...ys].sort((a, b) => a - b);

  return sorted.every((y, index) => index === 0 || y - sorted[index - 1]! >= minGap);
}
