import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';
import { useUiLocale } from '../strings/ui-strings-context';

import { tickerParts } from './ticker-parts';
import styles from './number-ticker.module.css';

export interface NumberTickerProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  value: number;
  /** Локаль Intl.NumberFormat; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
  /** Опции Intl.NumberFormat: проценты, компактная запись, знаки после запятой */
  format?: Intl.NumberFormatOptions;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Число, у которого цифры перекатываются к новому значению: счётчики онлайна, статистика. Каждая цифра —
 * столбец 0–9 со сдвигом transform; разряды сопоставляются с конца, поэтому при росте 999 → 1 000 новая
 * цифра появляется слева, а единицы докатываются. Табличные цифры — ширина не прыгает. При
 * `data-effects="off"` и reduced-motion — сразу новое значение. Скринридер читает число целиком.
 */
export function NumberTicker({
  value,
  locale: localeProp,
  format,
  className,
  ...rest
}: NumberTickerProps) {
  const locale = useUiLocale(localeProp);
  const formatted = new Intl.NumberFormat(locale, format).format(value);

  return (
    <span className={cx(styles.root, className)} {...rest}>
      <VisuallyHidden.Root>{formatted}</VisuallyHidden.Root>

      <span className={styles.digits} aria-hidden>
        {tickerParts(formatted).map((part) =>
          part.digit === null ? (
            <span key={part.key} className={styles.static}>
              {part.char}
            </span>
          ) : (
            <span key={part.key} className={styles.cell}>
              {/* Невидимая цифра держит ширину и базовую линию: столбец позиционирован абсолютно */}
              <span className={styles.ghost}>{part.char}</span>

              <span className={styles.column} style={{ '--digit': part.digit } as CSSProperties}>
                {DIGITS.map((digit) => (
                  <span key={digit} className={styles.digit}>
                    {digit}
                  </span>
                ))}
              </span>
            </span>
          ),
        )}
      </span>
    </span>
  );
}
