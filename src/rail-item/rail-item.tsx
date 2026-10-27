import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import styles from './rail-item.module.css';

export interface RailItemProps extends ComponentPropsWithRef<'button'> {
  /** Название пространства — подсказка справа и aria-label */
  label: string;
  /** Аватар сообщества или иконка */
  children: ReactNode;
  /** Открытое пространство: аура акцента вокруг плитки и aria-pressed */
  active?: boolean;
  /** Есть непрочитанное: точка в углу плитки; со счётчиком — бейдж на её месте */
  unread?: boolean | number;
  /**
   * tile — плитка с рамкой (сообщество), ghost — действие («создать»), accent — главная (личные),
   * plain — аватар человека как есть, без плитки и обрезки (профиль: точка статуса не срезается)
   */
  variant?: 'tile' | 'ghost' | 'accent' | 'plain';
}

/**
 * Пункт рейла пространств: плитка 40×40. Открытое пространство — аура акцента вокруг плитки, непрочитанное —
 * точка в её углу (со счётчиком — бейдж). `--rail-gap-color` — цвет под рейлом, им вырезаны отступ ауры и
 * ободки; по умолчанию — фон Surface вокруг (`--avatar-ring`), без неё — фон страницы
 */
export function RailItem({
  label,
  active,
  unread,
  variant = 'tile',
  className,
  children,
  ...rest
}: RailItemProps) {
  const strings = useUiStrings();
  const count = typeof unread === 'number' ? (unread > 99 ? '99+' : unread) : undefined;
  const hasUnread = unread === true || (typeof unread === 'number' && unread > 0);

  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-active={active || undefined}
        data-unread={hasUnread || undefined}
        className={cx(styles.item, styles[variant], className)}
        {...rest}
      >
        <span className={styles.indicator} aria-hidden />

        <span className={styles.plate}>{children}</span>

        {count !== undefined && count !== 0 && (
          <span
            className={styles.count}
            aria-label={typeof unread === 'number' ? strings.railItem.unread(unread) : undefined}
          >
            {count}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
