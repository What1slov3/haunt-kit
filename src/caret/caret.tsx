import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './caret.module.css';

export interface CaretProps extends ComponentPropsWithRef<'span'> {
  /** block — прямоугольник как в терминале; bar — тонкая вертикальная черта */
  shape?: 'block' | 'bar';
}

/**
 * Мигающая каретка (TUI-акцент): пустое поле ввода, индикатор «печатает…», конец строки состояния.
 * Декоративная, скрыта от скринридера. Мигает и при prefers-reduced-motion: это маркер места, а не эффект.
 */
export function Caret({ shape = 'block', className, ...rest }: CaretProps) {
  return (
    <span
      aria-hidden
      data-motion-keep=""
      className={cx(styles.caret, styles[shape], className)}
      {...rest}
    />
  );
}
