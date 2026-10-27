import { DropdownMenu as RadixMenu } from 'radix-ui';

import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './dropdown-menu-parts';

/**
 * Выпадающее меню:
 * <DropdownMenu.Root><DropdownMenu.Trigger asChild>…</…><DropdownMenu.Content><DropdownMenu.Item>…
 * Порталится в хост AccentScope/ThemeScope, если есть (см. theme/portal-container).
 * Объект собран в .ts-файле из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const DropdownMenu = {
  Root: RadixMenu.Root,
  Trigger: RadixMenu.Trigger,
  Group: RadixMenu.Group,
  RadioGroup: RadixMenu.RadioGroup,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioItem: DropdownMenuRadioItem,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Sub: RadixMenu.Sub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};
