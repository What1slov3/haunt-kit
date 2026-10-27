import { useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { AtSign, BellOff, CheckCheck, type LucideIcon } from 'lucide-react';

import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { EmptyState } from '../empty-state/empty-state';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { NotificationItem } from '../notification-item/notification-item';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Tabs } from '../tabs/tabs';
import { toDate, type TimestampInput } from '../timestamp/timestamp-format';
import { VirtualList } from '../virtual-list/virtual-list';

import {
  countUnread,
  filterNotifications,
  groupByDay,
  type InboxFilter,
  type InboxRow,
} from './inbox-groups';
import styles from './inbox.module.css';

export interface InboxNotification {
  id: string;
  title: ReactNode;
  text?: ReactNode;
  time: TimestampInput;
  unread?: boolean;
  /** Упоминание: попадает во вкладку «Упоминания» */
  mention?: boolean;
  /** Аватар или иконка источника */
  icon?: ReactNode;
  /** Кнопки уведомления: «Принять», «Ответить» */
  actions?: ReactNode;
}

export interface InboxProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  notifications: readonly InboxNotification[];
  /** Заголовок ленты; по умолчанию «Уведомления» */
  title?: ReactNode;
  /** Управляемая вкладка */
  filter?: InboxFilter;
  defaultFilter?: InboxFilter;
  onFilterChange?: (filter: InboxFilter) => void;
  /** Открыть уведомление (клик по строке) */
  onOpen?: (notification: InboxNotification) => void;
  onMarkRead?: (id: string) => void;
  /** «Отметить все прочитанными»; без него кнопки нет */
  onMarkAllRead?: () => void;
  /** Лента дошла до конца — подгрузить старые */
  onReachEnd?: () => void;
  /** Высота ленты под вкладками; по умолчанию 420 px */
  height?: number | string;
  /** «Сейчас» для заголовков дней; по умолчанию — момент рендера */
  now?: TimestampInput;
  /** Локаль дат; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

const filterIds: readonly InboxFilter[] = ['all', 'mentions', 'unread'];

const emptyIcon: Record<InboxFilter, LucideIcon> = {
  all: BellOff,
  mentions: AtSign,
  unread: CheckCheck,
};

/** Заголовок дня и уведомление — разной высоты: оценка до измерения */
const rowEstimate = (row: InboxRow<InboxNotification>) => (row.type === 'day' ? 28 : 64);

/**
 * Лента уведомлений: вкладки «Все / Упоминания / Непрочитанные», группы по дням («Сегодня», «Вчера»,
 * дата), «отметить все прочитанными», пустое состояние на каждую вкладку. Лента виртуализирована —
 * тысяча уведомлений не держит тысячу строк в DOM. Размер под поповер из рейла.
 */
export function Inbox({
  notifications,
  title: titleProp,
  filter,
  defaultFilter = 'all',
  onFilterChange,
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onReachEnd,
  height = 420,
  now,
  locale: localeProp,
  className,
  ...rest
}: InboxProps) {
  const text = useUiStrings().inbox;
  const locale = useUiLocale(localeProp);
  const title = titleProp ?? text.title;
  const filters = filterIds.map((value) => ({ value, label: text.filters[value] }));
  const titleId = useId();
  const [innerFilter, setInnerFilter] = useState<InboxFilter>(defaultFilter);
  const current = filter ?? innerFilter;
  const unread = countUnread(notifications);
  const nowDate = now === undefined ? new Date() : toDate(now);
  const rows = groupByDay(filterNotifications(notifications, current), nowDate, locale);

  const changeFilter = (next: string) => {
    const value = next as InboxFilter;

    if (filter === undefined) setInnerFilter(value);

    onFilterChange?.(value);
  };

  const renderRow = (row: InboxRow<InboxNotification>) => {
    if (row.type === 'day') {
      return <h3 className={styles.day}>{row.label}</h3>;
    }

    const notification = row.item;

    return (
      <div className={styles.row}>
        <NotificationItem
          icon={notification.icon}
          title={notification.title}
          time={notification.time}
          unread={notification.unread}
          actions={notification.actions}
          locale={locale}
          onClick={onOpen ? () => onOpen(notification) : undefined}
          onMarkRead={onMarkRead ? () => onMarkRead(notification.id) : undefined}
        >
          {notification.text}
        </NotificationItem>
      </div>
    );
  };

  const empty = { icon: emptyIcon[current], ...text.empty[current] };

  return (
    <section aria-labelledby={titleId} className={cx(styles.root, className)} {...rest}>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>

        {unread > 0 && (
          <Badge size="sm" tone="accent" aria-label={text.unread(unread)}>
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}

        {onMarkAllRead && (
          <Button
            size="sm"
            variant="ghost"
            className={styles.markAll}
            iconStart={<Icon icon={CheckCheck} size="sm" />}
            disabled={unread === 0}
            onClick={onMarkAllRead}
          >
            {text.markAllRead}
          </Button>
        )}
      </header>

      <Tabs.Root variant="segment" value={current} onValueChange={changeFilter}>
        <div className={styles.tabs}>
          <Tabs.List aria-label={text.filterLabel} fullWidth>
            {filters.map((item) => (
              <Tabs.Trigger key={item.value} value={item.value}>
                {item.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>

        {filters.map((item) => (
          <Tabs.Content key={item.value} value={item.value} className={styles.content}>
            <VirtualList
              items={rows}
              getKey={(row) => row.key}
              estimateSize={rowEstimate}
              renderItem={renderRow}
              onReachEnd={onReachEnd}
              height={height}
              label={text.listLabel(typeof title === 'string' ? title : text.title, item.label)}
              className={styles.list}
              empty={
                <EmptyState
                  compact
                  role="status"
                  className={styles.empty}
                  icon={<Icon icon={empty.icon} />}
                  title={empty.title}
                  description={empty.text}
                />
              }
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  );
}

export type { InboxFilter } from './inbox-groups';
