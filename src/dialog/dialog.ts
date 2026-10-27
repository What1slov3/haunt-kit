import { Dialog as RadixDialog } from 'radix-ui';

import { DialogContent, DialogDescription, DialogFooter, DialogTitle } from './dialog-parts';

/**
 * Модальный диалог:
 * <Dialog.Root><Dialog.Trigger asChild>…</…><Dialog.Content><Dialog.Title>…</…></Dialog.Content></Dialog.Root>
 * Title обязателен для скринридера; если его не надо показывать — оберните в VisuallyHidden из radix-ui.
 * Без Description передайте aria-describedby={undefined} в Content.
 *
 * Объект собран в .ts-файле, а части — в .tsx: иначе react-refresh/only-export-components ругается на
 * файл, где компоненты есть, но экспортируется только объект.
 */
export const Dialog = {
  Root: RadixDialog.Root,
  Trigger: RadixDialog.Trigger,
  Close: RadixDialog.Close,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Footer: DialogFooter,
};
