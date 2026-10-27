import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { ChevronDown, Circle, type LucideIcon } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Timestamp } from '../timestamp/timestamp';

import {
  dayLabelKind,
  formatDayDate,
  groupTimeline,
  type TimelineEventBase,
} from './timeline-model';
import styles from './timeline.module.css';

export type TimelineTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface TimelineEvent extends TimelineEventBase {
  title: ReactNode;
  /** Вторая строка: текст сообщения, причина */
  description?: ReactNode;
  /** Иконка вместо иконки типа */
  icon?: LucideIcon;
  /** Цвет вместо цвета типа */
  tone?: TimelineTone;
}

export interface TimelineType {
  icon?: LucideIcon;
  tone?: TimelineTone;
}

export interface TimelineProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  events: readonly TimelineEvent[];
  /** Иконка и цвет по типу события: `{ join: { icon: UserPlus, tone: 'success' } }` */
  types?: Readonly<Record<string, TimelineType>>;
  /** Сворачивать похожие подряд («+5 похожих»); по умолчанию — да */
  groupSimilar?: boolean;
  /** Сколько похожих подряд сворачивать; по умолчанию 3 */
  minGroup?: number;
  /** Новые сверху (по умолчанию) или снизу */
  order?: 'desc' | 'asc';
  /** Подпись ленты для скринридера; по умолчанию «События» */
  label?: string;
  /** «Сейчас» для «сегодня» и «вчера» — для историй и тестов */
  now?: Date;
  /** Локаль Intl; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

/**
 * Лента событий пространства: разделители дней («Сегодня», «Вчера», дата), тип события — иконкой и
 * цветом в кружке на линии, время — `Timestamp`. Похожие подряд (три «вошёл в пространство») сворачиваются
 * в первое событие и кнопку «+2 похожих». Цвет не единственный носитель смысла: у типа есть иконка.
 */
export function Timeline({
  events,
  types,
  groupSimilar = true,
  minGroup,
  order,
  label,
  now: nowProp,
  locale: localeProp,
  className,
  ...rest
}: TimelineProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const [now] = useState(() => nowProp ?? new Date());
  const current = nowProp ?? now;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const days = groupTimeline(events, { groupSimilar, minGroup, order });

  const toggle = (id: string) =>
    setOpen((value) => {
      const next = new Set(value);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });

  const dayTitle = (date: Date) => {
    const kind = dayLabelKind(date, current);

    return kind === 'today'
      ? strings.timeline.today
      : kind === 'yesterday'
        ? strings.timeline.yesterday
        : formatDayDate(date, current, locale);
  };

  return (
    <div className={cx(styles.root, className)} {...rest}>
      <ol className={styles.days} aria-label={label ?? strings.timeline.label}>
        {days.map((day) => (
          <li key={day.key} className={styles.day}>
            <div className={styles.divider}>
              <time dateTime={day.key}>{dayTitle(day.date)}</time>
            </div>

            <ol className={styles.events}>
              {day.entries.map((entry) => {
                if (entry.kind === 'event') {
                  return (
                    <EventRow
                      key={entry.event.id}
                      event={entry.event}
                      types={types}
                      locale={locale}
                    />
                  );
                }

                const [first, ...others] = entry.events;
                const expanded = open.has(entry.id);

                return (
                  <li key={entry.id} className={styles.group}>
                    <ol className={styles.events}>
                      <EventRow event={first!} types={types} locale={locale} />

                      {expanded &&
                        others.map((event) => (
                          <EventRow key={event.id} event={event} types={types} locale={locale} />
                        ))}
                    </ol>

                    <button
                      type="button"
                      className={styles.more}
                      aria-expanded={expanded}
                      onClick={() => toggle(entry.id)}
                      data-open={expanded || undefined}
                    >
                      <Icon icon={ChevronDown} size="xs" className={styles.moreIcon} />

                      {expanded
                        ? strings.timeline.collapse
                        : strings.timeline.similar(others.length)}
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface EventRowProps {
  event: TimelineEvent;
  types: TimelineProps['types'];
  locale: string;
}

function EventRow({ event, types, locale }: EventRowProps) {
  const type = event.type ? types?.[event.type] : undefined;
  const tone = event.tone ?? type?.tone ?? 'neutral';
  const icon = event.icon ?? type?.icon ?? Circle;

  return (
    <li className={styles.event} data-tone={tone}>
      <span className={styles.marker} aria-hidden>
        <Icon icon={icon} size="xs" />
      </span>

      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.title}>{event.title}</span>

          <Timestamp date={event.date} mode="time" locale={locale} className={styles.time} />
        </div>

        {event.description && <div className={styles.description}>{event.description}</div>}
      </div>
    </li>
  );
}
