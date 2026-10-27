import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './typing-dots.module.css';

export interface TypingDotsProps extends ComponentPropsWithRef<'span'> {
  /** sm — в мелком тексте строки «печатает», md — отдельно */
  size?: 'sm' | 'md';
}

/**
 * Три точки волной — индикатор «печатает…». Декоративный: смысл несёт текст рядом («Мария печатает»),
 * поэтому скрыт от скринридера. Волна гаснет при data-effects="off" и prefers-reduced-motion.
 */
export function TypingDots({ size = 'md', className, ...rest }: TypingDotsProps) {
  return (
    <span aria-hidden className={cx(styles.root, styles[size], className)} {...rest}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  );
}
