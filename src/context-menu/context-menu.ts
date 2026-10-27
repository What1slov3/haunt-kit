import { ContextMenu as RadixMenu } from 'radix-ui';

import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from './context-menu-parts';

/**
 * Контекстное меню по правой кнопке (и долгому нажатию):
 * <ContextMenu.Root><ContextMenu.Trigger asChild><div>…</div></…><ContextMenu.Content>…
 * Стили общие с DropdownMenu (menu/menu.module.css).
 */
export const ContextMenu = {
  Root: RadixMenu.Root,
  Trigger: RadixMenu.Trigger,
  Group: RadixMenu.Group,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  Label: ContextMenuLabel,
  Separator: ContextMenuSeparator,
  Sub: RadixMenu.Sub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};
