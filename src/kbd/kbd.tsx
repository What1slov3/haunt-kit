import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './kbd.module.css';

export interface KbdProps extends ComponentPropsWithRef<'kbd'> {
  /** 16 / 20 px; sm — внутри меню, подсказок и строки состояния */
  size?: 'sm' | 'md';
}

/** Клавиша или сочетание: «Ctrl+K», «Esc». Моно, тонкая рамка, как подсказка в TUI */
export function Kbd({ size = 'md', className, ...rest }: KbdProps) {
  return <kbd className={cx(styles.kbd, styles[size], className)} {...rest} />;
}
