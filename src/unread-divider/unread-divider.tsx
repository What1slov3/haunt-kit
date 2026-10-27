import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './unread-divider.module.css';

export interface UnreadDividerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Сколько новых ниже; без него — просто «Новые» */
  count?: number;
  /** Подпись метки поверх словаря */
  label?: string;
}

/**
 * Граница непрочитанного в ленте: метка `[ 5 новых ]` цветом акцента у левого края, по колонке текста, и
 * линия, гаснущая к правому краю: граница — у начала нового, а не поперёк ленты. Скобки — словарь TUI
 * (метка), без TUI гаснут. Скринридер слышит полную подпись: «5 новых сообщений».
 */
export function UnreadDivider({ count, label, className, ...rest }: UnreadDividerProps) {
  const strings = useUiStrings().unreadDivider;
  const counted = count !== undefined && count > 0;

  return (
    <div
      role="separator"
      aria-label={counted ? strings.labelCount(count) : strings.label}
      className={cx(styles.root, className)}
      {...rest}
    >
      <span className={styles.label} aria-hidden>
        {label ?? (counted ? strings.shortCount(count) : strings.short)}
      </span>

      <span className={styles.line} aria-hidden />
    </div>
  );
}
