import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Check, ChevronRight } from 'lucide-react';
import { ContextMenu as RadixMenu } from 'radix-ui';

import { Icon } from '../icon/icon';
import { Kbd } from '../kbd/kbd';
import { cx } from '../lib/cx';
import styles from '../menu/menu.module.css';
import { usePortalContainer } from '../theme/portal-container';

export type ContextMenuContentProps = ComponentPropsWithRef<typeof RadixMenu.Content>;

export function ContextMenuContent({
  collisionPadding = 8,
  className,
  children,
  ...rest
}: ContextMenuContentProps) {
  const container = usePortalContainer();

  return (
    <RadixMenu.Portal container={container}>
      <RadixMenu.Content
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

export function ContextMenuSubContent({
  sideOffset = 2,
  collisionPadding = 8,
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.SubContent>) {
  const container = usePortalContainer();

  return (
    <RadixMenu.Portal container={container}>
      <RadixMenu.SubContent
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixMenu.Portal>
  );
}

export type ContextMenuItemProps = ComponentPropsWithRef<typeof RadixMenu.Item> & {
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
};

export function ContextMenuItem({
  icon,
  shortcut,
  danger,
  className,
  children,
  ...rest
}: ContextMenuItemProps) {
  return (
    <RadixMenu.Item className={cx(styles.item, danger && styles.danger, className)} {...rest}>
      {icon && <span className={styles.icon}>{icon}</span>}

      <span className={styles.label}>{children}</span>

      {shortcut && (
        <Kbd size="sm" className={styles.shortcut}>
          {shortcut}
        </Kbd>
      )}
    </RadixMenu.Item>
  );
}

export function ContextMenuSubTrigger({
  icon,
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.SubTrigger> & { icon?: ReactNode }) {
  return (
    <RadixMenu.SubTrigger className={cx(styles.item, className)} {...rest}>
      {icon && <span className={styles.icon}>{icon}</span>}

      <span className={styles.label}>{children}</span>

      <Icon icon={ChevronRight} size="sm" className={styles.chevron} />
    </RadixMenu.SubTrigger>
  );
}

export function ContextMenuCheckboxItem({
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.CheckboxItem>) {
  return (
    <RadixMenu.CheckboxItem className={cx(styles.item, className)} {...rest}>
      <span className={styles.icon}>
        <RadixMenu.ItemIndicator>
          <Icon icon={Check} size="sm" />
        </RadixMenu.ItemIndicator>
      </span>

      <span className={styles.label}>{children}</span>
    </RadixMenu.CheckboxItem>
  );
}

export function ContextMenuLabel({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.Label>) {
  return <RadixMenu.Label className={cx(styles.groupLabel, className)} {...rest} />;
}

export function ContextMenuSeparator({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cx(styles.separator, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
ContextMenuContent.displayName = 'ContextMenu.Content';
ContextMenuSubContent.displayName = 'ContextMenu.SubContent';
ContextMenuItem.displayName = 'ContextMenu.Item';
ContextMenuSubTrigger.displayName = 'ContextMenu.SubTrigger';
ContextMenuCheckboxItem.displayName = 'ContextMenu.CheckboxItem';
ContextMenuLabel.displayName = 'ContextMenu.Label';
ContextMenuSeparator.displayName = 'ContextMenu.Separator';
