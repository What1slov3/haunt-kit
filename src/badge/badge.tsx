import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: BadgeTone;
  /** soft — полупрозрачный фон и яркий текст (статусы); solid — заливка (счётчики); outline — рамка */
  variant?: 'soft' | 'solid' | 'outline';
  size?: 'sm' | 'md';
  /** Точка слева — для статусов вроде «в сети» */
  dot?: boolean;
  /** Моно и квадратные скобки — TUI-акцент: `[beta]`; скобки гасятся data-tui='off' */
  bracket?: boolean;
}

/** Маленькая таблетка: статус, счётчик, «+33 %» */
export function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  dot,
  bracket,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[tone],
        styles[variant],
        styles[size],
        bracket && styles.bracket,
        className,
      )}
      {...rest}
    >
      {dot && <span className={styles.dot} aria-hidden />}

      {children}
    </span>
  );
}
