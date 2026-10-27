import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { NumberTicker } from '../number-ticker/number-ticker';
import { Sparkline } from '../sparkline/sparkline';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import { historyDelta, meterSpan, tierOf, type ReputationTier } from './reputation-math';
import styles from './reputation-meter.module.css';

export type { ReputationTier } from './reputation-math';

export interface ReputationMeterProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  value: number;
  /** Шкала; если ноль внутри (−100…100), заливка идёт от нуля */
  min?: number;
  max?: number;
  /** Изменение за период; без него — из истории (последнее минус первое) */
  delta?: number;
  /** Подпись периода рядом с изменением: «за неделю» */
  deltaLabel?: ReactNode;
  /** Значения за период для мини-графика, старые слева */
  history?: readonly number[];
  /** Ступени репутации: засечки на шкале и название текущей */
  tiers?: readonly ReputationTier[];
  /** Подпись; по умолчанию «Репутация» */
  label?: string;
  /** Локаль чисел; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Репутация: число (`NumberTicker`), изменение за период со стрелкой и тоном, мини-история (`Sparkline`),
 * шкала с засечками ступеней и названием текущей. Шкала через ноль заливается от нуля: минус читается
 * минусом. Заливка — только transform; геометрия — reputation-math.ts.
 */
export function ReputationMeter({
  value,
  min = 0,
  max = 1000,
  delta: deltaProp,
  deltaLabel,
  history,
  tiers,
  label,
  locale: localeProp,
  className,
  ...rest
}: ReputationMeterProps) {
  const text = useUiStrings().reputationMeter;
  const locale = useUiLocale(localeProp);
  const span = meterSpan(value, min, max);
  const delta = deltaProp ?? (history ? historyDelta(history) : undefined);
  const trend = delta === undefined ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const { tier } = tierOf(value, tiers ?? []);
  const range = max - min;
  const signed = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' });
  const title = label ?? text.label;

  return (
    <div className={cx(styles.root, className)} data-negative={value < 0 || undefined} {...rest}>
      <div className={styles.head}>
        <span className={styles.label}>{title}</span>

        {tier && <span className={styles.tier}>{tier.label}</span>}
      </div>

      <div className={styles.summary}>
        <NumberTicker value={value} locale={locale} className={styles.value} />

        {trend && delta !== undefined && (
          <span className={styles.delta} data-trend={trend}>
            <Icon
              icon={trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus}
              size="xs"
            />

            <span aria-hidden>{signed.format(delta)}</span>

            <VisuallyHidden.Root>{text.change(delta)}</VisuallyHidden.Root>

            {deltaLabel && <span className={styles.period}>{deltaLabel}</span>}
          </span>
        )}

        {history && history.length > 1 && (
          <Sparkline
            data={history}
            width={88}
            height={24}
            tone={trend === 'down' ? 'danger' : trend === 'up' ? 'success' : 'neutral'}
            fill
            showLast
            tooltip
            label={text.history}
            formatValue={(point) => point.toLocaleString(locale)}
            className={styles.spark}
          />
        )}
      </div>

      <div
        role="meter"
        aria-label={title}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.min(Math.max(value, min), max)}
        aria-valuetext={tier ? `${value.toLocaleString(locale)}, ${tier.label}` : undefined}
        className={styles.track}
        style={{ '--span-start': span.start, '--span-end': span.end } as CSSProperties}
      >
        <span className={styles.fill} />

        {span.zero !== null && (
          <span className={styles.zero} style={{ left: `${span.zero * 100}%` }} aria-hidden />
        )}

        {range > 0 &&
          tiers?.map((item) => {
            const at = (item.from - min) / range;

            if (at <= 0 || at >= 1) return null;

            return (
              <span
                key={item.from}
                className={styles.tick}
                data-passed={value >= item.from || undefined}
                style={{ left: `${at * 100}%` }}
                aria-hidden
              />
            );
          })}
      </div>
    </div>
  );
}
