import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
} from 'react';

import { cx } from '../lib/cx';

import styles from './coordinate-grid.module.css';
import { cellAt, gridLabels } from './grid-labels';

export interface CoordinateGridProps extends ComponentPropsWithRef<'div'> {
  /** Сторона ячейки, px */
  cell?: number;
  /** Каждая N-я линия — заметнее */
  major?: number;
  /** Подписи столбцов (A, B…) сверху и строк (01, 02…) слева */
  labels?: boolean;
  /** Перекрестие за курсором и подпись ячейки под ним */
  crosshair?: boolean;
}

/**
 * Сетка с координатами по краям — подложка для карты, схемы, пустого состояния. Содержимое (children)
 * лежит поверх сетки. Число подписей следует за размером поля; перекрестие пишет переменные и текст
 * прямо в DOM, без рендера на каждое движение мыши.
 */
export function CoordinateGrid({
  cell = 32,
  major = 4,
  labels = true,
  crosshair,
  className,
  style,
  children,
  ...rest
}: CoordinateGridProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const field = fieldRef.current;

    if (!field || !labels) return;

    const measure = () =>
      setSize((current) =>
        current.width === field.clientWidth && current.height === field.clientHeight
          ? current
          : { width: field.clientWidth, height: field.clientHeight },
      );
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(field);

    return () => observer.disconnect();
  }, [labels]);

  const { columns, rows } = gridLabels(size.width, size.height, cell);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const field = event.currentTarget;
    const rect = field.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    field.style.setProperty('--cross-x', `${x}px`);
    field.style.setProperty('--cross-y', `${y}px`);
    field.dataset.crosshair = '';

    if (readoutRef.current) readoutRef.current.textContent = cellAt(x, y, cell) ?? '';
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.crosshair;
  };

  return (
    <div
      className={cx(styles.grid, labels && styles.labelled, className)}
      style={{ '--cell': `${cell}px`, '--major': `${cell * major}px`, ...style } as CSSProperties}
      {...rest}
    >
      {labels && (
        <>
          <div aria-hidden className={styles.columns}>
            {columns.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div aria-hidden className={styles.rows}>
            {rows.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </>
      )}

      <div
        ref={fieldRef}
        className={styles.field}
        onPointerMove={crosshair ? onPointerMove : undefined}
        onPointerLeave={crosshair ? onPointerLeave : undefined}
      >
        {crosshair && (
          <>
            <span aria-hidden className={styles.crossX} />
            <span aria-hidden className={styles.crossY} />
            <span aria-hidden ref={readoutRef} className={styles.readout} />
          </>
        )}

        {children}
      </div>
    </div>
  );
}
