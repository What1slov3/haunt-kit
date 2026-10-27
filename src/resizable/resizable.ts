import { ResizableHandle, ResizablePanel, ResizableRoot } from './resizable-parts';

/**
 * Панели с ручками-разделителями:
 * <Resizable.Root direction="horizontal" onResize={…}>
 *   <Resizable.Panel defaultSize={25} minSize={15} maxSize={40}>…</Resizable.Panel>
 *   <Resizable.Handle aria-label="Ширина списка каналов" />
 *   <Resizable.Panel>…</Resizable.Panel>
 * </Resizable.Root>
 * Panel и Handle — прямые дети Root, по ручке между каждой парой панелей. Размеры — проценты (число,
 * '30%') или пиксели ('240px'); сворачивание — collapsible / collapsedSize; сохранение — autoSaveId.
 * Объект собран в .ts-файле из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const Resizable = {
  Root: ResizableRoot,
  Panel: ResizablePanel,
  Handle: ResizableHandle,
};
