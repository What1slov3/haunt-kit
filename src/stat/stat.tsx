import type { ComponentPropsWithRef, ReactNode } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import { changeTone, formatChange, type StatChangeFormat } from './stat-change';
import styles from './stat.module.css';

export interface StatProps extends ComponentPropsWithRef<'div'> {
  /** Подпись над числом: моно-капитель (гротеск при data-tui="off") */
  label: ReactNode;
  /** Значение: число строкой, `NumberTicker`, «1,2 тыс.» */
  value: ReactNode;
  /** Изменение со знаком: в процентах (12.5) или в единицах — см. `changeFormat` */
  change?: number;
  changeFormat?: StatChangeFormat;
  /** Какое направление — хорошо: up (участники) или down (жалобы, время ответа) */
  goodDirection?: 'up' | 'down';
  /** Пояснение к изменению: «за 7 дней» */
  hint?: ReactNode;
  /** Линия тренда или другой график справа от числа — обычно `Sparkline` */
  chart?: ReactNode;
  /** md — плитка в сетке, lg — главная цифра экрана */
  size?: 'md' | 'lg';
  /** Локаль форматирования изменения; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

/** Показатель статистики сообщества: подпись, крупное число табличными цифрами, изменение ▲/▼ с тоном */
export function Stat({
  label,
  value,
  change,
  changeFormat = 'percent',
  goodDirection = 'up',
  hint,
  chart,
  size = 'md',
  locale: localeProp,
  className,
  ...rest
}: StatProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const tone = change === undefined ? undefined : changeTone(change, goodDirection);
  const arrow = change === undefined || change === 0 ? null : change > 0 ? '▲' : '▼';
  const trend = !change ? strings.stat.flat : change > 0 ? strings.stat.up : strings.stat.down;

  return (
    <div className={cx(styles.stat, styles[size], className)} {...rest}>
      <div className={styles.label}>{label}</div>

      <div className={styles.body}>
        <div className={styles.value}>{value}</div>

        {chart && <div className={styles.chart}>{chart}</div>}
      </div>

      {(change !== undefined || hint) && (
        <div className={styles.footer}>
          {change !== undefined && tone && (
            <span className={cx(styles.change, styles[tone])}>
              {arrow && (
                <span className={styles.arrow} aria-hidden>
                  {arrow}
                </span>
              )}

              {/* Стрелка скринридеру не видна — направление словом */}
              <VisuallyHidden.Root>{trend} </VisuallyHidden.Root>

              {formatChange(change, changeFormat, locale)}
            </span>
          )}

          {hint && <span className={styles.hint}>{hint}</span>}
        </div>
      )}
    </div>
  );
}
