import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../lib/cx';

import styles from './scanlines.module.css';

export interface ScanlinesProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Медленная светлая полоса развёртки поверх строк; при `data-effects="off"` и reduced-motion её нет */
  sweep?: boolean;
}

/**
 * Наложение развёртки поверх любого фона: тонкие строки (статичная текстура) и редкая полоса,
 * проходящая сверху вниз. Чистый CSS, без холста: строки — повторяющийся градиент, полоса двигается
 * только transform. Заполняет ближайшего позиционированного родителя.
 */
export function Scanlines({ sweep = true, className, ...rest }: ScanlinesProps) {
  return (
    <span aria-hidden className={cx(styles.scanlines, className)} {...rest}>
      {sweep && <span className={styles.sweep} />}
    </span>
  );
}
