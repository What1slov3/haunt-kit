import type { ComponentPropsWithRef } from 'react';

import { Slot } from 'radix-ui';

import { cx } from '../lib/cx';
import { Spinner } from '../spinner/spinner';

import styles from './icon-button.module.css';

export type IconButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ComponentPropsWithRef<'button'> {
  /** Обязательная подпись: у кнопки нет текста, скринридер читает её отсюда */
  label: string;
  variant?: IconButtonVariant;
  /** 20 / 24 / 28 / 32 px */
  size?: IconButtonSize;
  /** Квадрат со скруглением (по умолчанию) или круг — для аватарных кнопок */
  shape?: 'square' | 'circle';
  loading?: boolean;
  /** Подсвеченное состояние, например включённый фильтр */
  active?: boolean;
  asChild?: boolean;
}

/** Иконочная кнопка. Иконка — `<Icon />` в children. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  shape = 'square',
  loading = false,
  active,
  asChild,
  disabled,
  className,
  children,
  ...rest
}: IconButtonProps) {
  const Component = asChild ? Slot.Root : 'button';
  const isDisabled = disabled || loading;

  return (
    <Component
      type={asChild ? undefined : 'button'}
      aria-label={label}
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={asChild && isDisabled ? true : undefined}
      data-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      data-active={active || undefined}
      data-variant={variant}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        shape === 'circle' && styles.circle,
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : children}
    </Component>
  );
}
