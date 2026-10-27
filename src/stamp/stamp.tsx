import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { cx } from '../lib/cx';

import styles from './stamp.module.css';
import { stampRotation } from './stamp-rotation';

export interface StampProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Текст штампа: «ОДОБРЕНО», «НОВОЕ» — строкой, наклон выводится из неё */
  children: string;
  /** Мелкая строка под текстом: дата, номер */
  caption?: ReactNode;
  tone?: 'danger' | 'accent' | 'success' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  /** Наклон в градусах; по умолчанию — от −12° до −3° по тексту, всегда один и тот же */
  rotate?: number;
  /** Потёртость краски — маска из шума; без неё штамп ровный */
  worn?: boolean;
}

/** Штамп: двойная рамка, капитель, наклон и потёртость — «ОДОБРЕНО», «НОВОЕ», «БЕТА» */
export function Stamp({
  children,
  caption,
  tone = 'danger',
  size = 'md',
  rotate,
  worn = true,
  className,
  style,
  ...rest
}: StampProps) {
  const angle = rotate ?? stampRotation(children);

  return (
    <span
      className={cx(styles.stamp, styles[tone], styles[size], worn && styles.worn, className)}
      style={{ '--stamp-rotate': `${angle}deg`, ...style } as CSSProperties}
      {...rest}
    >
      <span className={styles.text}>{children}</span>
      {caption && <span className={styles.caption}>{caption}</span>}
    </span>
  );
}
