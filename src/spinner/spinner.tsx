import type { ComponentProps } from 'react';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './spinner.module.css';

export interface SpinnerProps extends ComponentProps<'span'> {
  /** 12 / 16 / 20 px */
  size?: 'sm' | 'md' | 'lg';
  /** Подпись для скринридера (role="status"); по умолчанию «Загрузка» */
  label?: string;
}

export function Spinner({ size = 'md', label, className, ...rest }: SpinnerProps) {
  const strings = useUiStrings();

  return (
    <span
      role="status"
      aria-label={label ?? strings.spinner.label}
      // Крутится и при prefers-reduced-motion: иначе «грузится» неотличимо от «зависло»
      data-motion-keep=""
      className={cx(styles.spinner, styles[size], className)}
      {...rest}
    />
  );
}
