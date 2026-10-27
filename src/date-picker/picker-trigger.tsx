import {
  useRef,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';

import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { assignRef } from '../lib/assign-ref';

import styles from './date-picker.module.css';

export interface PickerTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Показанное значение; null — пусто, виден placeholder */
  label: ReactNode | null;
  placeholder: ReactNode;
  icon: LucideIcon;
  size: 'sm' | 'md' | 'lg';
  invalid: boolean;
  fullWidth?: boolean;
  open: boolean;
  /** Есть что очищать и очистка разрешена — крестик в рамке и Backspace / Delete на триггере */
  onClear?: () => void;
  clearLabel: string;
  /** Класс на рамке */
  frameClassName?: string;
  /** Скрытые поля формы — внутри рамки, чтобы жили и умирали вместе с пикером */
  hiddenInputs?: ReactNode;
}

/**
 * Триггер пикера в рамке поля. Рамка — span-якорь поповера, внутри — кнопка-триггер и кнопка очистки
 * рядом: вложенный <button> в <button> HTML запрещает, поэтому рамка и триггер разделены. Клик по
 * свободному месту рамки (иконка, поля) открывает поповер, как клик по самому полю.
 */
export function PickerTrigger({
  label,
  placeholder,
  icon,
  size,
  invalid,
  fullWidth,
  open,
  onClear,
  clearLabel,
  frameClassName,
  hiddenInputs,
  disabled,
  className,
  onKeyDown,
  ref,
  ...rest
}: PickerTriggerProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const setRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;

    assignRef(ref, node);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || !onClear) return;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      onClear();
    }
  };

  const handleFrameClick = (event: MouseEvent<HTMLSpanElement>) => {
    if (disabled || !(event.target instanceof Element) || event.target.closest('button')) return;

    event.currentTarget.querySelector<HTMLButtonElement>('[data-picker-trigger]')?.click();
  };

  return (
    <RadixPopover.Anchor asChild>
      <span
        className={cx(
          frame.frame,
          frame[size],
          fullWidth && frame.fullWidth,
          styles.frame,
          frameClassName,
        )}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        data-state={open ? 'open' : 'closed'}
        onClick={handleFrameClick}
      >
        <RadixPopover.Trigger asChild>
          <button
            ref={setRef}
            type="button"
            data-picker-trigger=""
            className={cx(styles.trigger, className)}
            data-placeholder={label === null ? '' : undefined}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            {...rest}
          >
            <span className={styles.value}>{label ?? placeholder}</span>
          </button>
        </RadixPopover.Trigger>

        {onClear && !disabled && (
          <IconButton
            label={clearLabel}
            size="xs"
            variant="ghost"
            // Клавиатура очищает с триггера (Backspace / Delete): у поля остаётся одна остановка Tab
            tabIndex={-1}
            className={styles.clear}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              onClear();
              triggerRef.current?.focus();
            }}
          >
            <Icon icon={X} size="xs" />
          </IconButton>
        )}

        <Icon icon={icon} size="sm" className={styles.icon} />

        {hiddenInputs}
      </span>
    </RadixPopover.Anchor>
  );
}

PickerTrigger.displayName = 'PickerTrigger';
