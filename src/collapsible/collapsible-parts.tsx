import type { ComponentPropsWithRef } from 'react';

import { ChevronRight } from 'lucide-react';
import { Collapsible as RadixCollapsible } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './collapsible.module.css';

export type CollapsibleTriggerProps = ComponentPropsWithRef<typeof RadixCollapsible.Trigger> & {
  /** Заголовок категории: моно-капитель с шевроном, как в списке каналов */
  category?: boolean;
};

export function CollapsibleTrigger({
  category,
  className,
  children,
  ...rest
}: CollapsibleTriggerProps) {
  if (!category) {
    return (
      <RadixCollapsible.Trigger className={className} {...rest}>
        {children}
      </RadixCollapsible.Trigger>
    );
  }

  return (
    <RadixCollapsible.Trigger className={cx(styles.category, className)} {...rest}>
      <Icon icon={ChevronRight} size="xs" className={styles.chevron} />

      <span className={styles.categoryLabel}>{children}</span>
    </RadixCollapsible.Trigger>
  );
}

export function CollapsibleContent({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixCollapsible.Content>) {
  return <RadixCollapsible.Content className={cx(styles.content, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
CollapsibleTrigger.displayName = 'Collapsible.Trigger';
CollapsibleContent.displayName = 'Collapsible.Content';
