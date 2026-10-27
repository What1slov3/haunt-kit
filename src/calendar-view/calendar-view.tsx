import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '../button/button';
import {
  addDays,
  addMonths,
  createDateFormatter,
  formatIsoDate,
  formatIsoDateRange,
  isSameMonth,
  monthGrid,
  moveByKey,
  startOfWeek,
  todayIsoDate,
  weekdayLabels,
  type IsoDate,
  type Weekday,
} from '../calendar/calendar-date';
import { weekStartForLocale } from '../heatmap/week-start';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { ToggleGroup } from '../toggle-group/toggle-group';

import {
  countOn,
  isSpanning,
  layoutDayColumns,
  layoutWeekLanes,
  timedOn,
  weekDays,
  type CalendarEventBase,
  type LaneBar,
} from './calendar-view-layout';
import styles from './calendar-view.module.css';

export type CalendarViewMode = 'month' | 'week';

export type CalendarEventTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface CalendarViewEvent extends CalendarEventBase {
  title: string;
  tone?: CalendarEventTone;
}

export interface CalendarViewProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  events: readonly CalendarViewEvent[];
  /** Месяц или неделя (управляемо) */
  view?: CalendarViewMode;
  defaultView?: CalendarViewMode;
  onViewChange?: (view: CalendarViewMode) => void;
  /** Текущий день: от него показывается месяц или неделя (управляемо) */
  date?: IsoDate;
  defaultDate?: IsoDate;
  onDateChange?: (date: IsoDate) => void;
  /** Сегодня; по умолчанию — по часам устройства */
  today?: IsoDate;
  /** Первый день недели; по умолчанию — по локали */
  weekStartsOn?: Weekday;
  onDayClick?: (date: IsoDate) => void;
  onEventClick?: (event: CalendarViewEvent) => void;
  /** «ещё N» в ячейке месяца; по умолчанию — как клик по дню */
  onMoreClick?: (date: IsoDate) => void;
  /** Строк событий в ячейке месяца, дальше — «ещё N» */
  maxEventsPerDay?: number;
  /** Часы недели [с, до); по умолчанию весь день */
  hours?: readonly [number, number];
  /** К какому часу прокрутить неделю при открытии */
  scrollToHour?: number;
  /** Высота сетки недели, px */
  weekHeight?: number;
  /** Локаль Intl и начала недели; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

const HOUR_PX = 48;

/**
 * Экран событий: месяц и неделя. Многодневные — полосой через дни, пересечения в неделе — колонками,
 * не влезло в ячейку — «ещё N». Дни месяца ходят стрелками (как `Calendar`), PageUp / PageDown — месяц.
 * Даты — `IsoDate` без пояса: день события не съезжает у человека в другом часовом поясе.
 */
export function CalendarView({
  events,
  view: viewProp,
  defaultView = 'month',
  onViewChange,
  date: dateProp,
  defaultDate,
  onDateChange,
  today: todayProp,
  weekStartsOn: weekStartsOnProp,
  onDayClick,
  onEventClick,
  onMoreClick,
  maxEventsPerDay = 3,
  hours = [0, 24],
  scrollToHour = 8,
  weekHeight = 480,
  locale: localeProp,
  className,
  ...rest
}: CalendarViewProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const weekStartsOn = weekStartsOnProp ?? weekStartForLocale(locale);
  const today = todayProp ?? todayIsoDate();
  const [viewState, setViewState] = useState<CalendarViewMode>(defaultView);
  const [dateState, setDateState] = useState<IsoDate>(defaultDate ?? today);
  const view = viewProp ?? viewState;
  const date = dateProp ?? dateState;
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusDay, setFocusDay] = useState<IsoDate | null>(null);

  useEffect(() => {
    if (!focusDay) return;

    gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
    setFocusDay(null);
  }, [focusDay]);

  const setDate = (next: IsoDate) => {
    if (dateProp === undefined) setDateState(next);

    onDateChange?.(next);
  };

  const setView = (next: CalendarViewMode) => {
    if (viewProp === undefined) setViewState(next);

    onViewChange?.(next);
  };

  const step = (direction: 1 | -1) =>
    setDate(view === 'month' ? addMonths(date, direction) : addDays(date, 7 * direction));

  const weekStart = startOfWeek(date, weekStartsOn);
  const title =
    view === 'month'
      ? capitalize(formatIsoDate(date, locale, { month: 'long', year: 'numeric' }), locale)
      : formatIsoDateRange(weekStart, addDays(weekStart, 6), locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  const fullDay = createDateFormatter(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const weekdays = weekdayLabels(locale, weekStartsOn);

  const dayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: IsoDate) => {
    const next = moveByKey(day, event, weekStartsOn);

    if (!next) return;

    event.preventDefault();
    setDate(next);
    setFocusDay(next);
  };

  return (
    <div className={cx(styles.root, className)} {...rest}>
      <div className={styles.header}>
        <h2 className={styles.title} aria-live="polite">
          {title}
        </h2>

        <div className={styles.nav}>
          <Button size="sm" variant="secondary" onClick={() => setDate(today)}>
            {strings.calendarView.today}
          </Button>

          <IconButton
            size="sm"
            variant="ghost"
            label={strings.calendarView.previous[view]}
            onClick={() => step(-1)}
          >
            <Icon icon={ChevronLeft} size="sm" />
          </IconButton>

          <IconButton
            size="sm"
            variant="ghost"
            label={strings.calendarView.next[view]}
            onClick={() => step(1)}
          >
            <Icon icon={ChevronRight} size="sm" />
          </IconButton>

          <ToggleGroup.Root
            type="single"
            size="sm"
            value={view}
            aria-label={strings.calendarView.viewLabel}
            onValueChange={(value) => {
              if (value === 'month' || value === 'week') setView(value);
            }}
          >
            <ToggleGroup.Item value="month">{strings.calendarView.views.month}</ToggleGroup.Item>
            <ToggleGroup.Item value="week">{strings.calendarView.views.week}</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      </div>

      <div ref={gridRef}>
        {view === 'month' ? (
          <MonthView
            date={date}
            today={today}
            events={events}
            weekStartsOn={weekStartsOn}
            weekdays={weekdays}
            maxRows={maxEventsPerDay}
            fullDay={fullDay}
            locale={locale}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
            onMoreClick={onMoreClick ?? onDayClick}
            onDayKeyDown={dayKeyDown}
          />
        ) : (
          <WeekView
            start={weekStart}
            today={today}
            date={date}
            events={events}
            weekdays={weekdays}
            fullDay={fullDay}
            locale={locale}
            hours={hours}
            scrollToHour={scrollToHour}
            height={weekHeight}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
            onDayKeyDown={dayKeyDown}
          />
        )}
      </div>
    </div>
  );
}

/** Время `HH:MM` подписью локали (12 ч в en-US); формат — в UTC, чтобы пояс не сдвинул час */
function formatTimeRange(format: Intl.DateTimeFormat, start?: string, end?: string): string {
  const at = (value: string) => Date.parse(`1970-01-01T${value}:00Z`);

  if (!start) return '';

  return end ? format.formatRange(at(start), at(end)) : format.format(at(start));
}

function capitalize(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

interface SharedProps {
  today: IsoDate;
  events: readonly CalendarViewEvent[];
  weekdays: { short: string; long: string }[];
  fullDay: (date: IsoDate) => string;
  locale: string;
  onDayClick?: (date: IsoDate) => void;
  onEventClick?: (event: CalendarViewEvent) => void;
  onDayKeyDown: (event: KeyboardEvent<HTMLButtonElement>, day: IsoDate) => void;
}

interface MonthViewProps extends SharedProps {
  date: IsoDate;
  weekStartsOn: Weekday;
  maxRows: number;
  onMoreClick?: (date: IsoDate) => void;
}

function MonthView({
  date,
  today,
  events,
  weekStartsOn,
  weekdays,
  maxRows,
  fullDay,
  locale,
  onDayClick,
  onEventClick,
  onMoreClick,
  onDayKeyDown,
}: MonthViewProps) {
  const strings = useUiStrings();
  const weeks = monthGrid(date, weekStartsOn);
  const dayNumber = createDateFormatter(locale, { day: 'numeric' });
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return (
    <div className={styles.month} style={{ '--lanes': maxRows } as CSSProperties}>
      <div className={styles.weekdays} aria-hidden>
        {weekdays.map((weekday) => (
          <span key={weekday.long}>{weekday.short}</span>
        ))}
      </div>

      {weeks.map((week) => {
        const lanes = layoutWeekLanes(week, events, maxRows);

        return (
          <div key={week[0]} className={styles.week}>
            {week.map((day, column) => (
              <div
                key={day}
                className={styles.cell}
                style={{ gridColumn: column + 1 }}
                data-outside={!isSameMonth(day, date) || undefined}
                data-today={day === today || undefined}
              />
            ))}

            {week.map((day, column) => (
              <button
                key={day}
                type="button"
                className={styles.dayNumber}
                style={{ gridColumn: column + 1 }}
                data-day={day}
                data-outside={!isSameMonth(day, date) || undefined}
                data-today={day === today || undefined}
                aria-current={day === today ? 'date' : undefined}
                aria-label={strings.calendarView.dayLabel(fullDay(day), countOn(events, day))}
                tabIndex={day === date ? 0 : -1}
                onClick={() => onDayClick?.(day)}
                onKeyDown={(event) => onDayKeyDown(event, day)}
              >
                {dayNumber(day)}
              </button>
            ))}

            {lanes.bars.map((bar) => (
              <EventBar
                key={`${bar.event.id}-${week[0]}`}
                bar={bar}
                rowOffset={2}
                timeLabel={
                  bar.event.startTime && !isSpanning(bar.event)
                    ? formatTimeRange(time, bar.event.startTime)
                    : undefined
                }
                onEventClick={onEventClick}
              />
            ))}

            {lanes.hidden.map((count, column) =>
              count > 0 ? (
                <button
                  key={week[column]}
                  type="button"
                  className={styles.more}
                  style={{ gridColumn: column + 1, gridRow: maxRows + 2 }}
                  aria-label={strings.calendarView.moreLabel(count, fullDay(week[column]!))}
                  onClick={() => onMoreClick?.(week[column]!)}
                >
                  {strings.calendarView.more(count)}
                </button>
              ) : null,
            )}
          </div>
        );
      })}
    </div>
  );
}

interface EventBarProps {
  bar: LaneBar<CalendarViewEvent>;
  rowOffset: number;
  timeLabel?: string;
  onEventClick?: (event: CalendarViewEvent) => void;
}

/** Полоса события через дни: край, за которым событие продолжается, — прямой */
function EventBar({ bar, rowOffset, timeLabel, onEventClick }: EventBarProps) {
  const timed = timeLabel !== undefined;

  return (
    <button
      type="button"
      className={cx(styles.bar, timed && styles.chip)}
      style={{ gridColumn: `${bar.column + 1} / span ${bar.span}`, gridRow: bar.row + rowOffset }}
      data-tone={bar.event.tone ?? 'accent'}
      data-before={bar.continuesBefore || undefined}
      data-after={bar.continuesAfter || undefined}
      onClick={() => onEventClick?.(bar.event)}
    >
      {timed && <span className={styles.dot} aria-hidden />}

      {timed && <span className={styles.chipTime}>{timeLabel}</span>}

      <span className={styles.barTitle}>{bar.event.title}</span>
    </button>
  );
}

interface WeekViewProps extends SharedProps {
  start: IsoDate;
  date: IsoDate;
  hours: readonly [number, number];
  scrollToHour: number;
  height: number;
}

function WeekView({
  start,
  today,
  date,
  events,
  weekdays,
  fullDay,
  locale,
  hours,
  scrollToHour,
  height,
  onDayClick,
  onEventClick,
  onDayKeyDown,
}: WeekViewProps) {
  const strings = useUiStrings();
  const days = weekDays(start);
  const lanes = layoutWeekLanes(
    days,
    events.filter((event) => isSpanning(event)),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [from, to] = hours;
  const hourLabel = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const dayNumber = createDateFormatter(locale, { day: 'numeric' });
  useLayoutEffect(() => {
    // Неделя открывается на рабочих часах, а не на полуночи
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, scrollToHour - from) * HOUR_PX;
  }, [scrollToHour, from]);

  return (
    <div className={styles.weekView}>
      <div className={styles.weekHead}>
        <span className={styles.gutter} />

        {days.map((day, column) => (
          <button
            key={day}
            type="button"
            className={styles.weekDay}
            data-day={day}
            data-today={day === today || undefined}
            aria-current={day === today ? 'date' : undefined}
            aria-label={strings.calendarView.dayLabel(fullDay(day), countOn(events, day))}
            tabIndex={day === date ? 0 : -1}
            onClick={() => onDayClick?.(day)}
            onKeyDown={(event) => onDayKeyDown(event, day)}
          >
            <span className={styles.weekDayName}>{weekdays[column]!.short}</span>
            <span className={styles.weekDayNumber}>{dayNumber(day)}</span>
          </button>
        ))}
      </div>

      {lanes.bars.length > 0 && (
        <div className={styles.allDay}>
          <span className={styles.gutterLabel}>{strings.calendarView.allDay}</span>

          <div className={styles.allDayLanes} style={{ '--rows': lanes.rows } as CSSProperties}>
            {lanes.bars.map((bar) => (
              <EventBar key={bar.event.id} bar={bar} rowOffset={1} onEventClick={onEventClick} />
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className={styles.timeScroll} style={{ maxHeight: height }}>
        <div
          className={styles.timeGrid}
          style={{ '--hours': to - from, '--hour': `${HOUR_PX}px` } as CSSProperties}
        >
          <div className={styles.hours} aria-hidden>
            {Array.from({ length: to - from }, (_, index) => (
              <span key={index} className={styles.hourLabel}>
                {index === 0 ? '' : hourLabel.format(Date.UTC(1970, 0, 1, from + index))}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div key={day} className={styles.dayColumn} data-today={day === today || undefined}>
              {layoutDayColumns(timedOn(events, day)).map((box) => {
                const top = ((box.start - from * 60) / 60) * HOUR_PX;

                if (box.start + box.duration <= from * 60 || box.start >= to * 60) return null;

                return (
                  <button
                    key={box.event.id}
                    type="button"
                    className={styles.timed}
                    data-tone={box.event.tone ?? 'accent'}
                    style={
                      {
                        top,
                        height: (box.duration / 60) * HOUR_PX - 2,
                        '--column': box.column,
                        '--columns': box.columns,
                      } as CSSProperties
                    }
                    onClick={() => onEventClick?.(box.event)}
                  >
                    <span className={styles.timedTitle}>{box.event.title}</span>

                    <span className={styles.timedTime}>
                      {formatTimeRange(hourLabel, box.event.startTime, box.event.endTime)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
