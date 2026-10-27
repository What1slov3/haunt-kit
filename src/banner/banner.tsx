import type { ComponentPropsWithRef, ReactNode } from 'react';

import { X } from 'lucide-react';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './banner.module.css';

export type BannerVariant = 'neutral' | 'accent' | 'rainbow';

export interface BannerProps extends ComponentPropsWithRef<'div'> {
  /** neutral — тихая полоса, accent — тон пространства, rainbow — переливающийся градиент акцента */
  variant?: BannerVariant;
  icon?: ReactNode;
  /** Ссылка или кнопка после текста */
  action?: ReactNode;
  /** Показать крестик; закрытие хранит вызывающий — баннер сам не исчезает */
  onDismiss?: () => void;
}

/**
 * Полоса объявления над экраном, как Banner у Fumadocs: «вышла новая версия», «идёт эфир»,
 * «сервер на обслуживании». Высота 32 — плотность приложения. Для состояния соединения — Callout banner.
 */
export function Banner({
  variant = 'neutral',
  icon,
  action,
  onDismiss,
  className,
  children,
  ...rest
}: BannerProps) {
  const strings = useUiStrings();

  return (
    <div role="status" className={cx(styles.banner, styles[variant], className)} {...rest}>
      {variant === 'rainbow' && <span className={styles.glow} aria-hidden />}

      <div className={styles.content}>
        {icon && <span className={styles.icon}>{icon}</span>}

        <span className={styles.text}>{children}</span>

        {action && <span className={styles.action}>{action}</span>}
      </div>

      {onDismiss && (
        <IconButton
          label={strings.banner.dismiss}
          size="xs"
          className={styles.close}
          onClick={onDismiss}
        >
          <Icon icon={X} size="xs" />
        </IconButton>
      )}
    </div>
  );
}
