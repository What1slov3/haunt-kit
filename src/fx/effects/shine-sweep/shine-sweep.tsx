import { useEffect, useRef, useState, type ComponentPropsWithRef, type CSSProperties } from 'react';

import { cx } from '../../../lib/cx';
import { radiusVar, type Radius } from '../../../lib/space';
import { useFxEnvironment } from '../../use-fx-environment';

import styles from './shine-sweep.module.css';

export interface ShineSweepProps extends ComponentPropsWithRef<'div'> {
  /** Когда пробегает блик: на наведении, раз в `every` мс или один раз при появлении */
  trigger?: 'hover' | 'interval' | 'mount';
  /** Пробег блика, мс */
  duration?: number;
  /** Период для `interval`, мс */
  every?: number;
  /** Скругление поверхности: блик обрезается по нему */
  radius?: Radius;
}

/**
 * Блик, пробегающий по поверхности — редкие награды, «магазин». Наклонная полоса света едет через
 * карточку (только transform), обрезана её скруглением. Цвет — свет прожектора темы: в тёмной белый, в
 * светлой — тон акцента. Яркость — `--fx-shimmer`. `data-effects="off"` и reduced-motion — без блика.
 */
export function ShineSweep({
  trigger = 'hover',
  duration = 900,
  every = 4000,
  radius = '2xl',
  className,
  style,
  children,
  onPointerEnter,
  ...rest
}: ShineSweepProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  // Номер пробега: ключ полосы, новая полоса — новая анимация с начала, даже если прошлая не доехала
  const [run, setRun] = useState(trigger === 'hover' ? 0 : 1);
  const sweeping = motion && run > 0;

  // Повтор — таймером, а не бесконечной анимацией: пауза между пробегами задаётся в мс, а не долей keyframes
  useEffect(() => {
    if (trigger !== 'interval' || !motion) return;

    const timer = window.setInterval(() => setRun((count) => count + 1), Math.max(every, duration));

    return () => window.clearInterval(timer);
  }, [trigger, motion, every, duration]);

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-trigger={trigger}
      style={
        {
          '--shine-duration': `${duration}ms`,
          borderRadius: radiusVar(radius),
          ...style,
        } as CSSProperties
      }
      onPointerEnter={(event) => {
        if (trigger === 'hover' && motion) setRun((count) => count + 1);

        onPointerEnter?.(event);
      }}
      {...rest}
    >
      {children}

      {sweeping && (
        <span key={run} className={styles.sheen} aria-hidden data-sweeping="">
          <span className={styles.band} />
        </span>
      )}
    </div>
  );
}
