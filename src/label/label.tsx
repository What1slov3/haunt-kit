import type { ComponentPropsWithRef } from 'react';

import { Label as RadixLabel } from 'radix-ui';

import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './label.module.css';

export interface LabelProps extends ComponentPropsWithRef<typeof RadixLabel.Root> {
  /** Звёздочка после текста */
  required?: boolean;
  /** Пометка `[опц.]` — когда обязательных полей в форме большинство */
  optional?: boolean;
}

/** Метка контрола: клик по ней фокусирует поле (htmlFor), выделение текста двойным кликом отключено */
export function Label({ required, optional, className, children, ...rest }: LabelProps) {
  const strings = useUiStrings();

  return (
    <RadixLabel.Root className={cx(styles.label, className)} {...rest}>
      {children}

      {required && (
        <span className={styles.required} aria-hidden>
          *
        </span>
      )}

      {optional && !required && <span className={styles.optional}>{strings.label.optional}</span>}
    </RadixLabel.Root>
  );
}
