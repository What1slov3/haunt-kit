import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { ArrowRight } from 'lucide-react';
import { Slot, VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { Kbd } from '../kbd/kbd';
import { cx } from '../lib/cx';
import { Spinner } from '../spinner/spinner';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './button.module.css';
import { useHoldToConfirm } from './use-hold-to-confirm';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const DEFAULT_HOLD_MS = 900;

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  /** primary — светлая с тёмным текстом, accent — цвет пространства */
  variant?: ButtonVariant;
  /** 24 / 28 / 32 px */
  size?: ButtonSize;
  /**
   * Блокирует кнопку, ширина не прыгает. С `iconStart` спиннер встаёт на место иконки и текст остаётся,
   * без него — спиннер по центру поверх погасшего содержимого
   */
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  /** Стрелка в конце, на наведении сдвигается вперёд: «продолжить», «открыть» */
  arrow?: boolean;
  /** Подсказка сочетания справа (`Ctrl+Enter`). Только подпись: клавиши слушает экран */
  shortcut?: string;
  /** Число после текста: участники, непрочитанное */
  count?: number;
  /**
   * Подтверждение удержанием (true — 900 мс, число — своя длительность): заливка идёт слева направо,
   * отпустили раньше — отмена. Срабатывает `onConfirm`, обычный клик ничего не подтверждает
   */
  holdToConfirm?: boolean | number;
  onConfirm?: () => void;
  fullWidth?: boolean;
  /** Отрендерить стили на ребёнке (например, `<a>`), а не на `<button>` */
  asChild?: boolean;
}

/** Прожектор под курсором — у залитых и вторичной; у ghost фона нет, светить не на чем */
const spotlit: Record<ButtonVariant, boolean> = {
  primary: true,
  accent: true,
  secondary: true,
  ghost: false,
  danger: true,
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconStart,
  iconEnd,
  arrow,
  shortcut,
  count,
  holdToConfirm,
  onConfirm,
  fullWidth,
  asChild,
  disabled,
  className,
  style,
  children,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  ...rest
}: ButtonProps) {
  const strings = useUiStrings();
  const Component = asChild ? Slot.Root : 'button';
  const isDisabled = disabled || loading;
  const holdMs = holdToConfirm === true ? DEFAULT_HOLD_MS : holdToConfirm || null;
  const hold = useHoldToConfirm(holdMs, onConfirm, isDisabled);
  const inlineSpinner = loading && Boolean(iconStart);

  const holdStyle =
    holdMs === null ? undefined : ({ '--hold-duration': `${holdMs}ms` } as CSSProperties);

  return (
    <Component
      type={asChild ? undefined : 'button'}
      // У <a> атрибута disabled нет: ребёнку через asChild уходит aria-disabled, а клики режет CSS
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={asChild && isDisabled ? true : undefined}
      data-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? (inlineSpinner ? 'inline' : 'overlay') : undefined}
      data-variant={variant}
      data-spotlight={spotlit[variant] || undefined}
      data-holding={hold.holding || undefined}
      data-confirmed={hold.confirmed || undefined}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      style={{ ...holdStyle, ...style }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        hold.handlers?.onPointerDown(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        hold.handlers?.onPointerUp();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        hold.handlers?.onPointerLeave();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        hold.handlers?.onPointerCancel();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        hold.handlers?.onKeyDown(event);
      }}
      onKeyUp={(event) => {
        onKeyUp?.(event);
        hold.handlers?.onKeyUp(event);
      }}
      {...rest}
    >
      {holdMs !== null && <span className={styles.holdFill} data-motion-keep aria-hidden />}

      {loading && !inlineSpinner && <Spinner size="sm" className={styles.spinner} />}

      {iconStart && (
        <span className={styles.icon}>{inlineSpinner ? <Spinner size="sm" /> : iconStart}</span>
      )}

      {/* Slottable — чтобы asChild принял ребёнка вместе с иконками по бокам; без asChild текст в
          своей обёртке, чтобы длинная подпись обрезалась многоточием, а не вылезала из кнопки */}
      {asChild ? (
        <Slot.Slottable>{children}</Slot.Slottable>
      ) : (
        <span className={styles.label}>{children}</span>
      )}

      {holdMs !== null && <VisuallyHidden.Root>{strings.button.holdToConfirm}</VisuallyHidden.Root>}

      {count !== undefined && <span className={styles.count}>{count}</span>}

      {iconEnd && <span className={styles.icon}>{iconEnd}</span>}

      {arrow && (
        <span className={cx(styles.icon, styles.arrow)}>
          <Icon icon={ArrowRight} />
        </span>
      )}

      {shortcut && (
        <Kbd size="sm" className={styles.shortcut}>
          {shortcut}
        </Kbd>
      )}
    </Component>
  );
}
