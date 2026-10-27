import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import {
  addMonths,
  clampDate,
  createDateFormatter,
  isOutOfRange,
  isSameMonth,
  monthGrid,
  monthName,
  moveByKey,
  parseIsoDate,
  startOfMonth,
  todayIsoDate,
  weekdayLabels,
  type IsoDate,
  type Weekday,
} from './calendar-date';
import {
  isWithinBounds,
  normalizeRange,
  previewRange,
  rangeBounds,
  rangePosition,
  visibleStartMonth,
  type DateRange,
} from './calendar-range';
import styles from './calendar.module.css';

interface CalendarBaseProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'onChange' | 'defaultValue' | 'autoFocus'
> {
  /** Раньше нельзя (включительно можно) */
  min?: IsoDate;
  /** Позже нельзя (включительно можно) */
  max?: IsoDate;
  /** Свои выключенные дни: выходные, занятые даты */
  isDateDisabled?: (date: IsoDate) => boolean;
  /** Локаль подписей месяца и дней недели; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
  /** С какого дня неделя: 1 — понедельник, 0 — воскресенье */
  weekStartsOn?: Weekday;
  /** Какой месяц показать, если день не выбран: любая дата этого месяца */
  defaultMonth?: IsoDate;
  /** Сколько месяцев рядом; при двух и больше дни соседних месяцев в сетке не показываются */
  months?: number;
  /** Сразу поставить фокус на день — когда календарь открылся в поповере */
  autoFocus?: boolean;
  /** «Сегодня» — по умолчанию по местным часам; задаётся для историй и тестов */
  today?: IsoDate;
}

export interface CalendarSingleProps extends CalendarBaseProps {
  /** `single` — один день (по умолчанию), `range` — диапазон */
  mode?: 'single';
  /** Выбранный день `YYYY-MM-DD`; null — ничего не выбрано */
  value?: IsoDate | null;
  defaultValue?: IsoDate | null;
  onValueChange?: (value: IsoDate) => void;
  allowDisabledInRange?: never;
}

export interface CalendarRangeProps extends CalendarBaseProps {
  /** Диапазон: первый выбор — начало, второй — конец (порядок не важен) */
  mode: 'range';
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  /** Приходит, когда выбраны оба конца */
  onValueChange?: (value: DateRange) => void;
  /**
   * Диапазон может проходить через выключенные дни (`isDateDisabled`) — концами они всё равно не станут.
   * По умолчанию нет: занятая дата посреди периода делает его недействительным
   */
  allowDisabledInRange?: boolean;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

type Selection = IsoDate | DateRange | null;

/** Ключ выбора строкой: диапазон-объект от родителя каждый рендер новый, а сравнивать надо значения */
function selectionKey(value: Selection | undefined): string {
  if (!value) return '';

  return typeof value === 'string' ? value : `${value.start}/${value.end}`;
}

/**
 * Месяц сеткой по шаблону WAI-ARIA «date picker»: таблица role="grid", в ней одна остановка Tab — день
 * в фокусе; стрелки, PageUp / PageDown (с Shift — год), Home / End двигают фокус, Enter / Space выбирают.
 * Показан всегда месяц дня в фокусе — листать месяц и ходить по дням это одно и то же состояние; при
 * нескольких месяцах окно сдвигается ровно настолько, чтобы день в фокусе остался видимым.
 * `mode="range"` — диапазон: первый выбор ставит начало, до второго промежуток следует за курсором или
 * фокусом и не перешагивает выключенные дни.
 */
export function Calendar({
  mode = 'single',
  value,
  defaultValue = null,
  onValueChange,
  allowDisabledInRange = false,
  min,
  max,
  isDateDisabled,
  locale: localeProp,
  weekStartsOn = 1,
  defaultMonth,
  months = 1,
  autoFocus = false,
  today: todayProp,
  className,
  onFocus,
  onBlur,
  ...rest
}: CalendarProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const isRange = mode === 'range';
  // Режим определяет тип значения; внутри календарь работает с обоими через одну функцию
  const emit = onValueChange as ((next: IsoDate | DateRange) => void) | undefined;
  const today = todayProp ?? todayIsoDate();
  const [innerValue, setInnerValue] = useState<Selection>(defaultValue);
  const selected = value === undefined ? innerValue : value;
  const selectedDay = typeof selected === 'string' ? selected : null;
  const selectedRange = selected && typeof selected === 'object' ? selected : null;
  const count = Math.max(1, Math.floor(months));
  const [focused, setFocused] = useState(() =>
    clampDate(selectedDay ?? selectedRange?.start ?? defaultMonth ?? today, min, max),
  );
  const [firstMonth, setFirstMonth] = useState(() => startOfMonth(focused));
  const [shownKey, setShownKey] = useState(() => selectionKey(selected));
  // Начало диапазона, пока конец не выбран; hovered — день под курсором для предпросмотра
  const [anchor, setAnchor] = useState<IsoDate | null>(null);
  const [hovered, setHovered] = useState<IsoDate | null>(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Фокус переносится только после клавиш сетки и autoFocus: смена value снаружи не должна его красть
  const moveFocus = useRef(autoFocus);
  const baseId = useId();

  const focusDay = (day: IsoDate) => {
    setFocused(day);
    setFirstMonth((start) => visibleStartMonth(start, day, count));
  };

  // Значение сменили снаружи — показать его месяц (состояние от пропсов, без эффекта и лишнего кадра)
  const key = selectionKey(selected);

  if (key !== shownKey) {
    setShownKey(key);
    setAnchor(null);

    const day = selectedDay ?? selectedRange?.start;

    if (day && parseIsoDate(day)) focusDay(clampDate(day, min, max));
  }

  useEffect(() => {
    if (!moveFocus.current) return;

    moveFocus.current = false;
    rootRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-date="${focused}"]:not([data-outside])`)
      ?.focus();
  }, [focused]);

  const dayLabel = createDateFormatter(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const isDisabled = (day: IsoDate) =>
    isOutOfRange(day, min, max) || Boolean(isDateDisabled?.(day));
  const shownMonths = Array.from({ length: count }, (_, index) => addMonths(firstMonth, index));
  const grids = shownMonths.map((month) => monthGrid(month, weekStartsOn));
  const canGoBack = !min || min < firstMonth;
  const canGoForward = !max || max >= addMonths(firstMonth, count);

  // Края диапазона — по видимым дням (с хвостами сеток) и по самому началу, если оно уже за экраном
  const firstShown = grids[0]?.[0]?.[0] ?? firstMonth;
  const lastShown = grids.at(-1)?.at(-1)?.at(-1) ?? firstMonth;
  const bounds =
    isRange && anchor
      ? rangeBounds(
          anchor,
          allowDisabledInRange ? (day) => isOutOfRange(day, min, max) : isDisabled,
          anchor < firstShown ? anchor : firstShown,
          anchor > lastShown ? anchor : lastShown,
        )
      : null;
  const previewEnd = hovered ?? (focusWithin ? focused : anchor);
  const shownRange =
    anchor && bounds ? previewRange(anchor, previewEnd ?? anchor, bounds) : selectedRange;

  const shiftMonths = (delta: number) => {
    const next = clampDate(addMonths(focused, delta), min, max);

    setFocused(next);
    setFirstMonth(visibleStartMonth(addMonths(firstMonth, delta), next, count));
  };

  const commit = (next: IsoDate | DateRange) => {
    setShownKey(selectionKey(next));

    if (value === undefined) setInnerValue(next);

    emit?.(next);
  };

  const select = (day: IsoDate) => {
    if (isDisabled(day)) return;

    focusDay(day);

    if (!isRange) {
      commit(day);

      return;
    }

    // Первый выбор или день за краем от прежнего начала — это новое начало
    if (!anchor || !bounds || !isWithinBounds(day, bounds)) {
      setAnchor(day);

      return;
    }

    setAnchor(null);
    setHovered(null);
    commit(normalizeRange(anchor, day));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const next = moveByKey(focused, event, weekStartsOn);

    if (!next) return;

    event.preventDefault();
    moveFocus.current = true;
    focusDay(clampDate(next, min, max));
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);

    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  };

  const navButton = (direction: -1 | 1) => (
    <IconButton
      label={direction < 0 ? strings.calendar.previousMonth : strings.calendar.nextMonth}
      size="sm"
      disabled={direction < 0 ? !canGoBack : !canGoForward}
      onClick={() => shiftMonths(direction)}
    >
      <Icon icon={direction < 0 ? ChevronLeft : ChevronRight} size="sm" />
    </IconButton>
  );

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-mode={isRange ? 'range' : undefined}
      onFocus={(event) => {
        onFocus?.(event);
        setFocusWithin(true);
      }}
      onBlur={handleBlur}
      {...rest}
    >
      {shownMonths.map((month, monthIndex) => {
        const titleId = `${baseId}-title-${monthIndex}`;

        return (
          <div key={month} className={styles.month}>
            <div className={styles.header}>
              {monthIndex === 0 ? navButton(-1) : <span className={styles.navSpacer} />}

              <div id={titleId} className={styles.title} aria-live="polite">
                {monthName(month, locale)} <span className={styles.year}>{month.slice(0, 4)}</span>
              </div>

              {monthIndex === count - 1 ? navButton(1) : <span className={styles.navSpacer} />}
            </div>

            <table
              role="grid"
              aria-labelledby={titleId}
              aria-multiselectable={isRange || undefined}
              className={styles.grid}
              onKeyDown={handleKeyDown}
              onPointerLeave={() => setHovered(null)}
            >
              <thead>
                <tr>
                  {weekdayLabels(locale, weekStartsOn).map((label) => (
                    <th key={label.long} scope="col" abbr={label.long} className={styles.weekday}>
                      {label.short}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(grids[monthIndex] ?? []).map((week) => (
                  <tr key={week[0]}>
                    {week.map((day) => {
                      const outside = !isSameMonth(day, month);

                      // Соседний месяц виден рядом — его хвост в этой сетке только запутал бы
                      if (outside && count > 1) {
                        return <td key={day} role="gridcell" className={styles.cell} />;
                      }

                      const disabled = isDisabled(day);
                      const unreachable = Boolean(bounds && !isWithinBounds(day, bounds));
                      const position = isRange ? rangePosition(day, shownRange) : null;
                      const isEnd =
                        position === 'start' || position === 'end' || position === 'single';
                      const isSelected = isRange ? isEnd : day === selectedDay;

                      return (
                        <td
                          key={day}
                          role="gridcell"
                          aria-selected={
                            isRange ? (anchor ? day === anchor : Boolean(position)) : isSelected
                          }
                          className={styles.cell}
                          data-range={position ?? undefined}
                          data-preview={position && anchor ? '' : undefined}
                        >
                          <button
                            type="button"
                            data-date={day}
                            tabIndex={day === focused ? 0 : -1}
                            aria-label={dayLabel(day)}
                            aria-current={day === today ? 'date' : undefined}
                            // aria-disabled, а не disabled: по выключенному дню можно пройти стрелками
                            aria-disabled={disabled || undefined}
                            data-selected={isSelected || undefined}
                            data-today={day === today || undefined}
                            data-outside={outside || undefined}
                            // За краем от начала: выбрать можно, но это будет новое начало
                            data-unreachable={(unreachable && !disabled) || undefined}
                            className={styles.day}
                            onClick={() => select(day)}
                            onPointerEnter={anchor ? () => setHovered(day) : undefined}
                          >
                            {Number(day.slice(8))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
