import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { cx } from '../lib/cx';
import { Spinner } from '../spinner/spinner';
import { useUiStrings } from '../strings/ui-strings-context';

import { TUI_SPINNER_FRAMES, TUI_SPINNER_INTERVAL, type TuiSpinnerVariant } from './tui-frames';
import styles from './tui-spinner.module.css';

export interface TuiSpinnerProps extends ComponentPropsWithRef<'span'> {
  /** braille ⠋⠙⠹…, line |/-\, dots . .. ... */
  variant?: TuiSpinnerVariant;
  /** Длительность кадра, мс; по умолчанию своя у каждого набора */
  interval?: number;
  /** Подпись для скринридера (role="status"); по умолчанию «Загрузка» */
  label?: string;
  /** Видимая подпись справа: «сборка», «подключение к голосу» */
  children?: ReactNode;
}

/**
 * Спиннер «по-терминальному»: кадры символов моно. Кадры сменяет CSS (`steps()` по столбцу кадров —
 * только transform), без таймера в JS. Как `Spinner`, не гаснет при reduced-motion: смена знака на
 * месте — не движение по экрану, а без неё «грузится» не отличить от «зависло». Без TUI
 * (`data-tui="off"`) — обычный `Spinner`: смысл тот же, вид — как у остального интерфейса.
 */
export function TuiSpinner({
  variant = 'braille',
  interval,
  label,
  children,
  className,
  style,
  ...rest
}: TuiSpinnerProps) {
  const strings = useUiStrings();
  const frames = TUI_SPINNER_FRAMES[variant];
  const frameMs = interval ?? TUI_SPINNER_INTERVAL[variant];

  return (
    <span
      role="status"
      aria-label={label ?? strings.tuiSpinner.label}
      className={cx(styles.root, className)}
      style={
        {
          ...style,
          '--frames': frames.length,
          '--frames-duration': `${frames.length * frameMs}ms`,
        } as CSSProperties
      }
      {...rest}
    >
      <span className={styles.window} aria-hidden>
        <span className={styles.frames} data-motion-keep="">
          {frames.map((frame, index) => (
            <span key={index} className={styles.frame}>
              {frame}
            </span>
          ))}
        </span>
      </span>

      <Spinner size="sm" className={styles.fallback} role="presentation" aria-hidden />

      {children && <span className={styles.caption}>{children}</span>}
    </span>
  );
}
