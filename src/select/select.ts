import { Select as RadixSelect } from 'radix-ui';

import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from './select-parts';

/**
 * Выпадающий список с одним значением:
 * <Select.Root value onValueChange><Select.Trigger placeholder="…" /><Select.Content><Select.Item value="a">…
 * Для поиска и множественного выбора нужен другой примитив (combobox) — его в Radix нет.
 */
export const Select = {
  Root: RadixSelect.Root,
  Trigger: SelectTrigger,
  Value: RadixSelect.Value,
  Content: SelectContent,
  Item: SelectItem,
  Group: RadixSelect.Group,
  Label: SelectLabel,
  Separator: SelectSeparator,
};
