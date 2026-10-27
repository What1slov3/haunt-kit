import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { cx } from '../lib/cx';
import { Progress } from '../progress/progress';

import { emptyCells, formatPercent, progressCells, type TuiProgressVariant } from './tui-bar';
import styles from './tui-progress.module.css';

export interface TuiProgressProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** 0–100; без значения — неопределённое состояние, по дорожке бежит блок */
  value?: number | null;
  /** Ширина полосы в символах */
  width?: number;
  /** blocks — █▊ на ровной дорожке, ascii — [####----] */
  variant?: TuiProgressVariant;
  /** Процент справа */
  showValue?: boolean;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  /** Подпись для скринридера: «Загрузка файла» */
  label?: string;
}

/** Длина бегущего блока неопределённого состояния, в клетках */
const RUNNER = 3;

/** Сколько длится шаг бегущего блока на одну клетку: вся дорожка в 20 клеток — около секунды */
const RUNNER_STEP_MS = 55;

/**
 * Полоса прогресса символами: `█▓▒░` или `[####----]` заданной ширины, процент справа моно. Как и
 * `TuiSpinner`, бегущий блок неопределённого состояния не гаснет при reduced-motion (это индикатор, и
 * идёт шагами по клеткам, а не плавно). Без TUI (`data-tui="off"`) — обычный `Progress`.
 */
export function TuiProgress({
  value,
  width = 20,
  variant = 'blocks',
  showValue = true,
  tone = 'accent',
  label,
  className,
  style,
  ...rest
}: TuiProgressProps) {
  const indeterminate = value === undefined || value === null;
  const ratio = indeterminate ? 0 : value / 100;
  const cells = Math.max(1, Math.floor(width));
  const percent = indeterminate ? undefined : Math.round(Math.min(100, Math.max(0, value)));
  const line = indeterminate ? emptyCells(cells, variant) : progressCells(ratio, cells, variant);
  // Хвост из пустых клеток — отдельно: он тише заполненной части
  const [, filled = '', empty = ''] = /^(.*?)([░-]*)$/u.exec(line) ?? [];
  /*
   * У blocks пустые клетки — пробелы на ровной дорожке (фон .track), а не ░: точечная штриховка при 1x
   * читалась сыпью с цветной каймой сглаживания. Так переходная клетка ▏…▉ ложится на дорожку без зазора,
   * как у полос rich и btop. Строку `progressCells` с ░ отдаёт как есть — для логов и копирования в чат
   */
  const tail = variant === 'blocks' ? ' '.repeat([...empty].length) : empty;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-state={indeterminate ? 'indeterminate' : 'loading'}
      className={cx(styles.root, styles[tone], styles[variant], className)}
      style={
        {
          ...style,
          '--cells': cells,
          '--runner': RUNNER,
          '--runner-steps': cells + RUNNER,
          '--runner-duration': `${(cells + RUNNER) * RUNNER_STEP_MS}ms`,
        } as CSSProperties
      }
      {...rest}
    >
      <span className={styles.bar} aria-hidden>
        <span className={styles.frame}>
          <span className={styles.track}>
            {filled}

            <span className={styles.empty}>{tail}</span>

            {indeterminate && (
              <span className={styles.runner} data-motion-keep="">
                {(variant === 'ascii' ? '#' : '█').repeat(RUNNER)}
              </span>
            )}
          </span>
        </span>

        {showValue && !indeterminate && (
          <span className={styles.value}>{formatPercent(ratio)}</span>
        )}
      </span>

      <Progress value={percent} tone={tone} className={styles.fallback} aria-hidden />
    </div>
  );
}
