import { TabsContent, TabsList, TabsRoot, TabsTrigger } from './tabs-parts';

/**
 * Вкладки: `line` — подчёркивание (навигация), `segment` — компактный сегмент. Индикатор плавно
 * переезжает между пунктами (layoutId в Motion). Без defaultValue ни одна вкладка не активна.
 * <Tabs.Root defaultValue="a"><Tabs.List><Tabs.Trigger value="a">…</Tabs.List><Tabs.Content value="a">…
 * Объект собран в .ts-файле из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
