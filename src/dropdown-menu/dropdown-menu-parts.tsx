import {
  cloneElement,
  isValidElement,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';

import { Check, ChevronRight } from 'lucide-react';
import { DropdownMenu as RadixMenu } from 'radix-ui';

import { Icon } from '../icon/icon';
import { Kbd } from '../kbd/kbd';
import { cx } from '../lib/cx';
import styles from '../menu/menu.module.css';
import { usePortalContainer } from '../theme/portal-container';

export type DropdownMenuContentProps = ComponentPropsWithRef<typeof RadixMenu.Content>;

export function DropdownMenuContent({
  sideOffset = 4,
  collisionPadding = 8,
  className,
  children,
  ...rest
}: DropdownMenuContentProps) {
  const container = usePortalContainer();

  return (
    <RadixMenu.Portal container={container}>
      <RadixMenu.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

export function DropdownMenuSubContent({
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

export type DropdownMenuItemProps = ComponentPropsWithRef<typeof RadixMenu.Item> & {
  icon?: ReactNode;
  /** Подсказка-шорткат справа, например «Ctrl+K» */
  shortcut?: string;
  /** Красный пункт — удалить, выйти */
  danger?: boolean;
};

/**
 * С `asChild` пункт — сам ребёнок (`<a href>`): иконка, подпись и шорткат переезжают внутрь него. Так
 * пункт-ссылка остаётся настоящей ссылкой — Ctrl/⌘-клик открывает новую вкладку, а Slot Radix требует
 * одного ребёнка и не принял бы иконку рядом с ним.
 */
export function DropdownMenuItem({
  icon,
  shortcut,
  danger,
  asChild,
  className,
  children,
  ...rest
}: DropdownMenuItemProps) {
  const layout = (label: ReactNode) => (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}

      <span className={styles.label}>{label}</span>

      {shortcut && (
        <Kbd size="sm" className={styles.shortcut}>
          {shortcut}
        </Kbd>
      )}
    </>
  );

  if (asChild && isValidElement<{ children?: ReactNode }>(children)) {
    const child = children as ReactElement<{ children?: ReactNode }>;

    return (
      <RadixMenu.Item
        asChild
        className={cx(styles.item, danger && styles.danger, className)}
        {...rest}
      >
        {cloneElement(child, undefined, layout(child.props.children))}
      </RadixMenu.Item>
    );
  }

  return (
    <RadixMenu.Item className={cx(styles.item, danger && styles.danger, className)} {...rest}>
      {layout(children)}
    </RadixMenu.Item>
  );
}

export function DropdownMenuSubTrigger({
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

export function DropdownMenuCheckboxItem({
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

export function DropdownMenuRadioItem({
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.RadioItem>) {
  return (
    <RadixMenu.RadioItem className={cx(styles.item, className)} {...rest}>
      <span className={styles.icon}>
        <RadixMenu.ItemIndicator>
          <Icon icon={Check} size="sm" />
        </RadixMenu.ItemIndicator>
      </span>

      <span className={styles.label}>{children}</span>
    </RadixMenu.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.Label>) {
  return <RadixMenu.Label className={cx(styles.groupLabel, className)} {...rest} />;
}

export function DropdownMenuSeparator({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cx(styles.separator, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
DropdownMenuContent.displayName = 'DropdownMenu.Content';
DropdownMenuSubContent.displayName = 'DropdownMenu.SubContent';
DropdownMenuItem.displayName = 'DropdownMenu.Item';
DropdownMenuSubTrigger.displayName = 'DropdownMenu.SubTrigger';
DropdownMenuCheckboxItem.displayName = 'DropdownMenu.CheckboxItem';
DropdownMenuRadioItem.displayName = 'DropdownMenu.RadioItem';
DropdownMenuLabel.displayName = 'DropdownMenu.Label';
DropdownMenuSeparator.displayName = 'DropdownMenu.Separator';
