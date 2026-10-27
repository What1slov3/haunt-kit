import type { ComponentPropsWithRef, ReactNode } from 'react';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { cx } from '../lib/cx';

import styles from './input.module.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  /** 24 / 28 / 32 px */
  size?: InputSize;
  invalid?: boolean;
  /** Иконка или текст слева/справа внутри поля */
  startSlot?: ReactNode;
  endSlot?: ReactNode;
  fullWidth?: boolean;
  /** Моноширинный ввод — для кодов, id, команд */
  mono?: boolean;
  /**
   * Приглашение командной строки слева: `true` — `>` из TUI-токена (гаснет с `data-tui="off"`), строка —
   * свой знак (`/`, `$`, `#`), он остаётся всегда. В фокусе загорается цветом акцента
   */
  prompt?: boolean | string;
  /** Класс на обёртке; className уходит на сам <input> */
  wrapperClassName?: string;
}

/**
 * Поле ввода. Рамка и фокус живут на обёртке (стили field-frame, :focus-within), чтобы слоты были
 * внутри поля; у самого <input> outline снят — иначе колец было бы два. Внутри <Field> id,
 * описание и ошибка подхватываются из контекста.
 */
export function Input({
  size = 'md',
  invalid,
  startSlot,
  endSlot,
  fullWidth,
  mono,
  prompt,
  wrapperClassName,
  className,
  disabled,
  ...rest
}: InputProps) {
  const control = useFieldControl({ invalid, ...rest });

  return (
    <span
      className={cx(
        frame.frame,
        frame[size],
        fullWidth && frame.fullWidth,
        styles.field,
        mono && styles.mono,
        wrapperClassName,
      )}
      data-invalid={control.invalid || undefined}
      data-disabled={disabled || undefined}
    >
      {prompt && (
        <span className={cx(styles.prompt, prompt === true && styles.promptToken)} aria-hidden>
          {typeof prompt === 'string' ? prompt : null}
        </span>
      )}

      {startSlot && <span className={styles.slot}>{startSlot}</span>}

      <input
        className={cx(styles.input, className)}
        aria-invalid={control.invalid || undefined}
        disabled={disabled}
        {...rest}
        {...control.props}
      />

      {endSlot && <span className={styles.slot}>{endSlot}</span>}
    </span>
  );
}
