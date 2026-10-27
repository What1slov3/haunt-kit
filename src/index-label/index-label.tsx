import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../lib/cx';

import { formatIndex } from './format-index';
import styles from './index-label.module.css';

export interface IndexLabelProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Номер (`4` → `04`) или готовый индекс строкой (`B2`) */
  index: number | string;
  /** Всего: `01 / 07` */
  total?: number;
  /** Серия: `SEC-04` */
  prefix?: string;
  /** Цифр в номере */
  pad?: number;
  /** Подпись раздела — моно-капителью после линии */
  label?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'accent' | 'muted';
  /** Тонкая линия между номером и подписью, тянется на всю ширину */
  rule?: boolean;
}

/** Номер раздела дисплейным шрифтом с тонкой линией и подписью: `01 / 07 ——— ПРАВИЛА` */
export function IndexLabel({
  index,
  total,
  prefix,
  pad,
  label,
  size = 'md',
  tone = 'default',
  rule = true,
  className,
  ...rest
}: IndexLabelProps) {
  return (
    <div className={cx(styles.root, styles[size], styles[tone], className)} {...rest}>
      <span className={styles.index}>{formatIndex(index, { total, prefix, pad })}</span>
      {rule && <span aria-hidden className={styles.rule} />}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
