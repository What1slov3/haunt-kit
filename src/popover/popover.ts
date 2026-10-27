import { Popover as RadixPopover } from 'radix-ui';

import { PopoverContent } from './popover-parts';

/**
 * Поповер — произвольное содержимое у триггера:
 * <Popover.Root><Popover.Trigger asChild>…</…><Popover.Content>…</Popover.Content></Popover.Root>
 * Объект собран в .ts-файле из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const Popover = {
  Root: RadixPopover.Root,
  Trigger: RadixPopover.Trigger,
  Anchor: RadixPopover.Anchor,
  Close: RadixPopover.Close,
  Content: PopoverContent,
};
