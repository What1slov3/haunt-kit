import type { ComponentPropsWithRef, ElementType } from 'react';

import { cx } from '../lib/cx';

import styles from './field-frame.module.css';

export type FieldFrameSize = 'sm' | 'md' | 'lg';

export interface FieldFrameProps extends ComponentPropsWithRef<'div'> {
  as?: ElementType;
  /** 24 / 28 / 32 px — та же шкала, что у Button */
  size?: FieldFrameSize;
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Высота по содержимому (textarea, композер); контролы внутри прижаты к низу */
  multiline?: boolean;
  /** Градиентная кромка с бегущим отблеском при фокусе внутри — композер, поле команды */
  glow?: boolean;
}

/**
 * Рамка поля без самого поля: фон, граница, hover / focus-within / invalid / disabled. Input, Textarea
 * и Select.Trigger используют её стили напрямую; как компонент — для составных полей (композер:
 * кнопки + голый Textarea внутри одной рамки).
 */
export function FieldFrame({
  as,
  size = 'md',
  invalid,
  disabled,
  fullWidth,
  multiline,
  glow,
  className,
  ...rest
}: FieldFrameProps) {
  const Component = as ?? 'div';

  return (
    <Component
      className={cx(
        styles.frame,
        styles[size],
        fullWidth && styles.fullWidth,
        multiline && styles.multiline,
        className,
      )}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
      data-glow={glow || undefined}
      {...rest}
    />
  );
}
