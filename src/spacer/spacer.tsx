import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './spacer.module.css';

export type SpacerProps = Omit<ComponentPropsWithRef<'span'>, 'children'>;

/** Распорка во флекс-ряду: забирает свободное место и разводит соседей по краям (действия — вправо) */
export function Spacer({ className, ...rest }: SpacerProps) {
  return <span className={cx(styles.spacer, className)} aria-hidden {...rest} />;
}
