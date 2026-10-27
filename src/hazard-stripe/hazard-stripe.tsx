import type { ComponentPropsWithRef, ElementType } from 'react';

import { cx } from '../lib/cx';

import styles from './hazard-stripe.module.css';

export interface HazardStripeProps extends ComponentPropsWithRef<'div'> {
  /** Цвет полос: сигнальный, опасность, акцент, нейтральный (линии темы) */
  tone?: 'warning' | 'danger' | 'accent' | 'neutral';
  /** Высота ленты: 6 / 12 / 20 px; с подписью — по высоте подписи */
  size?: 'sm' | 'md' | 'lg';
  /** Наклон полос */
  direction?: 'left' | 'right';
  /** Полосы ползут — для «идёт работа»; стоят при `data-effects="off"` и reduced-motion */
  animated?: boolean;
  as?: ElementType;
}

/**
 * Сигнальная лента — диагональные полосы: плашка «бета», граница опасной зоны настроек, «идёт загрузка».
 * Подпись (children) — на плашке посередине; без неё лента декоративная и скрыта от чтения с экрана.
 */
export function HazardStripe({
  tone = 'warning',
  size = 'md',
  direction = 'right',
  animated,
  as: Component = 'div',
  className,
  children,
  ...rest
}: HazardStripeProps) {
  const labelled = children !== undefined && children !== null && children !== false;

  return (
    <Component
      className={cx(
        styles.stripe,
        styles[tone],
        styles[size],
        labelled && styles.labelled,
        className,
      )}
      data-direction={direction}
      data-animated={animated || undefined}
      aria-hidden={labelled ? undefined : true}
      {...rest}
    >
      <span aria-hidden className={styles.bands} />
      {labelled && <span className={styles.label}>{children}</span>}
    </Component>
  );
}
