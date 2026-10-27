import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { cx } from '../lib/cx';
import { useUiLocale } from '../strings/ui-strings-context';

import { meterRatio, meterSegments, meterTone, type MeterDirection } from './meter-model';
import styles from './meter.module.css';

export interface MeterProps extends ComponentPropsWithRef<'div'> {
  value: number;
  min?: number;
  max?: number;
  /** С этого значения — тон предупреждения и риска на шкале */
  warning?: number;
  /** С этого значения — тон опасности и риска на шкале */
  danger?: number;
  /**
   * high-is-bad — много плохо (занятое место, лимит); low-is-bad — мало плохо (заряд, свободное место):
   * тон включается, когда значение опустилось до порога
   */
  direction?: MeterDirection;
  /** Шкала делениями (TUI-полоса): `segments={10}`; пустые деления в зоне порога подкрашены её тоном */
  segments?: number;
  /** Подпись слева над шкалой; связана со шкалой для скринридера */
  label?: ReactNode;
  /** Подпись значения справа; по умолчанию «64 / 100». `false` — без подписи */
  valueLabel?: ReactNode | false;
  /** Текст значения для скринридера (aria-valuetext); по умолчанию — как подпись */
  valueText?: string;
  /** Высота шкалы: 4 / 6 px */
  size?: 'sm' | 'md';
  /** Локаль чисел в подписи по умолчанию; сама — из UiStringsProvider (без него ru) */
  locale?: string;
}

/**
 * Шкала с порогами — лимиты пространства: место под файлы, участники голосового, слоты ролей. В отличие
 * от `Progress` показывает не ход процесса, а заполненность, и меняет тон на порогах `warning` / `danger`
 * (в обе стороны: `direction="low-is-bad"` — для заряда и свободного места); `segments` — делениями.
 */
export function Meter({
  value,
  min = 0,
  max = 100,
  warning,
  danger,
  direction = 'high-is-bad',
  segments,
  label,
  valueLabel,
  valueText,
  size = 'md',
  locale: localeProp,
  className,
  ...rest
}: MeterProps) {
  const locale = useUiLocale(localeProp);
  const labelId = useId();
  const ratio = meterRatio(value, min, max);
  const tone = meterTone(value, { warning, danger }, direction);
  const cells = segments
    ? meterSegments(value, min, max, segments, { warning, danger }, direction)
    : null;
  const numbers = new Intl.NumberFormat(locale);
  const defaultLabel = `${numbers.format(value)} / ${numbers.format(max)}`;
  const shownValue = valueLabel === undefined ? defaultLabel : valueLabel;
  const thresholds = [warning, danger].filter((mark): mark is number => mark !== undefined);

  return (
    <div className={cx(styles.root, styles[size], styles[tone], className)} {...rest}>
      {(label || shownValue !== false) && (
        <div className={styles.header}>
          {label && (
            <span id={labelId} className={styles.label}>
              {label}
            </span>
          )}

          {shownValue !== false && <span className={styles.value}>{shownValue}</span>}
        </div>
      )}

      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={valueText ?? (typeof shownValue === 'string' ? shownValue : defaultLabel)}
        aria-labelledby={label ? labelId : undefined}
        data-tone={tone}
        data-direction={direction}
        className={styles.bar}
      >
        {cells ? (
          <div className={styles.segments}>
            {cells.map((cell, index) => (
              <span
                key={index}
                className={styles.segment}
                data-filled={cell.filled || undefined}
                data-zone={cell.zone ?? undefined}
              />
            ))}
          </div>
        ) : (
          <div className={styles.track}>
            <div
              className={styles.indicator}
              style={{ transform: `translateX(-${(1 - ratio) * 100}%)` }}
            />
          </div>
        )}

        {/* У делений порог виден зоной, риска поверх деления читалась бы как ещё одно деление */}
        {!cells &&
          thresholds.map((mark) => (
            <span
              key={mark}
              className={cx(styles.tick, mark === danger ? styles.tickDanger : styles.tickWarning)}
              style={{ left: `${meterRatio(mark, min, max) * 100}%` }}
              aria-hidden
            />
          ))}
      </div>
    </div>
  );
}
