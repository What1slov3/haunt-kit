import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../lib/cx';

import styles from './empty-state.module.css';

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Иконка в кружке сверху — `<Icon icon={Inbox} size="lg" />` */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Кнопки под текстом */
  action?: ReactNode;
  /** Компактный вариант для узких панелей (список участников пуст) */
  compact?: boolean;
}

/** Пустой список, нет результатов поиска, канал без сообщений */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={cx(styles.root, compact && styles.compact, className)} {...rest}>
      {icon && <span className={styles.icon}>{icon}</span>}

      <div className={styles.title}>{title}</div>

      {description && <div className={styles.description}>{description}</div>}

      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
