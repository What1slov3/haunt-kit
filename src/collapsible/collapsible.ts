import { Collapsible as RadixCollapsible } from 'radix-ui';

import { CollapsibleContent, CollapsibleTrigger } from './collapsible-parts';

/**
 * Сворачиваемый блок — категория каналов:
 * <Collapsible.Root defaultOpen><Collapsible.Trigger category>Текстовые</…><Collapsible.Content>…
 * Высота анимируется по --radix-collapsible-content-height (animations.css).
 */
export const Collapsible = {
  Root: RadixCollapsible.Root,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};
