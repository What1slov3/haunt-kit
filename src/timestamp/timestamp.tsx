import { useEffect, useState, type ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';
import { useUiLocale } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import { subscribeClock } from './timestamp-clock';
import {
  formatClock,
  formatDate,
  formatExact,
  formatRelative,
  refreshDelay,
  toDate,
  type TimestampInput,
} from './timestamp-format';
import styles from './timestamp.module.css';

export type TimestampMode = 'relative' | 'time' | 'date';

export interface TimestampProps extends Omit<ComponentPropsWithRef<'time'>, 'children'> {
  /** Момент времени: Date, ISO-строка или миллисекунды */
  date: TimestampInput;
  /** relative — «5 мин», «вчера в 12:40»; time — «12:40»; date — «12 мар. 2025 г.» */
  mode?: TimestampMode;
  /** Локаль Intl; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
  /** Обновлять относительную подпись со временем (общий таймер на все экземпляры) */
  live?: boolean;
  /** Точное время в подсказке при наведении */
  tooltip?: boolean;
}

/**
 * Время в `<time dateTime>`: моно, табличные цифры. Относительная подпись обновляется сама: пока в
 * ней минуты — раз в 30 с, часы — раз в 5 мин, «вчера» — в полночь; все Timestamp на экране делят
 * один таймер. Цвет наследует — обычно его кладут в `Text tone="subtle"`.
 */
export function Timestamp({
  date,
  mode = 'relative',
  locale: localeProp,
  live = true,
  tooltip = true,
  className,
  ...rest
}: TimestampProps) {
  const locale = useUiLocale(localeProp);
  const value = toDate(date);
  const time = value.getTime();
  const valid = !Number.isNaN(time);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!live || !valid || mode !== 'relative') return;

    const delay = refreshDelay(new Date(time), new Date(now));

    if (delay === null) return;

    return subscribeClock(() => setNow(Date.now()), delay);
  }, [live, valid, mode, time, now]);

  if (!valid) {
    return (
      <time className={cx(styles.time, className)} {...rest}>
        —
      </time>
    );
  }

  const label =
    mode === 'time'
      ? formatClock(value, locale)
      : mode === 'date'
        ? formatDate(value, locale)
        : formatRelative(value, new Date(now), locale);

  const element = (
    <time dateTime={value.toISOString()} className={cx(styles.time, className)} {...rest}>
      {label}
    </time>
  );

  return tooltip ? <Tooltip content={formatExact(value, locale)}>{element}</Tooltip> : element;
}
