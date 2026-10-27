import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Switch as RadixSwitch } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './switch.module.css';

export interface SwitchProps extends Omit<
  ComponentPropsWithRef<typeof RadixSwitch.Root>,
  'asChild'
> {
  /** Подпись слева от переключателя; кликабельна. Переключатель прижат к правому краю строки */
  label?: ReactNode;
  description?: ReactNode;
}

/** Компактный переключатель 30×16; в строке настроек подпись слева, контрол справа, как в Linear */
export function Switch({ label, description, className, id, ...rest }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  const control = (
    <RadixSwitch.Root id={switchId} className={cx(styles.root, className)} {...rest}>
      <RadixSwitch.Thumb className={styles.thumb} />
    </RadixSwitch.Root>
  );

  if (!label) return control;

  return (
    <label htmlFor={switchId} className={styles.row}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>

        {description && <span className={styles.description}>{description}</span>}
      </span>

      {control}
    </label>
  );
}
