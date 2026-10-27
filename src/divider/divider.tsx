import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Separator } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './divider.module.css';

export interface DividerProps extends ComponentPropsWithRef<'div'> {
  orientation?: 'horizontal' | 'vertical';
  /** Подпись посередине — только у горизонтального («сегодня», «новые сообщения») */
  label?: ReactNode;
  tone?: 'default' | 'accent';
  /** Подпись слева, а не по центру; линия справа */
  align?: 'center' | 'start';
}

export function Divider({
  orientation = 'horizontal',
  label,
  tone = 'default',
  align = 'center',
  className,
  ...rest
}: DividerProps) {
  if (label && orientation === 'horizontal') {
    return (
      <div
        role="separator"
        className={cx(styles.labeled, styles[tone], align === 'start' && styles.start, className)}
        {...rest}
      >
        <span className={styles.label}>{label}</span>
      </div>
    );
  }

  return (
    <Separator.Root
      orientation={orientation}
      className={cx(styles.divider, styles[orientation], styles[tone], className)}
      {...rest}
    />
  );
}
