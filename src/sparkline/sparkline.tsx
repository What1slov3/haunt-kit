import { useId, useState, type ComponentPropsWithRef, type PointerEvent } from 'react';

import { cx } from '../lib/cx';

import {
  centerX,
  nearestIndex,
  scaleBars,
  scalePoints,
  scaleSeries,
  segmentsAreaPath,
  segmentsPath,
  splitSegments,
  type SparkBar,
  type SparkDomain,
  type SparkPoint,
  type SparkValue,
} from './sparkline-geometry';
import styles from './sparkline.module.css';

export type SparklineTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export type SparklineVariant = 'line' | 'bar';

export interface SparklineProps extends Omit<ComponentPropsWithRef<'svg'>, 'children' | 'fill'> {
  /** Ряд значений слева направо; null и NaN — пропуск: линия и заливка на нём прерываются */
  data: readonly SparkValue[];
  /** Ширина и высота в px */
  width?: number;
  height?: number;
  tone?: SparklineTone;
  /** line — линия, bar — столбики (шкала от нуля) */
  variant?: SparklineVariant;
  /** Заливка под линией градиентом цвета линии */
  fill?: boolean;
  /** Точка на последнем значении; у столбиков — последний ярче остальных */
  showLast?: boolean;
  /** Общая шкала — чтобы несколько линий рядом были сравнимы */
  domain?: SparkDomain;
  /** Подсказка при наведении: вертикальная черта, точка и значение моно над линией */
  tooltip?: boolean;
  /** Подпись значения в подсказке; по умолчанию — число в локали браузера */
  formatValue?: (value: number, index: number) => string;
  /** Подпись для скринридера («Сообщения за неделю: рост»); без неё линия декоративна */
  label?: string;
}

/** Поле под толщину линии и точку последнего значения: иначе их срезает край SVG */
const PADDING = 3;

/** Моно 11 px: ширина знака ≈ 0.6 кегля — подложку подсказки не надо мерить в DOM */
const TOOLTIP_FONT = 11;
const CHAR_WIDTH = TOOLTIP_FONT * 0.6;

const defaultFormat = (value: number) => new Intl.NumberFormat().format(value);

const isValue = (value: SparkValue | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Линия тренда для `Stat` и строк таблиц: SVG без осей и подписей, цвет — тоном из токенов */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone = 'accent',
  variant = 'line',
  fill,
  showLast = true,
  domain,
  tooltip,
  formatValue = defaultFormat,
  label,
  className,
  onPointerMove,
  onPointerLeave,
  ...rest
}: SparklineProps) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const bars = variant === 'bar' ? scaleBars(data, width, height, PADDING, domain) : null;
  // Одно значение — горизонталь во всю ширину, как раньше: точка посередине пустой полосы не читается
  const points: (SparkPoint | null)[] =
    data.length === 1
      ? scalePoints(data.filter(isValue), width, height, PADDING, domain)
      : scaleSeries(data, width, height, PADDING, domain);
  const segments = splitSegments(points);
  const lastIndex = data.reduce<number>(
    (found, value, index) => (isValue(value) ? index : found),
    -1,
  );
  const last = data.filter(isValue).length > 1 && lastIndex >= 0 ? points[lastIndex] : undefined;
  const marks: (SparkPoint | SparkBar | null)[] = bars ?? points;
  const hoveredMark = hovered === null ? null : marks[hovered];
  const hoveredValue = hovered === null ? undefined : data[hovered];

  const track = (event: PointerEvent<SVGSVGElement>) => {
    onPointerMove?.(event);

    if (!tooltip) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? ((event.clientX - rect.left) / rect.width) * width : 0;
    const index = nearestIndex(
      marks.map((mark) => (mark ? centerX(mark) : null)),
      x,
    );

    setHovered(index < 0 ? null : index);
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cx(styles.sparkline, styles[tone], tooltip && styles.interactive, className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-variant={variant}
      onPointerMove={track}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        setHovered(null);
      }}
      {...rest}
    >
      {bars ? (
        bars.map(
          (bar, index) =>
            bar && (
              <rect
                key={index}
                {...bar}
                rx={Math.min(1.5, bar.width / 2)}
                className={styles.bar}
                data-last={(showLast && index === lastIndex) || undefined}
                data-hovered={index === hovered || undefined}
              />
            ),
        )
      ) : (
        <>
          {fill && segments.length > 0 && (
            <>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" className={styles.stopTop} />
                  <stop offset="100%" className={styles.stopBottom} />
                </linearGradient>
              </defs>

              <path d={segmentsAreaPath(segments, height)} fill={`url(#${gradientId})`} />
            </>
          )}

          <path d={segmentsPath(segments)} className={styles.line} />

          {showLast && last && hovered === null && (
            <>
              <circle cx={last.x} cy={last.y} r={PADDING + 1} className={styles.halo} />
              <circle cx={last.x} cy={last.y} r={2} className={styles.dot} />
            </>
          )}
        </>
      )}

      {hoveredMark && isValue(hoveredValue) && (
        <Hint
          x={centerX(hoveredMark)}
          y={hoveredMark.y}
          height={height}
          width={width}
          text={formatValue(hoveredValue, hovered!)}
          dot={!bars}
        />
      )}
    </svg>
  );
}

interface HintProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  dot: boolean;
}

/**
 * Подсказка рисуется в том же SVG над верхним краем (у SVG `overflow: visible`): у линии в строке таблицы
 * нет места для HTML-подсказки, а портал ради одного числа — лишнее. У края подпись прижимается внутрь.
 */
function Hint({ x, y, width, height, text, dot }: HintProps) {
  const boxWidth = text.length * CHAR_WIDTH + 8;
  const left = Math.min(Math.max(x - boxWidth / 2, 0), Math.max(0, width - boxWidth));
  const top = -TOOLTIP_FONT - 8;

  return (
    <g className={styles.hint} data-testid="sparkline-hint">
      <line x1={x} x2={x} y1={0} y2={height} className={styles.rule} />
      {dot && <circle cx={x} cy={y} r={2.5} className={styles.dot} />}
      <rect
        x={left}
        y={top}
        width={boxWidth}
        height={TOOLTIP_FONT + 6}
        rx={3}
        className={styles.box}
      />
      <text x={left + boxWidth / 2} y={top + TOOLTIP_FONT + 1} className={styles.value}>
        {text}
      </text>
    </g>
  );
}
