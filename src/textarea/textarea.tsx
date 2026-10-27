import type { ComponentPropsWithRef } from 'react';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { cx } from '../lib/cx';

import styles from './textarea.module.css';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  invalid?: boolean;
  fullWidth?: boolean;
  /** Растёт по содержимому до 12 строк (через field-sizing, без JS) */
  autoGrow?: boolean;
  /** Без рамки и фона — для композера, где рамку рисует FieldFrame */
  bare?: boolean;
}

/** Многострочное поле на той же рамке, что Input: одна строка — 28 px, дальше растёт */
export function Textarea({
  invalid,
  fullWidth,
  autoGrow,
  bare,
  rows = 3,
  className,
  ...rest
}: TextareaProps) {
  const control = useFieldControl({ invalid, ...rest });

  return (
    <textarea
      rows={rows}
      aria-invalid={control.invalid || undefined}
      data-invalid={control.invalid || undefined}
      data-disabled={rest.disabled || undefined}
      className={cx(
        !bare && frame.frame,
        !bare && frame.md,
        !bare && frame.multiline,
        !bare && fullWidth && frame.fullWidth,
        styles.textarea,
        autoGrow && styles.autoGrow,
        bare && styles.bare,
        className,
      )}
      {...rest}
      {...control.props}
    />
  );
}
