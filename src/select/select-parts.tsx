import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Check, ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { Select as RadixSelect } from 'radix-ui';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { usePortalContainer } from '../theme/portal-container';

import styles from './select.module.css';

export type SelectTriggerProps = ComponentPropsWithRef<typeof RadixSelect.Trigger> & {
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  invalid?: boolean;
  fullWidth?: boolean;
};

/**
 * Триггер на той же рамке и шкале, что Input (field-frame), но выглядит кнопкой: в select не печатают,
 * его нажимают. Внутри <Field> получает id и описание
 */
export function SelectTrigger({
  size = 'md',
  placeholder,
  invalid,
  fullWidth,
  className,
  children,
  ...rest
}: SelectTriggerProps) {
  const control = useFieldControl({ invalid, ...rest });

  return (
    <RadixSelect.Trigger
      className={cx(
        frame.frame,
        frame[size],
        fullWidth && frame.fullWidth,
        styles.trigger,
        styles[size],
        className,
      )}
      data-invalid={control.invalid || undefined}
      aria-invalid={control.invalid || undefined}
      {...rest}
      {...control.props}
    >
      <span className={styles.value}>
        {children ?? <RadixSelect.Value placeholder={placeholder} />}
      </span>

      <RadixSelect.Icon className={styles.chevron}>
        <Icon icon={ChevronsUpDown} size="xs" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export type SelectContentProps = ComponentPropsWithRef<typeof RadixSelect.Content>;

/** position="popper" — список под триггером той же ширины, а не поверх него, как нативный */
export function SelectContent({
  position = 'popper',
  sideOffset = 4,
  collisionPadding = 8,
  className,
  children,
  ...rest
}: SelectContentProps) {
  const container = usePortalContainer();

  return (
    <RadixSelect.Portal container={container}>
      <RadixSelect.Content
        position={position}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      >
        <RadixSelect.ScrollUpButton className={styles.scrollButton}>
          <Icon icon={ChevronUp} size="sm" />
        </RadixSelect.ScrollUpButton>

        <RadixSelect.Viewport className={styles.viewport}>{children}</RadixSelect.Viewport>

        <RadixSelect.ScrollDownButton className={styles.scrollButton}>
          <Icon icon={ChevronDown} size="sm" />
        </RadixSelect.ScrollDownButton>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export type SelectItemProps = ComponentPropsWithRef<typeof RadixSelect.Item> & {
  /** Справа в списке — подсказка к пункту (сочетание, рисунок, число); в триггер не попадает */
  aside?: ReactNode;
};

export function SelectItem({ aside, className, children, ...rest }: SelectItemProps) {
  return (
    <RadixSelect.Item className={cx(styles.item, className)} {...rest}>
      <RadixSelect.ItemIndicator className={styles.indicator}>
        <Icon icon={Check} size="sm" />
      </RadixSelect.ItemIndicator>

      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>

      {aside !== undefined && <span className={styles.aside}>{aside}</span>}
    </RadixSelect.Item>
  );
}

export function SelectLabel({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixSelect.Label>) {
  return <RadixSelect.Label className={cx(styles.groupLabel, className)} {...rest} />;
}

export function SelectSeparator({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixSelect.Separator>) {
  return <RadixSelect.Separator className={cx(styles.separator, className)} {...rest} />;
}

// Имена частей как в JSX — так их показывают «Show code» в Storybook и React DevTools
SelectTrigger.displayName = 'Select.Trigger';
SelectContent.displayName = 'Select.Content';
SelectItem.displayName = 'Select.Item';
SelectLabel.displayName = 'Select.Label';
SelectSeparator.displayName = 'Select.Separator';
