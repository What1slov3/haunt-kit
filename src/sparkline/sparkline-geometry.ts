export interface SparkPoint {
  x: number;
  y: number;
}

export interface SparkDomain {
  /** Нижняя граница шкалы; по умолчанию — минимум данных */
  min?: number;
  /** Верхняя граница шкалы; по умолчанию — максимум данных */
  max?: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Значения → точки в координатах SVG (y вниз). `padding` — поле под толщину линии и точку последнего
 * значения, иначе они обрезаются краем. Нечисловые значения пропускаются. Ровный ряд и одно значение —
 * горизонталь посередине: деления на ноль нет, а «ничего не менялось» читается как прямая.
 */
export function scalePoints(
  data: readonly number[],
  width: number,
  height: number,
  padding = 0,
  domain: SparkDomain = {},
): SparkPoint[] {
  const values = data.filter(Number.isFinite);

  if (values.length === 0) return [];

  const innerWidth = Math.max(0, width - 2 * padding);
  const innerHeight = Math.max(0, height - 2 * padding);
  const min = domain.min ?? Math.min(...values);
  const max = domain.max ?? Math.max(...values);
  const span = max - min;
  const middle = round(padding + innerHeight / 2);

  if (values.length === 1) {
    return [
      { x: padding, y: middle },
      { x: round(padding + innerWidth), y: middle },
    ];
  }

  const step = innerWidth / (values.length - 1);

  return values.map((value, index) => ({
    x: round(padding + index * step),
    y: span === 0 ? middle : round(padding + (1 - (value - min) / span) * innerHeight),
  }));
}

export function linePath(points: readonly SparkPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

/** Замкнутая область под линией до нижнего края — под заливку градиентом */
export function areaPath(points: readonly SparkPoint[], height: number): string {
  const first = points[0];
  const last = points.at(-1);

  if (!first || !last) return '';

  return `${linePath(points)} L${last.x} ${height} L${first.x} ${height} Z`;
}

/** Значение ряда: null, NaN и бесконечность — пропуск в данных, линия на нём прерывается */
export type SparkValue = number | null;

const isValue = (value: SparkValue | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export interface SparkBar {
  x: number;
  y: number;
  width: number;
  height: number;
}

function domainOf(data: readonly SparkValue[], domain: SparkDomain, fromZero: boolean) {
  const values = data.filter(isValue);
  const min = domain.min ?? (fromZero ? Math.min(0, ...values) : Math.min(...values));
  const max = domain.max ?? (fromZero ? Math.max(0, ...values) : Math.max(...values));

  return { values, min, max, span: max - min };
}

/**
 * Как `scalePoints`, но пропуск остаётся на своём месте: точка — по индексу в исходном ряду, на месте
 * пропуска — null. Так разрыв виден там, где не было данных, а не схлопывается в соседние дни.
 */
export function scaleSeries(
  data: readonly SparkValue[],
  width: number,
  height: number,
  padding = 0,
  domain: SparkDomain = {},
): (SparkPoint | null)[] {
  const { values, min, span } = domainOf(data, domain, false);

  if (!values.length) return data.map(() => null);

  const innerWidth = Math.max(0, width - 2 * padding);
  const innerHeight = Math.max(0, height - 2 * padding);
  const middle = round(padding + innerHeight / 2);
  const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  return data.map((value, index) =>
    isValue(value)
      ? {
          x: round(padding + index * step),
          y: span === 0 ? middle : round(padding + (1 - (value - min) / span) * innerHeight),
        }
      : null,
  );
}

/** Непрерывные куски ряда между пропусками */
export function splitSegments(points: readonly (SparkPoint | null)[]): SparkPoint[][] {
  const segments: SparkPoint[][] = [];
  let current: SparkPoint[] = [];

  for (const point of points) {
    if (point) {
      current.push(point);
    } else if (current.length) {
      segments.push(current);
      current = [];
    }
  }

  if (current.length) segments.push(current);

  return segments;
}

/**
 * Линия по кускам: каждый — своим `M`. Одиночная точка между пропусками — отрезок нулевой длины, и
 * круглый конец линии рисует её точкой, иначе значение пропало бы совсем.
 */
export function segmentsPath(segments: readonly (readonly SparkPoint[])[]): string {
  return segments
    .map((segment) =>
      segment.length === 1
        ? `M${segment[0]!.x} ${segment[0]!.y} L${segment[0]!.x} ${segment[0]!.y}`
        : linePath(segment),
    )
    .join(' ');
}

/** Заливка тоже прерывается: под каждым куском своя замкнутая область */
export function segmentsAreaPath(
  segments: readonly (readonly SparkPoint[])[],
  height: number,
): string {
  return segments
    .filter((segment) => segment.length > 1)
    .map((segment) => areaPath(segment, height))
    .join(' ');
}

/**
 * Столбики: ряд делит ширину на равные полосы, столбик — 70 % полосы по центру. Шкала по умолчанию
 * включает ноль — столбик от нуля, иначе минимальный был бы пустым. Пропуск — null, места не теряет.
 */
export function scaleBars(
  data: readonly SparkValue[],
  width: number,
  height: number,
  padding = 0,
  domain: SparkDomain = {},
): (SparkBar | null)[] {
  const { min, span } = domainOf(data, domain, true);
  const innerWidth = Math.max(0, width - 2 * padding);
  const innerHeight = Math.max(0, height - 2 * padding);
  const band = data.length ? innerWidth / data.length : 0;
  const barWidth = round(band * 0.7);
  const toY = (value: number) =>
    span === 0 ? padding + innerHeight : padding + (1 - (value - min) / span) * innerHeight;
  const base = toY(Math.min(Math.max(0, min), min + span));

  return data.map((value, index) => {
    if (!isValue(value)) return null;

    const top = Math.min(toY(value), base);

    return {
      x: round(padding + index * band + (band - barWidth) / 2),
      y: round(top),
      width: barWidth,
      // Ноль — всё равно черта в 1 px: «ноль сообщений» отличается от «нет данных»
      height: round(Math.max(1, Math.abs(base - toY(value)))),
    };
  });
}

/** Центр по оси X для подсказки: у точки — она сама, у столбика — середина */
export function centerX(mark: SparkPoint | SparkBar): number {
  return 'width' in mark ? round(mark.x + mark.width / 2) : mark.x;
}

/** Ближайший к `x` индекс со значением — подсказка не цепляется за пропуск; -1 — значений нет */
export function nearestIndex(xs: readonly (number | null)[], x: number): number {
  let best = -1;

  xs.forEach((candidate, index) => {
    if (candidate === null) return;
    if (best < 0 || Math.abs(candidate - x) < Math.abs(xs[best]! - x)) best = index;
  });

  return best;
}
