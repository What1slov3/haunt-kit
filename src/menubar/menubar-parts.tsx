import { useRef, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Check, ChevronRight, Dot } from 'lucide-react';
import { Menubar as RadixMenubar } from 'radix-ui';

import { Icon } from '../icon/icon';
import { Kbd } from '../kbd/kbd';
import { cx } from '../lib/cx';
import { formatHotkey } from '../lib/hotkey';
import menu from '../menu/menu.module.css';
import { usePortalContainer } from '../theme/portal-container';

import styles from './menubar.module.css';
import { useMenubarAlt } from './use-menubar-alt';

export type MenubarRootProps = ComponentPropsWithRef<typeof RadixMenubar.Root> & {
  /** Alt и F10 переводят фокус в полосу и обратно, как в системном меню окна; по умолчанию да */
  altFocus?: boolean;
};

export function MenubarRoot({ altFocus = true, className, ref, ...rest }: MenubarRootProps) {
  const root = useRef<HTMLDivElement | null>(null);

  useMenubarAlt(root, altFocus);

  return (
    <RadixMenubar.Root
      ref={(node) => {
        root.current = node;

        if (typeof ref === 'function') return ref(node);

        if (ref) ref.current = node;
      }}
      className={cx(styles.root, className)}
      {...rest}
    />
  );
}

export function MenubarTrigger({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.Trigger>) {
  return <RadixMenubar.Trigger className={cx(styles.trigger, className)} {...rest} />;
}

export function MenubarContent({
  align = 'start',
  sideOffset = 2,
  alignOffset = 0,
  collisionPadding = 8,
  className,
  onFocusOutside,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.Content>) {
  const container = usePortalContainer();

  return (
    <RadixMenubar.Portal container={container}>
      <RadixMenubar.Content
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className={cx(menu.content, styles.content, className)}
        onFocusOutside={(event) => {
          onFocusOutside?.(event);

          /*
           * ←/→ из открытого меню открывают соседнее, а это меню ещё доигрывает анимацию ухода и живо.
           * Фокус, ушедший в соседнее меню, оно приняло бы за уход наружу и закрыло бы всю полосу —
           * вместе с только что открытым соседом. Без анимации (голый Radix) этой гонки нет.
           */
          if (
            event.target instanceof Element &&
            event.target.closest('[data-radix-menubar-content]')
          ) {
            event.preventDefault();
          }
        }}
        {...rest}
      />
    </RadixMenubar.Portal>
  );
}

export function MenubarSubContent({
  sideOffset = 2,
  alignOffset = -5,
  collisionPadding = 8,
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.SubContent>) {
  const container = usePortalContainer();

  return (
    <RadixMenubar.Portal container={container}>
      <RadixMenubar.SubContent
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className={cx(menu.content, styles.content, className)}
        {...rest}
      />
    </RadixMenubar.Portal>
  );
}

/** Сочетание справа от пункта: `'mod+s'` → «Ctrl+S» / «⌘S». Только подпись — клавиши слушает экран */
function Shortcut({ combo }: { combo?: string }) {
  if (!combo) return null;

  return (
    <Kbd size="sm" className={menu.shortcut}>
      {formatHotkey(combo)}
    </Kbd>
  );
}

export type MenubarItemProps = ComponentPropsWithRef<typeof RadixMenubar.Item> & {
  icon?: ReactNode;
  /** Сочетание в записи `lib/hotkey`: `'mod+s'`, `'mod+shift+n'`, `'f11'` */
  shortcut?: string;
  /** Красный пункт — удалить, выйти */
  danger?: boolean;
};

export function MenubarItem({
  icon,
  shortcut,
  danger,
  className,
  children,
  ...rest
}: MenubarItemProps) {
  return (
    <RadixMenubar.Item className={cx(menu.item, danger && menu.danger, className)} {...rest}>
      <span className={menu.icon}>{icon}</span>

      <span className={menu.label}>{children}</span>

      <Shortcut combo={shortcut} />
    </RadixMenubar.Item>
  );
}

export function MenubarCheckboxItem({
  shortcut,
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.CheckboxItem> & { shortcut?: string }) {
  return (
    <RadixMenubar.CheckboxItem className={cx(menu.item, className)} {...rest}>
      <span className={menu.icon}>
        <RadixMenubar.ItemIndicator>
          <Icon icon={Check} size="sm" />
        </RadixMenubar.ItemIndicator>
      </span>

      <span className={menu.label}>{children}</span>

      <Shortcut combo={shortcut} />
    </RadixMenubar.CheckboxItem>
  );
}

export function MenubarRadioItem({
  shortcut,
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.RadioItem> & { shortcut?: string }) {
  return (
    <RadixMenubar.RadioItem className={cx(menu.item, className)} {...rest}>
      <span className={menu.icon}>
        <RadixMenubar.ItemIndicator>
          {/* Точка, а не галочка: радио — один из группы, флажок — включено ли */}
          <Icon icon={Dot} size="sm" className={styles.radioDot} />
        </RadixMenubar.ItemIndicator>
      </span>

      <span className={menu.label}>{children}</span>

      <Shortcut combo={shortcut} />
    </RadixMenubar.RadioItem>
  );
}

export function MenubarSubTrigger({
  icon,
  className,
  children,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.SubTrigger> & { icon?: ReactNode }) {
  return (
    <RadixMenubar.SubTrigger className={cx(menu.item, className)} {...rest}>
      <span className={menu.icon}>{icon}</span>

      <span className={menu.label}>{children}</span>

      <Icon icon={ChevronRight} size="sm" className={menu.chevron} />
    </RadixMenubar.SubTrigger>
  );
}

export function MenubarLabel({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.Label>) {
  return <RadixMenubar.Label className={cx(menu.groupLabel, className)} {...rest} />;
}

export function MenubarSeparator({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixMenubar.Separator>) {
  return <RadixMenubar.Separator className={cx(menu.separator, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
MenubarRoot.displayName = 'Menubar.Root';
MenubarTrigger.displayName = 'Menubar.Trigger';
MenubarContent.displayName = 'Menubar.Content';
MenubarSubContent.displayName = 'Menubar.SubContent';
MenubarItem.displayName = 'Menubar.Item';
MenubarCheckboxItem.displayName = 'Menubar.CheckboxItem';
MenubarRadioItem.displayName = 'Menubar.RadioItem';
MenubarSubTrigger.displayName = 'Menubar.SubTrigger';
MenubarLabel.displayName = 'Menubar.Label';
MenubarSeparator.displayName = 'Menubar.Separator';
