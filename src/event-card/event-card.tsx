import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { CalendarClock, Check, CircleHelp, MapPin, Mic, Presentation, Link2 } from 'lucide-react';

import { AvatarGroup, type AvatarGroupItem } from '../avatar-group/avatar-group';
import { Badge } from '../badge/badge';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { toDate, type TimestampInput } from '../timestamp/timestamp-format';
import { ToggleGroup } from '../toggle-group/toggle-group';

import { dateTileParts, durationParts, eventPhase, timeRange } from './event-time';
import styles from './event-card.module.css';

export type EventRsvp = 'going' | 'maybe' | null;
export type EventLocationKind = 'voice' | 'stage' | 'place' | 'link';

export interface EventCardProps extends Omit<ComponentPropsWithRef<'article'>, 'title'> {
  title: ReactNode;
  start: TimestampInput;
  end?: TimestampInput;
  /** Где: голосовой канал, сцена, адрес, ссылка */
  location?: ReactNode;
  /** Иконка места */
  locationKind?: EventLocationKind;
  description?: ReactNode;
  /** Кто идёт — аватары; остальные — «+N» */
  attendees?: readonly AvatarGroupItem[];
  /** Сколько всего идёт, если аватаров передано меньше */
  attendeeCount?: number;
  /** Мой ответ */
  rsvp?: EventRsvp;
  /** Ответ сменился; без обработчика переключателя нет */
  onRsvpChange?: (rsvp: EventRsvp) => void;
  /** Обложка сверху */
  cover?: string;
  /** Показывать ли обложку — флаг настройки события; по умолчанию да, если она есть */
  showCover?: boolean;
  /** Пояс события; по умолчанию — пояс смотрящего */
  timeZone?: string;
  /** «Сейчас» для фазы (идёт, завершено) — историям и тестам; без него — часы, раз в 30 с */
  now?: Date;
  /** Локаль дат; по умолчанию — из UiStringsProvider */
  locale?: string;
  /** Кнопки справа внизу: «Подробнее», меню */
  actions?: ReactNode;
}

const locationIcon = { voice: Mic, stage: Presentation, place: MapPin, link: Link2 } as const;

const PHASE_REFRESH = 30_000;

/** Часы для фазы события: тикают, пока событие не закончилось — дальше фаза уже не сменится */
function useEventNow(fixed: Date | undefined, endsAt: number | undefined): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (fixed) return;

    const timer = setInterval(() => {
      const next = new Date();

      setNow(next);

      if (endsAt !== undefined && next.getTime() >= endsAt) clearInterval(timer);
    }, PHASE_REFRESH);

    return () => clearInterval(timer);
  }, [fixed, endsAt]);

  return fixed ?? now;
}

/**
 * Карточка события: плитка даты (день крупно, месяц и день недели мелко), время и длительность, место с
 * иконкой вида (голосовой канал, сцена), участники `AvatarGroup`, «Пойду / Может быть» — `ToggleGroup`
 * (повторное нажатие снимает ответ), обложка по флагу. Идущее событие помечено, у завершённого ответа нет.
 */
export function EventCard({
  title,
  start,
  end,
  location,
  locationKind = 'voice',
  description,
  attendees,
  attendeeCount,
  rsvp = null,
  onRsvpChange,
  cover,
  showCover = true,
  timeZone,
  now: nowProp,
  locale: localeProp,
  actions,
  className,
  ...rest
}: EventCardProps) {
  const text = useUiStrings().eventCard;
  const locale = useUiLocale(localeProp);
  const startDate = toDate(start);
  const tile = dateTileParts(startDate, locale, timeZone);
  const now = useEventNow(nowProp, end === undefined ? undefined : toDate(end).getTime());
  const phase = eventPhase(start, end, now);
  const duration = end === undefined ? null : durationParts(start, end);
  const durationText = duration && text.duration(duration.hours, duration.minutes);
  const going = attendeeCount ?? attendees?.length ?? 0;
  const dateTime = startDate.toISOString();

  return (
    <article className={cx(styles.card, className)} data-phase={phase} {...rest}>
      {cover && showCover && (
        <div className={styles.cover}>
          <img src={cover} alt="" className={styles.coverImage} />
        </div>
      )}

      <div className={styles.main}>
        <time dateTime={dateTime} className={styles.tile}>
          <span className={styles.month}>{tile.month}</span>
          <span className={styles.day}>{tile.day}</span>
          <span className={styles.weekday}>{tile.weekday}</span>
        </time>

        <div className={styles.body}>
          {phase !== 'upcoming' && (
            <span className={styles.phase}>
              <Badge
                tone={phase === 'live' ? 'danger' : 'neutral'}
                size="sm"
                dot={phase === 'live'}
              >
                {phase === 'live' ? text.live : text.ended}
              </Badge>
            </span>
          )}

          <h3 className={styles.title}>{title}</h3>

          <span className={styles.meta}>
            <Icon icon={CalendarClock} size="xs" />
            <span className={styles.time}>{timeRange(start, end, locale, timeZone)}</span>
            {durationText && <span className={styles.duration}>{durationText}</span>}
          </span>

          {location && (
            <span className={styles.meta}>
              <Icon icon={locationIcon[locationKind]} size="xs" />
              <span className={styles.location}>{location}</span>
            </span>
          )}

          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {(Boolean(attendees?.length) || onRsvpChange || actions) && (
        <div className={styles.footer}>
          <span className={styles.people}>
            {attendees && attendees.length > 0 && (
              <AvatarGroup items={[...attendees]} max={4} size="sm" label={text.attendees(going)} />
            )}

            {going > 0 && <span className={styles.count}>{text.attendees(going)}</span>}
          </span>

          <span className={styles.actions}>
            {onRsvpChange && phase !== 'ended' && (
              <ToggleGroup.Root
                type="single"
                size="sm"
                aria-label={text.rsvp}
                value={rsvp ?? ''}
                onValueChange={(value) => onRsvpChange(value === '' ? null : (value as EventRsvp))}
              >
                <ToggleGroup.Item value="going">
                  <Icon icon={Check} size="xs" />
                  {text.going}
                </ToggleGroup.Item>

                <ToggleGroup.Item value="maybe">
                  <Icon icon={CircleHelp} size="xs" />
                  {text.maybe}
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            )}

            {actions}
          </span>
        </div>
      )}
    </article>
  );
}
