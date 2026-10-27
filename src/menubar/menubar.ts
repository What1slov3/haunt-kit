import { Menubar as RadixMenubar } from 'radix-ui';

import {
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarRadioItem,
  MenubarRoot,
  MenubarSeparator,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from './menubar-parts';

/**
 * Меню окна (десктоп, Tauri): <Menubar.Root><Menubar.Menu><Menubar.Trigger>Файл</…><Menubar.Content>
 * <Menubar.Item shortcut="mod+s">… Пункты и стили — общие с DropdownMenu (menu/menu.module.css).
 * Стрелки ходят между меню (Radix), Alt / F10 — вход в полосу и обратно. Объект собран в .ts-файле
 * из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const Menubar = {
  Root: MenubarRoot,
  Menu: RadixMenubar.Menu,
  Trigger: MenubarTrigger,
  Content: MenubarContent,
  Group: RadixMenubar.Group,
  RadioGroup: RadixMenubar.RadioGroup,
  Item: MenubarItem,
  CheckboxItem: MenubarCheckboxItem,
  RadioItem: MenubarRadioItem,
  Label: MenubarLabel,
  Separator: MenubarSeparator,
  Sub: RadixMenubar.Sub,
  SubTrigger: MenubarSubTrigger,
  SubContent: MenubarSubContent,
};
