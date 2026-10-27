import type { ComponentPropsWithRef } from 'react';

import { Progress as RadixProgress } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './progress.module.css';

export interface ProgressProps extends ComponentPropsWithRef<typeof RadixProgress.Root> {
  /** 0–100; без значения — бесконечная полоса (загрузка неизвестной длины) */
  value?: number | null;
  size?: 'sm' | 'md';
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  /** Подпись для скринридера: «Загрузка файла» */
  label?: string;
}

export function Progress({
  value,
  size = 'md',
  tone = 'accent',
  label,
  className,
  ...rest
}: ProgressProps) {
  const indeterminate = value === undefined || value === null;

  return (
    <RadixProgress.Root
      value={indeterminate ? null : value}
      aria-label={label}
      className={cx(styles.root, styles[size], styles[tone], className)}
      {...rest}
    >
      <RadixProgress.Indicator
        className={cx(styles.indicator, indeterminate && styles.indeterminate)}
        style={indeterminate ? undefined : { transform: `translateX(-${100 - value}%)` }}
      />
    </RadixProgress.Root>
  );
}
