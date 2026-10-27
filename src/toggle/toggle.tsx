import type { ComponentPropsWithRef } from 'react';

import { Toggle as RadixToggle } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './toggle.module.css';

export interface ToggleProps extends ComponentPropsWithRef<typeof RadixToggle.Root> {
  /** 24 / 28 px — шкала контролов */
  size?: 'sm' | 'md';
  /** Только иконка: квадратная кнопка; подпись обязательна для скринридера */
  label?: string;
}

/** Кнопка-переключатель состояния: «жирный», «микрофон выключен», «закрепить панель» */
export function Toggle({ size = 'md', label, className, ...rest }: ToggleProps) {
  return (
    <RadixToggle.Root
      aria-label={label}
      className={cx(styles.toggle, styles[size], label && styles.iconOnly, className)}
      {...rest}
    />
  );
}
