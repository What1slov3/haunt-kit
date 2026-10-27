import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { RadioGroup as RadixRadioGroup } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './radio-group.module.css';

export type RadioGroupRootProps = ComponentPropsWithRef<typeof RadixRadioGroup.Root> & {
  /** Пункты в ряд, а не в колонку */
  horizontal?: boolean;
};

export function RadioGroupRoot({ horizontal, className, ...rest }: RadioGroupRootProps) {
  return (
    <RadixRadioGroup.Root
      className={cx(styles.root, horizontal && styles.horizontal, className)}
      {...rest}
    />
  );
}

export type RadioGroupItemProps = ComponentPropsWithRef<typeof RadixRadioGroup.Item> & {
  label?: ReactNode;
  description?: ReactNode;
};

export function RadioGroupItem({
  label,
  description,
  id,
  className,
  ...rest
}: RadioGroupItemProps) {
  const generatedId = useId();
  const itemId = id ?? generatedId;

  const control = (
    <RadixRadioGroup.Item id={itemId} className={cx(styles.item, className)} {...rest}>
      <RadixRadioGroup.Indicator className={styles.indicator} />
    </RadixRadioGroup.Item>
  );

  if (!label) return control;

  return (
    <label htmlFor={itemId} className={styles.row}>
      {control}

      <span className={styles.text}>
        <span className={styles.label}>{label}</span>

        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  );
}

// Имена частей как в JSX — так их показывают «Show code» в Storybook и React DevTools
RadioGroupRoot.displayName = 'RadioGroup.Root';
RadioGroupItem.displayName = 'RadioGroup.Item';
