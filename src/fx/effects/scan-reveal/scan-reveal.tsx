import { useRef, type ComponentPropsWithRef, type CSSProperties } from 'react';

import { cx } from '../../../lib/cx';
import { useInView } from '../../../motion-core/use-in-view';
import { useFxEnvironment } from '../../use-fx-environment';

import styles from './scan-reveal.module.css';

export interface ScanRevealProps extends ComponentPropsWithRef<'div'> {
  /** Когда проявляться: при прокрутке в окно или сразу */
  trigger?: 'view' | 'mount';
  /** Длительность развёртки, мс */
  duration?: number;
  /** Светящаяся строка развёртки на фронте */
  line?: boolean;
}

/**
 * Появление строкой развёртки сверху вниз: элемент открывается за светящейся строкой, как кадр на ЭЛТ.
 * Ждёт появления в окне (`trigger="view"`). Содержимое доступно скринридеру всё время — скрыто только
 * изображение. `data-effects="off"` и reduced-motion — сразу на месте.
 */
export function ScanReveal({
  trigger = 'view',
  duration = 700,
  line = true,
  className,
  style,
  children,
  ...rest
}: ScanRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const inView = useInView(rootRef, { disabled: trigger !== 'view' || !motion, amount: 0.15 });
  const state = !motion ? 'static' : trigger === 'mount' || inView ? 'revealing' : 'waiting';

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-scan={state}
      style={{ '--scan-duration': `${duration}ms`, ...style } as CSSProperties}
      {...rest}
    >
      {/* Обрезается обёртка, а наблюдается корень: обрезанный clip-path элемент IntersectionObserver
          считал бы невидимым и не дождался бы появления */}
      <div className={styles.content}>{children}</div>

      {line && state === 'revealing' && (
        <span className={styles.beam} aria-hidden>
          <span className={styles.line} />
        </span>
      )}
    </div>
  );
}
