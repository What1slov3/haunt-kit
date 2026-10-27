import { Dialog as RadixDialog } from 'radix-ui';

import {
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './sheet-parts';

/**
 * Боковая панель:
 * <Sheet.Root><Sheet.Trigger asChild>…</…><Sheet.Content side="right">
 *   <Sheet.Header><Sheet.Title>…</…><Sheet.Description>…</…></Sheet.Header>
 *   <Sheet.Body>…</Sheet.Body><Sheet.Footer>…</Sheet.Footer>
 * </Sheet.Content></Sheet.Root>
 * Title обязателен для скринридера; без Description — aria-describedby={undefined} в Content.
 * Объект собран в .ts-файле из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const Sheet = {
  Root: RadixDialog.Root,
  Trigger: RadixDialog.Trigger,
  Close: RadixDialog.Close,
  Content: SheetContent,
  Header: SheetHeader,
  Title: SheetTitle,
  Description: SheetDescription,
  Body: SheetBody,
  Footer: SheetFooter,
};
