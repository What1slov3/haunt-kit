import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Check, Minus } from 'lucide-react';
import { Checkbox as RadixCheckbox } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './checkbox.module.css';

export interface CheckboxProps extends Omit<
  ComponentPropsWithRef<typeof RadixCheckbox.Root>,
  'asChild'
> {
  label?: ReactNode;
  description?: ReactNode;
}

/** `checked` принимает `true | false | 'indeterminate'` — это Radix, не наша прихоть */
export function Checkbox({ label, description, className, id, checked, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  const control = (
    <RadixCheckbox.Root
      id={checkboxId}
      checked={checked}
      className={cx(styles.root, className)}
      {...rest}
    >
      <RadixCheckbox.Indicator className={styles.indicator}>
        <Icon icon={checked === 'indeterminate' ? Minus : Check} size="xs" strokeWidth={2.5} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (!label) return control;

  return (
    <label htmlFor={checkboxId} className={styles.row}>
      {control}

      <span className={styles.text}>
        <span className={styles.label}>{label}</span>

        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  );
}
