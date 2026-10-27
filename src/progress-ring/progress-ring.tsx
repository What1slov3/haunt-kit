import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../lib/cx';

import { ringGeometry } from './ring-geometry';
import styles from './progress-ring.module.css';

export type ProgressRingSize = 'sm' | 'md' | 'lg';

export interface ProgressRingProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** 0–100; без значения — неопределённое состояние (кольцо вращается) */
  value?: number | null;
  /** 20 / 40 / 64 px */
  size?: ProgressRingSize;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  /** Подпись для скринридера: «Загрузка файла» */
  label?: string;
  /** Процент в центре моно; по умолчанию — у md и lg (в 20 px не помещается) */
  showValue?: boolean;
  /** Своё содержимое центра вместо процента — иконка файла, «3/5» */
  center?: ReactNode;
}

const dimensions: Record<ProgressRingSize, { size: number; thickness: number }> = {
  sm: { size: 20, thickness: 2.5 },
  md: { size: 40, thickness: 3 },
  lg: { size: 64, thickness: 4 },
};

/** Доля дуги неопределённого состояния: четверть — заметно, что крутится, и не путается с «почти готово» */
const INDETERMINATE_ARC = 0.25;

/**
 * Круговой прогресс на SVG — загрузка файла в карточке вложения, шаг онбординга. Неопределённое
 * состояние — четверть дуги вращается; как у Spinner, вращение остаётся и при reduced-motion.
 */
export function ProgressRing({
  value,
  size = 'md',
  tone = 'accent',
  label,
  showValue,
  center,
  className,
  style,
  ...rest
}: ProgressRingProps) {
  const indeterminate = value === undefined || value === null;
  const { size: pixels, thickness } = dimensions[size];
  const ratio = indeterminate ? INDETERMINATE_ARC : value / 100;
  const { radius, circumference, offset } = ringGeometry(pixels, thickness, ratio);
  const withValue = !indeterminate && (showValue ?? size !== 'sm');
  const percent = indeterminate ? 0 : Math.round(Math.min(100, Math.max(0, value)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : percent}
      data-state={indeterminate ? 'indeterminate' : percent === 100 ? 'complete' : 'loading'}
      className={cx(styles.root, styles[size], styles[tone], className)}
      style={{ width: pixels, height: pixels, ...style }}
      {...rest}
    >
      <svg
        width={pixels}
        height={pixels}
        viewBox={`0 0 ${pixels} ${pixels}`}
        className={cx(styles.svg, indeterminate && styles.spinning)}
        // Вращение — индикатор загрузки, а не украшение: без него «грузится» не отличить от «зависло»
        data-motion-keep={indeterminate ? '' : undefined}
        aria-hidden
      >
        <circle
          cx={pixels / 2}
          cy={pixels / 2}
          r={radius}
          strokeWidth={thickness}
          className={styles.track}
        />

        <circle
          cx={pixels / 2}
          cy={pixels / 2}
          r={radius}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.indicator}
        />
      </svg>

      {(center ?? withValue) && (
        <span className={styles.center} aria-hidden>
          {center ?? (
            <>
              {percent}
              <span className={styles.unit}>%</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}
