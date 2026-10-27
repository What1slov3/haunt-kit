import { useContext, type ComponentPropsWithRef } from 'react';

import { Toolbar as RadixToolbar } from 'radix-ui';

import { cx } from '../lib/cx';

import { ToolbarSizeContext, type ToolbarSize } from './toolbar-context';
import styles from './toolbar.module.css';

export type ToolbarRootProps = ComponentPropsWithRef<typeof RadixToolbar.Root> & {
  /** 24 / 28 px — та же шкала, что у кнопок и полей рядом */
  size?: ToolbarSize;
  /** Своя рамка вокруг ряда; без неё — голый ряд внутри чужой рамки (композер) */
  framed?: boolean;
};

export function ToolbarRoot({ size = 'md', framed, className, ...rest }: ToolbarRootProps) {
  return (
    <ToolbarSizeContext.Provider value={size}>
      <RadixToolbar.Root
        className={cx(styles.root, styles[size], framed && styles.framed, className)}
        {...rest}
      />
    </ToolbarSizeContext.Provider>
  );
}

export type ToolbarButtonProps = ComponentPropsWithRef<typeof RadixToolbar.Button> & {
  /** Только иконка: квадратная кнопка, подпись — для скринридера */
  label?: string;
};

export function ToolbarButton({ label, className, ...rest }: ToolbarButtonProps) {
  const size = useContext(ToolbarSizeContext);

  return (
    <RadixToolbar.Button
      aria-label={label}
      className={cx(styles.item, styles[`item-${size}`], label && styles.iconOnly, className)}
      {...rest}
    />
  );
}

export type ToolbarToggleGroupProps = ComponentPropsWithRef<typeof RadixToolbar.ToggleGroup>;

export function ToolbarToggleGroup({ className, ...rest }: ToolbarToggleGroupProps) {
  // Radix ставит группе role=toolbar — вложенная панель в панели; для скринридера это группа
  return (
    <RadixToolbar.ToggleGroup role="group" className={cx(styles.group, className)} {...rest} />
  );
}

export type ToolbarToggleItemProps = ComponentPropsWithRef<typeof RadixToolbar.ToggleItem> & {
  /** Только иконка: квадратная кнопка, подпись — для скринридера */
  label?: string;
};

export function ToolbarToggleItem({ label, className, ...rest }: ToolbarToggleItemProps) {
  const size = useContext(ToolbarSizeContext);

  return (
    <RadixToolbar.ToggleItem
      aria-label={label}
      className={cx(styles.item, styles[`item-${size}`], label && styles.iconOnly, className)}
      {...rest}
    />
  );
}

export function ToolbarSeparator({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixToolbar.Separator>) {
  return <RadixToolbar.Separator className={cx(styles.separator, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
ToolbarRoot.displayName = 'Toolbar.Root';
ToolbarButton.displayName = 'Toolbar.Button';
ToolbarToggleGroup.displayName = 'Toolbar.ToggleGroup';
ToolbarToggleItem.displayName = 'Toolbar.ToggleItem';
ToolbarSeparator.displayName = 'Toolbar.Separator';
