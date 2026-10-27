import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Check } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Timestamp } from '../timestamp/timestamp';
import type { TimestampInput } from '../timestamp/timestamp-format';

import styles from './notification-item.module.css';

export interface NotificationItemProps extends Omit<
  ComponentPropsWithRef<'article'>,
  'title' | 'onClick'
> {
  /** Аватар или иконка источника: участник, бот, пространство */
  icon?: ReactNode;
  title: ReactNode;
  /** Текст уведомления — до двух строк, дальше многоточие */
  children?: ReactNode;
  time?: TimestampInput;
  /** Не прочитано: точка цвета акцента слева, заголовок жирнее */
  unread?: boolean;
  /** Кнопки под текстом: «Принять», «Ответить». Они над кликом строки и его не вызывают */
  actions?: ReactNode;
  /** Открыть уведомление: вся строка кликабельна, в фокус встаёт заголовок */
  onClick?: () => void;
  /** Кнопка «отметить прочитанным» справа — видна у непрочитанного при наведении и фокусе */
  onMarkRead?: () => void;
  /** Локаль времени; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

/**
 * Уведомление: источник, заголовок, текст, время, действия. Кликабельна вся строка, но кнопкой служит
 * заголовок (его `::after` растянут на строку): вложенные `<button>` запрещены, а действиям нужны свои.
 */
export function NotificationItem({
  icon,
  title,
  children,
  time,
  unread = false,
  actions,
  onClick,
  onMarkRead,
  locale,
  className,
  ...rest
}: NotificationItemProps) {
  const strings = useUiStrings();
  const titleId = useId();
  const titleContent = (
    <>
      {unread && <VisuallyHidden.Root>{strings.notificationItem.unread}</VisuallyHidden.Root>}

      {title}
    </>
  );

  return (
    <article
      aria-labelledby={titleId}
      className={cx(styles.root, className)}
      data-unread={unread || undefined}
      data-clickable={onClick ? '' : undefined}
      {...rest}
    >
      {unread && <span className={styles.dot} aria-hidden />}

      {icon && <span className={styles.icon}>{icon}</span>}

      <div className={styles.body}>
        <div className={styles.head}>
          {onClick ? (
            <button type="button" id={titleId} className={styles.title} onClick={onClick}>
              {titleContent}
            </button>
          ) : (
            <span id={titleId} className={styles.title}>
              {titleContent}
            </span>
          )}

          {time !== undefined && <Timestamp date={time} locale={locale} className={styles.time} />}
        </div>

        {children && <div className={styles.text}>{children}</div>}

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      {unread && onMarkRead && (
        <IconButton
          label={strings.notificationItem.markRead}
          size="xs"
          className={styles.markRead}
          onClick={onMarkRead}
        >
          <Icon icon={Check} size="xs" />
        </IconButton>
      )}
    </article>
  );
}
