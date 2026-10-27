import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';

import { cx } from '../lib/cx';

import styles from './ticker.module.css';
import { tickerDuration, tickerRepeats } from './ticker-math';

export interface TickerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Пункты строки: новости пространства, статус, расписание */
  items: readonly ReactNode[];
  /** Между пунктами; по умолчанию `///` */
  separator?: ReactNode;
  /** Скорость, px/с */
  speed?: number;
  direction?: 'left' | 'right';
  /** Остановить вручную; при наведении и фокусе внутри строка стоит сама */
  paused?: boolean;
  tone?: 'default' | 'accent' | 'inverse';
  /** Подпись для чтения с экрана: «Новости пространства» */
  label?: string;
}

/**
 * Бегущая строка. Пауза при наведении и фокусе; при prefers-reduced-motion и `data-effects="off"` стоит
 * в начале — первые пункты видны, остальное за краем. Копии для бесшовной петли скрыты от чтения с экрана.
 */
export function Ticker({
  items,
  separator = '///',
  speed = 40,
  direction = 'left',
  paused,
  tone = 'default',
  label,
  className,
  style,
  ...rest
}: TickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ viewport: 0, unit: 0 });

  // Замер до отрисовки: иначе первый кадр едет с неверной длительностью и дёргается после замера
  useLayoutEffect(() => {
    const root = rootRef.current;
    const unit = unitRef.current;

    if (!root || !unit) return;

    const measure = () =>
      setSize((current) => {
        const next = { viewport: root.clientWidth, unit: unit.offsetWidth };

        return current.viewport === next.viewport && current.unit === next.unit ? current : next;
      });
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(root);
    observer.observe(unit);

    return () => observer.disconnect();
  }, []);

  const repeats = tickerRepeats(size.viewport, size.unit);
  const duration = tickerDuration(size.unit * repeats, speed);

  const unit = (key: string, hidden: boolean, ref?: Ref<HTMLSpanElement>) => (
    // Копии — inert: ссылки в пунктах не ловят Tab и не читаются дважды
    <span
      key={key}
      ref={ref}
      className={styles.unit}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
    >
      {items.map((item, index) => (
        <Fragment key={index}>
          <span className={styles.item}>{item}</span>

          <span aria-hidden className={styles.separator}>
            {separator}
          </span>
        </Fragment>
      ))}
    </span>
  );

  // Первый набор первой группы — единственный, который читается и меряется; остальное — копии
  const group = (copy: number) =>
    Array.from({ length: repeats }, (_, index) => {
      const first = copy === 0 && index === 0;

      return unit(`${copy}-${index}`, !first, first ? unitRef : undefined);
    });

  return (
    <div
      ref={rootRef}
      role="marquee"
      aria-label={label}
      className={cx(styles.ticker, styles[tone], className)}
      data-direction={direction}
      data-paused={paused || undefined}
      data-running={duration > 0 || undefined}
      style={{ '--ticker-duration': `${duration}s`, ...style } as CSSProperties}
      {...rest}
    >
      <div className={styles.track}>
        <span className={styles.group}>{group(0)}</span>

        <span className={styles.group} aria-hidden inert>
          {group(1)}
        </span>
      </div>
    </div>
  );
}
