import { ToggleGroupItem, ToggleGroupRoot } from './toggle-group-parts';

/**
 * Группа переключателей (один или несколько активных):
 * <ToggleGroup.Root type="single" value onValueChange><ToggleGroup.Item value="a">…
 * Компактный сегмент для режимов отображения; для навигации по содержимому — Tabs.
 */
export const ToggleGroup = {
  Root: ToggleGroupRoot,
  Item: ToggleGroupItem,
};
