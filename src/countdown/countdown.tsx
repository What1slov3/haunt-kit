import { useEffect, useRef, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { FLAP_DIGITS } from '../fx/effects/split-flap/flap-queue';
import { SplitFlap } from '../fx/effects/split-flap/split-flap';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { toDate, type TimestampInput } from '../timestamp/timestamp-format';

import {
  COUNTDOWN_UNITS,
  nextTick,
  padPart,
  splitDuration,
  type CountdownUnit,
} from './countdown-math';
import styles from './countdown.module.css';

export type { CountdownUnit } from './countdown-math';

export interface CountdownProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Момент события */
  to: TimestampInput;
  /** Какие единицы показывать; старшая вбирает остаток */
  units?: readonly CountdownUnit[];
  /** Убирать ведущие нули (`0 дн`), оставляя две единицы */
  trim?: boolean;
  /** plain — цифры с подписями; flap — перекидное табло `SplitFlap` (язык стиля «сигнал») */
  variant?: 'plain' | 'flap';
  size?: 'sm' | 'md' | 'lg';
  /** Подпись по завершении; по умолчанию «Началось» */
  doneLabel?: ReactNode;
  /** Время вышло — один раз */
  onComplete?: () => void;
  /** Подпись таймера для скринридера: «До начала эфира» */
  label?: string;
  /** Замороженное «сейчас» — историям и тестам; без него — часы */
  now?: TimestampInput;
}

/**
 * Обратный отсчёт до события: дни, часы, минуты, секунды (набор — `units`), ведущие нули убираются.
 * Таймер ставится ровно на смену показа (`nextTick`), а не раз в секунду наугад; без секунд — раз в
 * минуту. `flap` — табло `SplitFlap`: при `data-effects="off"` и reduced-motion флажки не перекидываются,
 * цифры просто сменяются. Разбивка времени — чистые функции `countdown-math.ts`.
 */
export function Countdown({
  to,
  units = COUNTDOWN_UNITS,
  trim = true,
  variant = 'plain',
  size = 'md',
  doneLabel,
  onComplete,
  label,
  now: fixedNow,
  className,
  ...rest
}: CountdownProps) {
  const text = useUiStrings().countdown;
  const target = toDate(to).getTime();
  const frozen = fixedNow === undefined ? undefined : toDate(fixedNow).getTime();
  const [clock, setClock] = useState(() => Date.now());
  const now = frozen ?? clock;
  const remaining = target - now;
  const { parts, done } = splitDuration(remaining, { units, trim });
  const completed = useRef(done);
  const unitsKey = units.join(',');

  useEffect(() => {
    if (frozen !== undefined || done) return;

    const timer = setTimeout(
      () => setClock(Date.now()),
      nextTick(target - Date.now(), unitsKey.split(',') as CountdownUnit[]),
    );

    return () => clearTimeout(timer);
  }, [frozen, done, target, clock, unitsKey]);

  useEffect(() => {
    if (done && !completed.current) onComplete?.();

    completed.current = done;
  }, [done, onComplete]);

  const spoken = parts.map((part) => text.unit[part.unit](part.value)).join(' ');

  return (
    <div
      role="timer"
      aria-label={label}
      className={cx(styles.root, styles[variant], styles[size], className)}
      data-done={done || undefined}
      {...rest}
    >
      {done ? (
        <span className={styles.done}>{doneLabel ?? text.done}</span>
      ) : (
        <>
          <VisuallyHidden.Root>{spoken}</VisuallyHidden.Root>

          <span className={styles.parts} aria-hidden>
            {parts.map((part, index) => (
              <span key={part.unit} className={styles.part}>
                {variant === 'flap' ? (
                  <SplitFlap
                    value={padPart(part, index === 0)}
                    charset={FLAP_DIGITS}
                    size={size}
                    className={styles.flap}
                  />
                ) : (
                  <span className={styles.digits}>{padPart(part, index === 0)}</span>
                )}

                <span className={styles.unit}>{text.unitShort[part.unit]}</span>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}
