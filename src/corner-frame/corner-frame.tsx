import type { ComponentPropsWithRef, ElementType } from 'react';

import { cx } from '../lib/cx';

import styles from './corner-frame.module.css';

export interface CornerFrameProps extends ComponentPropsWithRef<'div'> {
  /** Засечки «навелись»: сошлись к углам и светятся. Без пропса — при наведении и фокусе внутри */
  active?: boolean;
  /** Реакция на наведение и фокус; `false` — засечки стоят, пока не задан `active` */
  interactive?: boolean;
  tone?: 'default' | 'accent';
  /** Строчный блок — рамка по размеру содержимого (аватар, иконка, цифра) */
  inline?: boolean;
  as?: ElementType;
}

/**
 * Рамка из одних засечек по углам — как прицел или кадрирование. Наведение — засечки сходятся к углам
 * (transform), цвет и свечение — по `--fx-glow`. Содержимое и фокус — свои: рамка ничего не перехватывает.
 */
export function CornerFrame({
  active,
  interactive = true,
  tone = 'default',
  inline,
  as: Component = 'div',
  className,
  children,
  ...rest
}: CornerFrameProps) {
  return (
    <Component
      className={cx(
        styles.frame,
        styles[tone],
        interactive && styles.interactive,
        inline && styles.inline,
        className,
      )}
      data-active={active || undefined}
      {...rest}
    >
      {children}

      <span aria-hidden className={styles.tick} data-corner="tl" />
      <span aria-hidden className={styles.tick} data-corner="tr" />
      <span aria-hidden className={styles.tick} data-corner="br" />
      <span aria-hidden className={styles.tick} data-corner="bl" />
    </Component>
  );
}
