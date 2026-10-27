import {
  ToolbarButton,
  ToolbarRoot,
  ToolbarSeparator,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from './toolbar-parts';

/**
 * Панель инструментов (форматирование в композере):
 * <Toolbar.Root aria-label="Форматирование"><Toolbar.ToggleGroup type="multiple"><Toolbar.ToggleItem value="bold"
 * label="Жирный">…</…></…><Toolbar.Separator /><Toolbar.Button label="Ссылка">…</…></Toolbar.Root>
 * Одна остановка Tab на весь ряд, внутри — стрелки, Home / End (roving focus Radix).
 * Объект собран в .ts-файле из-за react-refresh/only-export-components (см. dialog.ts).
 */
export const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  ToggleGroup: ToolbarToggleGroup,
  ToggleItem: ToolbarToggleItem,
  Separator: ToolbarSeparator,
};
