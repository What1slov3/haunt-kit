import type { ComponentPropsWithRef } from 'react';

import { ChevronRight } from 'lucide-react';
import { Accordion as RadixAccordion } from 'radix-ui';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './accordion.module.css';

export function AccordionRoot({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixAccordion.Root>) {
  return <RadixAccordion.Root className={cx(styles.root, className)} {...rest} />;
}

export function AccordionItem({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixAccordion.Item>) {
  return <RadixAccordion.Item className={cx(styles.item, className)} {...rest} />;
}

/** Триггер обёрнут в Header (h3) — так требует разметка аккордеона для скринридера */
export function AccordionTrigger({
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixAccordion.Trigger>) {
  return (
    <RadixAccordion.Header className={styles.header}>
      <RadixAccordion.Trigger className={cx(styles.trigger, className)} {...rest}>
        {/* Шеврон слева, как у Fumadocs: глаз идёт по левому краю списка вопросов */}
        <Icon icon={ChevronRight} size="sm" className={styles.chevron} />

        <span className={styles.label}>{children}</span>
      </RadixAccordion.Trigger>
    </RadixAccordion.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixAccordion.Content>) {
  return (
    <RadixAccordion.Content className={cx(styles.content, className)} {...rest}>
      <div className={styles.inner}>{children}</div>
    </RadixAccordion.Content>
  );
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
AccordionRoot.displayName = 'Accordion.Root';
AccordionItem.displayName = 'Accordion.Item';
AccordionTrigger.displayName = 'Accordion.Trigger';
AccordionContent.displayName = 'Accordion.Content';
