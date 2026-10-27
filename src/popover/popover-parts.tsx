import type { ComponentPropsWithRef } from 'react';

import { Popover as RadixPopover } from 'radix-ui';

import { cx } from '../lib/cx';
import { usePortalContainer } from '../theme/portal-container';

import styles from './popover.module.css';

export type PopoverContentProps = ComponentPropsWithRef<typeof RadixPopover.Content> & {
  /** Без внутренних отступов — когда внутри своя раскладка (пикер эмодзи) */
  flush?: boolean;
};

export function PopoverContent({
  flush,
  sideOffset = 6,
  collisionPadding = 8,
  className,
  children,
  ...rest
}: PopoverContentProps) {
  const container = usePortalContainer();

  return (
    <RadixPopover.Portal container={container}>
      <RadixPopover.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, flush && styles.flush, className)}
        {...rest}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
PopoverContent.displayName = 'Popover.Content';
