import type { ComponentPropsWithRef, ElementType } from 'react';

import { cx } from '../lib/cx';

import styles from './registration-marks.module.css';

export interface RegistrationMarksProps extends ComponentPropsWithRef<'div'> {
  /** `crop` — метки обреза по углам, `target` — кресты совмещения по сторонам, `full` — оба и шкала цвета */
  variant?: 'crop' | 'target' | 'full';
  tone?: 'default' | 'accent';
  as?: ElementType;
}

function Target({ side }: { side: 'top' | 'bottom' }) {
  return (
    <svg viewBox="0 0 16 16" className={styles.target} data-side={side} aria-hidden>
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" />
      <path d="M8 0v16M0 8h16" stroke="currentColor" />
    </svg>
  );
}

/**
 * Типографская разметка вокруг блока: метки обреза в полях, кресты совмещения и шкала цвета — как у листа
 * перед печатью. Разметка лежит в отступе компонента и не перекрывает содержимое.
 */
export function RegistrationMarks({
  variant = 'full',
  tone = 'default',
  as: Component = 'div',
  className,
  children,
  ...rest
}: RegistrationMarksProps) {
  const crop = variant !== 'target';
  const target = variant !== 'crop';

  return (
    <Component className={cx(styles.marks, styles[tone], className)} {...rest}>
      {crop &&
        (['tl', 'tr', 'br', 'bl'] as const).map((corner) => (
          <span key={corner} aria-hidden className={styles.crop} data-corner={corner} />
        ))}

      {target && <Target side="top" />}
      {target && <Target side="bottom" />}

      {variant === 'full' && (
        <span aria-hidden className={styles.colorBar}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      )}

      {children}
    </Component>
  );
}
