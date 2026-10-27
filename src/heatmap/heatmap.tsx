import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import {
  createDateFormatter,
  todayIsoDate,
  weekdayLabels,
  type IsoDate,
  type Weekday,
} from '../calendar/calendar-date';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import {
  defaultStart,
  heatLevel,
  heatmapLayout,
  maxInRange,
  moveHeatmapFocus,
} from './heatmap-layout';
import styles from './heatmap.module.css';
import { weekStartForLocale } from './week-start';

export interface HeatmapProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Значения по дням: `{ '2026-10-01': 12 }`; дня нет — ноль */
  values: Readonly<Record<IsoDate, number>>;
  /** Последний день, по умолчанию — сегодня */
  end?: IsoDate;
  /** Первый день, по умолчанию — 53 недели до `end` */
  start?: IsoDate;
  /** Первый день недели; по умолчанию — по локали */
  weekStartsOn?: Weekday;
  /** Подпись сетки для скринридера; по умолчанию — «Активность» */
  label?: string;
  /** Текст подсказки и озвучки дня; по умолчанию — «12 сообщений, 3 октября» */
  formatCell?: (value: number, date: IsoDate, dateLabel: string) => string;
  /** Клик или Enter по дню */
  onCellClick?: (date: IsoDate) => void;
  /** Легенда «меньше — больше» */
  legend?: boolean;
  /** Локаль Intl и начала недели; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

const LEVELS = [0, 1, 2, 3, 4] as const;

interface Shown {
  date: IsoDate;
  x: number;
  y: number;
  /** Сторона подсказки: у верхних строк — под клеткой, у краёв — внутрь, иначе её обрежет прокрутка */
  below: boolean;
  align: 'start' | 'center' | 'end';
}

/**
 * Календарь активности, как вклад на GitHub: столбцы — недели, строки — дни недели в порядке локали.
 * Цвет — одна шкала акцента пространства (больше — плотнее), пустой день — серая клетка. Клавиатура:
 * фокус на сетке, стрелки — по дням и неделям, подсказка и озвучка — как при наведении.
 */
export function Heatmap({
  values,
  end: endProp,
  start: startProp,
  weekStartsOn: weekStartsOnProp,
  label,
  formatCell,
  onCellClick,
  legend = true,
  locale: localeProp,
  className,
  ...rest
}: HeatmapProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const weekStartsOn = weekStartsOnProp ?? weekStartForLocale(locale);
  const end = endProp ?? todayIsoDate();
  const start = startProp ?? defaultStart(end);
  const { weeks, months } = heatmapLayout(start, end, weekStartsOn);
  const max = maxInRange(values, start, end);
  const dayLabel = createDateFormatter(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const monthLabel = createDateFormatter(locale, { month: 'short' });
  const weekdays = weekdayLabels(locale, weekStartsOn);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<IsoDate>(end);
  const [shown, setShown] = useState<Shown | null>(null);
  const current = focused < start || focused > end ? end : focused;

  useLayoutEffect(() => {
    // Свежие дни справа: узкая колонка открывается на конце периода, а не на прошлогоднем начале
    const element = scrollRef.current;

    if (element) element.scrollLeft = element.scrollWidth;
  }, [start, end]);

  const textFor = (date: IsoDate) => {
    const value = values[date] ?? 0;
    const dateText = dayLabel(date);

    return formatCell ? formatCell(value, date, dateText) : strings.heatmap.cell(value, dateText);
  };

  const cellOf = (date: IsoDate) =>
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`) ?? null;

  // Позиция подсказки — с самой клетки в момент наведения или фокуса: в рендере DOM не читаем
  const show = (date: IsoDate, cell: HTMLElement, row: number, column: number) =>
    setShown({
      date,
      x: cell.offsetLeft + cell.offsetWidth / 2,
      y: row < 3 ? cell.offsetTop + cell.offsetHeight : cell.offsetTop,
      below: row < 3,
      align: column < 6 ? 'start' : column > weeks.length - 7 ? 'end' : 'center',
    });

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && onCellClick) {
      event.preventDefault();
      onCellClick(current);

      return;
    }

    if (event.key === 'Escape') {
      setShown(null);

      return;
    }

    const next = moveHeatmapFocus(current, event.key, start, end);

    if (!next) return;

    event.preventDefault();
    setFocused(next);
    cellOf(next)?.focus();
  };

  return (
    <div className={cx(styles.root, className)} {...rest}>
      <div ref={scrollRef} className={styles.scroll}>
        <div
          ref={gridRef}
          role="grid"
          aria-label={label ?? strings.heatmap.label}
          className={styles.grid}
          style={{ '--weeks': weeks.length } as CSSProperties}
          onKeyDown={keyDown}
          onPointerLeave={() => setShown(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setShown(null);
          }}
        >
          {months.map(({ week, month }) => (
            <span
              key={month}
              className={styles.month}
              style={{ gridColumn: `${week + 2} / span 3` }}
              aria-hidden
            >
              {monthLabel(month)}
            </span>
          ))}

          {weekdays.map((weekdayLabel, row) => (
            <div key={weekdayLabel.long} role="row" className={styles.row}>
              <span
                className={styles.weekday}
                style={{ gridRow: row + 2 }}
                // Подписаны через строку, как у GitHub: семь подписей в 11 px сливаются
                data-hidden={row % 2 === 1 || undefined}
                aria-hidden
              >
                {weekdayLabel.short}
              </span>

              {weeks.map((week, column) => {
                const date = week[row];

                if (!date) return null;

                const value = values[date] ?? 0;

                return (
                  <div
                    key={date}
                    role="gridcell"
                    tabIndex={date === current ? 0 : -1}
                    aria-label={textFor(date)}
                    data-date={date}
                    data-level={heatLevel(value, max)}
                    className={styles.cell}
                    style={{ gridColumn: column + 2, gridRow: row + 2 }}
                    onPointerEnter={(event) => show(date, event.currentTarget, row, column)}
                    onFocus={(event) => {
                      setFocused(date);
                      show(date, event.currentTarget, row, column);
                    }}
                    onClick={onCellClick ? () => onCellClick(date) : undefined}
                    data-clickable={onCellClick ? true : undefined}
                  />
                );
              })}
            </div>
          ))}

          {shown && (
            <div
              className={styles.tooltip}
              data-below={shown.below || undefined}
              data-align={shown.align}
              style={{ '--tip-x': `${shown.x}px`, '--tip-y': `${shown.y}px` } as CSSProperties}
              aria-hidden
            >
              {textFor(shown.date)}
            </div>
          )}
        </div>
      </div>

      {legend && (
        <div className={styles.legend} aria-hidden>
          <span>{strings.heatmap.less}</span>

          {LEVELS.map((level) => (
            <span key={level} className={styles.cell} data-level={level} />
          ))}

          <span>{strings.heatmap.more}</span>
        </div>
      )}
    </div>
  );
}
