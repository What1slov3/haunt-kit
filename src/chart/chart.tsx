import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { VisuallyHidden } from 'radix-ui';

import { isMotionAllowed } from '../fx/environment';
import { cx } from '../lib/cx';
import { segmentsAreaPath, segmentsPath, splitSegments } from '../sparkline/sparkline-geometry';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import {
  arcPath,
  barPath,
  barSlots,
  categoryTime,
  chartPaletteStyle,
  colorValue,
  donutSegments,
  donutTotal,
  endLabelsFit,
  foldTail,
  isValue,
  seriesColor,
  stackSeries,
  timeFormatOptions,
  timeTooltipOptions,
  totalAt,
  valueExtent,
  type ChartCategory,
  type ChartColor,
  type ChartSeries,
  type ChartType,
  type ChartValue,
} from './chart-model';
import {
  bandScale,
  linearScale,
  monoTextWidth,
  nearestPointIndex,
  niceTicks,
  pointScale,
  thinLabels,
} from './chart-scale';
import styles from './chart.module.css';
import { useElementWidth } from './use-element-width';

export interface ChartProps extends Omit<ComponentPropsWithRef<'figure'>, 'children'> {
  /** line — тренд, area — тренд одного ряда или части целого во времени, bar — сравнение, donut — доли */
  type: ChartType;
  /** Категории оси X (у кольца — сегменты), в порядке данных */
  categories: readonly ChartCategory[];
  /** Ряды; у кольца берётся первый, сегменты — категории */
  series: readonly ChartSeries[];
  /** Подпись графика для скринридера и заголовок скрытой таблицы данных */
  label: string;
  /** Столбцы и области — стопкой (части целого), иначе столбцы рядом */
  stacked?: boolean;
  /** time — категории как моменты времени, подписи через Intl; по умолчанию — time, если первая категория Date */
  xType?: 'category' | 'time';
  /** Высота области построения без оси X, px; у кольца — диаметр */
  height?: number;
  /** Шкала от нуля; у столбцов и областей всегда, у линии — по умолчанию тоже */
  zero?: boolean;
  /** Подпись значения: в подсказке, таблице и прямых подписях; по умолчанию — число в локали */
  formatValue?: (value: number) => string;
  /** Подпись категории вместо стандартной (Intl для времени, строка для остального) */
  formatCategory?: (category: ChartCategory, index: number) => string;
  /** Легенда; по умолчанию — при двух рядах и больше (у кольца — всегда) */
  legend?: boolean;
  /** Прямые подписи: значение на конце линии и над столбцом — там, где они не налезают */
  directLabels?: boolean;
  /** Подпись заголовка первого столбца скрытой таблицы */
  categoryLabel?: string;
  /** Что показать без данных; по умолчанию — «Нет данных» */
  empty?: ReactNode;
  /** Локаль Intl; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

const AXIS_FONT = 11;
const TOP = 8;
const AXIS_BAND = 22;
/** Радиус маркера с кольцом: заливка — 8 px в диаметре (dataviz: маркер не меньше 8 px), кольцо — 2 px */
const MARKER = 5;

interface Readout {
  title: string;
  rows: { id: string; label: string; value: string; color: ChartColor; line: boolean }[];
  total?: string;
}

/**
 * Лёгкие графики на SVG без зависимостей — по правилам dataviz: тонкие метки, столбец ≤ 24 px со
 * скруглённым концом и прямым основанием, 2 px поверхности между соседями, линия 2 px, сетка в волос,
 * легенда от двух рядов, подписи — цветом текста, а не ряда. Подсказка — по наведению и с клавиатуры
 * (фокус на графике, стрелки по точкам, значение озвучивается). Рядом — скрытая таблица с теми же
 * данными: подсказка дополняет, а не запирает значения.
 */
export function Chart({
  type,
  categories: categoriesProp,
  series: seriesProp,
  label,
  stacked = false,
  xType: xTypeProp,
  height = type === 'donut' ? 180 : 200,
  zero = true,
  formatValue: formatValueProp,
  formatCategory: formatCategoryProp,
  legend: legendProp,
  directLabels = true,
  categoryLabel,
  empty,
  locale: localeProp,
  className,
  style,
  ...rest
}: ChartProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const hintId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(plotRef);
  const [active, setActive] = useState<number | null>(null);
  const [appear, setAppear] = useState(false);

  useLayoutEffect(() => {
    // Появление — один раз при монтировании и только если можно двигаться (уровень эффектов, reduced-motion)
    setAppear(isMotionAllowed(rootRef.current));
  }, []);

  // Кольцо: больше шести сегментов — хвост в «прочее»
  const donut = type === 'donut';
  const folded = donut
    ? foldTail(categoriesProp, seriesProp[0]?.data ?? [], strings.chart.other)
    : null;
  const categories: readonly ChartCategory[] = folded ? folded.categories : categoriesProp;
  const series: readonly ChartSeries[] =
    folded && seriesProp[0] ? [{ ...seriesProp[0], data: folded.values }] : seriesProp;

  const xType = xTypeProp ?? (categories[0] instanceof Date ? 'time' : 'category');
  const times = xType === 'time' ? categories.map(categoryTime) : [];
  const axisTime =
    xType === 'time' ? new Intl.DateTimeFormat(locale, timeFormatOptions(times)) : null;
  const tooltipTime =
    xType === 'time'
      ? new Intl.DateTimeFormat(locale, timeTooltipOptions(timeFormatOptions(times)))
      : null;
  const number = new Intl.NumberFormat(locale);
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const formatValue = formatValueProp ?? ((value: number) => number.format(value));

  const formatCategory = (category: ChartCategory, index: number, full = false): string => {
    if (formatCategoryProp) return formatCategoryProp(category, index);

    const time = times[index];

    if (axisTime && tooltipTime && time !== undefined && Number.isFinite(time)) {
      return (full ? tooltipTime : axisTime).format(time);
    }

    return category instanceof Date ? category.toLocaleDateString(locale) : String(category);
  };

  const colors = series.map((item, index) =>
    donut ? 'accent' : seriesColor(item, index, series.length),
  );
  const segmentColor = (index: number): ChartColor =>
    folded && folded.folded > 0 && index === categories.length - 1
      ? 'neutral'
      : ((index + 1) as ChartColor);

  const hasData = series.some((item) => item.data.some(isValue));
  const showLegend = legendProp ?? (donut || series.length > 1);
  const count = categories.length;

  const readoutAt = (index: number): Readout => {
    if (donut) {
      const value = series[0]?.data[index];
      const sum = donutTotal(series[0]?.data ?? []) || 1;

      return {
        title: formatCategory(categories[index]!, index, true),
        rows: isValue(value)
          ? [
              {
                id: String(index),
                label: percent.format(value / sum),
                value: formatValue(value),
                color: segmentColor(index),
                line: false,
              },
            ]
          : [],
      };
    }

    return {
      title: formatCategory(categories[index]!, index, true),
      rows: series.map((item, position) => {
        const value = item.data[index];

        return {
          id: item.id,
          label: item.label,
          value: isValue(value) ? formatValue(value) : '—',
          color: colors[position]!,
          line: type === 'line',
        };
      }),
      total: stacked && series.length > 1 ? formatValue(totalAt(series, index)) : undefined,
    };
  };

  const announce = (index: number): string => {
    const readout = readoutAt(index);

    // Список — через Intl: разделители — по правилам языка, а не запятая из кода
    return strings.chart.point(
      readout.title,
      new Intl.ListFormat(locale, { style: 'narrow', type: 'unit' }).format(
        readout.rows.map((row) =>
          donut ? `${row.value} ${row.label}` : `${row.label} ${row.value}`,
        ),
      ),
    );
  };

  const step = (event: KeyboardEvent<HTMLDivElement>) => {
    const total = donut
      ? donutSegments(series[0]?.data ?? []).map((segment) => segment.index)
      : null;
    const indexes = total ?? Array.from({ length: count }, (_, index) => index);

    if (!indexes.length) return;

    const position = active === null ? -1 : indexes.indexOf(active);
    let next: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = indexes[Math.min(indexes.length - 1, position + 1)];
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = indexes[Math.max(0, position < 0 ? 0 : position - 1)];
        break;
      case 'Home':
        next = indexes[0];
        break;
      case 'End':
        next = indexes.at(-1);
        break;
      case 'Escape':
        if (active === null) return;
        setActive(null);
        event.preventDefault();

        return;
      default:
        return;
    }

    event.preventDefault();
    setActive(next ?? null);
  };

  const plot = (() => {
    if (!hasData) {
      return (
        <div className={styles.empty} style={{ height: donut ? height : height + AXIS_BAND }}>
          {empty ?? strings.chart.empty}
        </div>
      );
    }

    if (width <= 0) return <div style={{ height: donut ? height : height + TOP + AXIS_BAND }} />;

    return donut ? (
      <DonutPlot
        values={series[0]?.data ?? []}
        size={Math.min(height, width)}
        active={active}
        onActive={setActive}
        color={segmentColor}
        centerValue={formatValue(donutTotal(series[0]?.data ?? []))}
        centerLabel={strings.chart.total}
        readout={active === null ? null : readoutAt(active)}
      />
    ) : (
      <CartesianPlot
        type={type}
        series={series}
        colors={colors}
        count={count}
        width={width}
        height={height}
        stacked={stacked && type !== 'line'}
        zero={zero || type !== 'line'}
        directLabels={directLabels}
        active={active}
        onActive={setActive}
        axisLabel={(index) => formatCategory(categories[index]!, index)}
        formatTick={(value) => compact.format(value)}
        formatValue={formatValue}
        readout={active === null ? null : readoutAt(active)}
      />
    );
  })();

  return (
    <figure
      ref={rootRef}
      className={cx(styles.root, appear && styles.appear, className)}
      style={{ ...chartPaletteStyle, '--donut-size': `${height}px`, ...style } as CSSProperties}
      data-type={type}
      {...rest}
    >
      {showLegend && hasData && (
        <ul className={styles.legend} aria-hidden>
          {(donut ? categories : series).map((item, index) => {
            const isSeries = !donut;
            const color = isSeries ? colors[index]! : segmentColor(index);
            const name = isSeries
              ? (item as ChartSeries).label
              : formatCategory(item as ChartCategory, index);
            const key = isSeries ? (item as ChartSeries).id : `${index}`;

            return (
              <li
                key={key}
                className={styles.legendItem}
                data-dimmed={donut && active !== null && active !== index ? true : undefined}
              >
                <span
                  className={type === 'line' ? styles.keyLine : styles.keySwatch}
                  style={{ '--key-color': colorValue(color) } as CSSProperties}
                />

                {name}
              </li>
            );
          })}
        </ul>
      )}

      <div
        ref={plotRef}
        className={styles.plot}
        role="group"
        aria-label={label}
        aria-describedby={hasData ? hintId : undefined}
        tabIndex={hasData ? 0 : undefined}
        onKeyDown={hasData ? step : undefined}
        onBlur={() => setActive(null)}
      >
        {plot}
      </div>

      {hasData && (
        <VisuallyHidden.Root>
          <span id={hintId}>{strings.chart.keyboardHint}</span>

          <span aria-live="polite">{active === null ? '' : announce(active)}</span>

          <table>
            <caption>{label}</caption>

            <thead>
              <tr>
                <th scope="col">{categoryLabel ?? strings.chart.category}</th>

                {series.map((item) => (
                  <th key={item.id} scope="col">
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {categories.map((category, index) => (
                // Категории не переставляются внутри одного рендера: индекс — стабильный ключ
                <tr key={index}>
                  <th scope="row">{formatCategory(category, index, true)}</th>

                  {series.map((item) => {
                    const value = item.data[index];

                    return <td key={item.id}>{isValue(value) ? formatValue(value) : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </VisuallyHidden.Root>
      )}
    </figure>
  );
}

interface CartesianPlotProps {
  type: ChartType;
  series: readonly ChartSeries[];
  colors: readonly ChartColor[];
  count: number;
  width: number;
  height: number;
  stacked: boolean;
  zero: boolean;
  directLabels: boolean;
  active: number | null;
  onActive: (index: number | null) => void;
  axisLabel: (index: number) => string;
  formatTick: (value: number) => string;
  formatValue: (value: number) => string;
  readout: Readout | null;
}

function CartesianPlot({
  type,
  series,
  colors,
  count,
  width,
  height,
  stacked,
  zero,
  directLabels,
  active,
  onActive,
  axisLabel,
  formatTick,
  formatValue,
  readout,
}: CartesianPlotProps) {
  const extent = valueExtent(series, { stacked, includeZero: zero }) ?? { min: 0, max: 1 };
  const ticks = niceTicks(extent.min, extent.max, Math.max(2, Math.round(height / 52)));
  const tickLabels = ticks.ticks.map(formatTick);
  const left =
    Math.ceil(Math.max(...tickLabels.map((text) => monoTextWidth(text, AXIS_FONT)))) + 10;
  const y = linearScale([ticks.min, ticks.max], [TOP + height, TOP]);
  const bars = type === 'bar';
  const stacks = stacked ? stackSeries(series) : null;

  // Прямые подписи концов линий: до трёх рядов и только если не налезают
  const lastIndex = (data: readonly ChartValue[]) => {
    for (let index = data.length - 1; index >= 0; index -= 1)
      if (isValue(data[index])) return index;

    return -1;
  };
  const endValues = series.map((item, position) => {
    const index = lastIndex(item.data);
    const value = index < 0 ? null : stacks ? stacks[position]![index]![1] : item.data[index]!;

    return { index, value, text: index < 0 ? '' : formatValue(item.data[index]!) };
  });
  const wantsEnd = !bars && directLabels && series.length <= 3;
  const endFits =
    wantsEnd &&
    endLabelsFit(
      endValues.filter((item) => item.value !== null).map((item) => y(item.value!)),
      AXIS_FONT + 3,
    );
  const right = endFits
    ? Math.ceil(Math.max(...endValues.map((item) => monoTextWidth(item.text, AXIS_FONT)))) + 12
    : MARKER + 4;

  const range: [number, number] = [left, Math.max(left + 1, width - right)];
  const band = bandScale(count, range);
  const point = pointScale(count, range);
  const xAt = (index: number) => (bars ? band.center(index) : point(index));
  const slot = bars
    ? band.band
    : count > 1
      ? (range[1] - range[0]) / (count - 1)
      : range[1] - range[0];
  const shownLabels = new Set(
    thinLabels(
      count,
      slot,
      Math.max(
        ...Array.from({ length: count }, (_, index) => monoTextWidth(axisLabel(index), AXIS_FONT)),
      ) + 12,
    ),
  );
  const baseline = y(Math.min(Math.max(0, ticks.min), ticks.max));
  const slots = bars ? barSlots(band.band, stacked ? 1 : series.length, stacked) : [];
  const svgHeight = TOP + height + AXIS_BAND;

  const track = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;

    if (bars) {
      const index = Math.floor((x - range[0]) / (band.band || 1));

      onActive(index >= 0 && index < count ? index : null);
    } else {
      onActive(nearestPointIndex(x, count, range));
    }
  };

  // Прямая подпись над столбцом — только у одного ряда и если влезает по ширине полосы
  const barLabels =
    bars &&
    directLabels &&
    series.length === 1 &&
    series[0]!.data.every(
      (value) => !isValue(value) || monoTextWidth(formatValue(value), AXIS_FONT) + 4 <= band.band,
    );

  return (
    <div className={styles.cartesian}>
      <svg
        width={width}
        height={svgHeight}
        viewBox={`0 0 ${width} ${svgHeight}`}
        className={styles.svg}
        aria-hidden
        onPointerMove={track}
        onPointerLeave={() => onActive(null)}
      >
        <g className={styles.grid}>
          {ticks.ticks.map((tick, index) => (
            <g key={tick}>
              <line x1={range[0]} x2={range[1]} y1={y(tick)} y2={y(tick)} />

              <text x={left - 8} y={y(tick)} className={styles.tickY} dy="0.32em">
                {tickLabels[index]}
              </text>
            </g>
          ))}
        </g>

        {bars && active !== null && (
          <rect
            x={band.start(active)}
            y={TOP}
            width={band.band}
            height={height}
            className={styles.bandHover}
          />
        )}

        {bars
          ? series.map((item, position) => (
              <g
                key={item.id}
                className={styles.series}
                style={{ '--series-color': colorValue(colors[position]!) } as CSSProperties}
              >
                {item.data.map((value, index) => {
                  if (!isValue(value)) return null;

                  const span = stacks?.[position]?.[index];
                  const slotFor = slots[stacked ? 0 : position]!;
                  const x = band.start(index) + slotFor.offset;
                  let base = span ? y(span[0]) : baseline;
                  const end = span ? y(span[1]) : y(value);

                  // 2 px поверхности между кусками стопки: отступ от предыдущего куска, а не обводка
                  if (span && span[0] !== 0 && Math.abs(end - base) > 2)
                    base += end < base ? -2 : 2;

                  // Скругляется только внешний кусок стопки — у внутренних конец упирается в соседа
                  const outer =
                    !stacks ||
                    stacks.slice(position + 1).every((next) => {
                      const nextSpan = next[index];

                      return !nextSpan || Math.sign(nextSpan[1]) !== Math.sign(span![1]);
                    });

                  return (
                    <path
                      key={index}
                      d={barPath(x, slotFor.width, base, end, outer ? undefined : 0)}
                      className={styles.bar}
                      data-dimmed={active !== null && active !== index ? true : undefined}
                    />
                  );
                })}
              </g>
            ))
          : series.map((item, position) => {
              const span = stacks?.[position];
              const tops = item.data.map((value, index) =>
                isValue(value) ? { x: point(index), y: y(span ? span[index]![1] : value) } : null,
              );
              const segments = splitSegments(tops);
              const area =
                type === 'area'
                  ? span
                    ? stackedAreaPath(item.data, span, point, y)
                    : segmentsAreaPath(segments, baseline)
                  : null;

              return (
                <g
                  key={item.id}
                  className={styles.series}
                  style={{ '--series-color': colorValue(colors[position]!) } as CSSProperties}
                >
                  {area && (
                    <path d={area} className={cx(styles.area, stacked && styles.areaStacked)} />
                  )}

                  <path d={segmentsPath(segments)} className={styles.line} />

                  {endFits && endValues[position]!.value !== null && active === null && (
                    <circle
                      cx={point(endValues[position]!.index)}
                      cy={y(endValues[position]!.value!)}
                      r={MARKER}
                      className={styles.marker}
                    />
                  )}
                </g>
              );
            })}

        <line x1={range[0]} x2={range[1]} y1={baseline} y2={baseline} className={styles.baseline} />

        {!bars && active !== null && (
          <g className={styles.crosshair}>
            <line x1={xAt(active)} x2={xAt(active)} y1={TOP} y2={TOP + height} />

            {series.map((item, position) => {
              const value = item.data[active];

              if (!isValue(value)) return null;

              const top = stacks ? stacks[position]![active]![1] : value;

              return (
                <circle
                  key={item.id}
                  cx={xAt(active)}
                  cy={y(top)}
                  r={MARKER}
                  className={styles.marker}
                  style={{ '--series-color': colorValue(colors[position]!) } as CSSProperties}
                />
              );
            })}
          </g>
        )}

        {endFits &&
          endValues.map((item, position) =>
            item.value === null ? null : (
              <text
                key={series[position]!.id}
                x={point(item.index) + MARKER + 6}
                y={y(item.value)}
                dy="0.32em"
                className={styles.directLabel}
              >
                {item.text}
              </text>
            ),
          )}

        {barLabels &&
          series[0]!.data.map((value, index) =>
            isValue(value) ? (
              <text
                key={index}
                x={band.center(index)}
                y={value >= 0 ? y(value) - 5 : y(value) + 5}
                dy={value >= 0 ? 0 : '0.8em'}
                className={cx(styles.directLabel, styles.barLabel)}
              >
                {formatValue(value)}
              </text>
            ) : null,
          )}

        <g className={styles.axisX}>
          {Array.from({ length: count }, (_, index) =>
            shownLabels.has(index) ? (
              <text
                key={index}
                x={xAt(index)}
                y={TOP + height + AXIS_BAND - 6}
                className={cx(
                  styles.tickX,
                  !bars && index === 0 && styles.tickStart,
                  !bars && index === count - 1 && count > 1 && styles.tickEnd,
                )}
              >
                {axisLabel(index)}
              </text>
            ) : null,
          )}
        </g>
      </svg>

      {readout && active !== null && (
        <ChartTooltip readout={readout} x={xAt(active)} width={width} />
      )}
    </div>
  );
}

/** Область стопки: от верхней кромки предыдущего ряда до своей, с разрывами на пропусках */
function stackedAreaPath(
  data: readonly ChartValue[],
  spans: readonly ([number, number] | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  const parts: string[] = [];
  let run: number[] = [];

  const flush = () => {
    if (run.length > 1) {
      const top = run.map((index) => `${x(index)} ${y(spans[index]![1])}`);
      const bottom = [...run].reverse().map((index) => `${x(index)} ${y(spans[index]![0])}`);

      parts.push(`M${top.join(' L')} L${bottom.join(' L')} Z`);
    }

    run = [];
  };

  data.forEach((value, index) => {
    if (isValue(value) && spans[index]) run.push(index);
    else flush();
  });
  flush();

  return parts.join(' ');
}

interface ChartTooltipProps {
  readout: Readout;
  x: number;
  width: number;
}

/**
 * Подсказка — в той же обёртке, что SVG, без портала: она привязана к точке графика и не должна
 * перекрывать соседние слои. Значение — главное (жирное), имя ряда — второстепенное: читатель уже знает
 * ряд и ищет число. Ключ ряда — короткий штрих, а не плашка.
 */
function ChartTooltip({ readout, x, width }: ChartTooltipProps) {
  // Сторона — от середины: у правого края подсказка уходит влево от точки и не вылезает за график
  const side = x > width / 2 ? 'left' : 'right';

  return (
    <div
      className={styles.tooltip}
      data-side={side}
      style={{ '--tooltip-x': `${x}px` } as CSSProperties}
      aria-hidden
    >
      <div className={styles.tooltipTitle}>{readout.title}</div>

      {readout.rows.map((row) => (
        <div key={row.id} className={styles.tooltipRow}>
          <span
            className={row.line ? styles.keyLine : styles.keySwatch}
            style={{ '--key-color': colorValue(row.color) } as CSSProperties}
          />

          <span className={styles.tooltipValue}>{row.value}</span>

          <span className={styles.tooltipLabel}>{row.label}</span>
        </div>
      ))}

      {readout.total && (
        <div className={cx(styles.tooltipRow, styles.tooltipTotal)}>
          <span className={styles.tooltipValue}>{readout.total}</span>
        </div>
      )}
    </div>
  );
}

interface DonutPlotProps {
  values: readonly ChartValue[];
  size: number;
  active: number | null;
  onActive: (index: number | null) => void;
  color: (index: number) => ChartColor;
  centerValue: string;
  centerLabel: string;
  readout: Readout | null;
}

/**
 * Кольцо: тонкий обод, 2 px поверхности между сегментами. Подсказки нет — значение наведённого сегмента
 * встаёт в центр вместо суммы: центр и так пустой, а всплывающее над кольцом закрыло бы соседние сегменты.
 */
function DonutPlot({
  values,
  size,
  active,
  onActive,
  color,
  centerValue,
  centerLabel,
  readout,
}: DonutPlotProps) {
  const outer = size / 2 - 2;
  const inner = outer * 0.7;
  const center = size / 2;
  const segments = donutSegments(values);
  const row = readout?.rows[0];

  return (
    <div className={styles.donut} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.svg}
        aria-hidden
        onPointerLeave={() => onActive(null)}
      >
        {segments.map((segment) => (
          <path
            key={segment.index}
            d={arcPath(center, center, outer, inner, segment.start, segment.end)}
            fillRule="evenodd"
            className={styles.segment}
            style={{ '--series-color': colorValue(color(segment.index)) } as CSSProperties}
            data-dimmed={active !== null && active !== segment.index ? true : undefined}
            onPointerEnter={() => onActive(segment.index)}
          />
        ))}
      </svg>

      <div className={styles.donutCenter} aria-hidden>
        <span className={styles.donutValue}>{row ? row.value : centerValue}</span>

        <span className={styles.donutLabel}>{readout ? readout.title : centerLabel}</span>

        {row && <span className={styles.donutShare}>{row.label}</span>}
      </div>
    </div>
  );
}
