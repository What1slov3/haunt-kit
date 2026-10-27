import { HoverCard as RadixHoverCard } from 'radix-ui';

import { HoverCardContent } from './hover-card-parts';

/**
 * Карточка по наведению — примитив: стекло у триггера с задержками появления и ухода, содержимое любое
 * (превью ссылки, канала, термина). Готовая карточка профиля на нём — `ProfileHoverCard`.
 * <HoverCard.Root><HoverCard.Trigger asChild>…</…><HoverCard.Content>…</HoverCard.Content></HoverCard.Root>
 * Только для мыши: с клавиатуры и на тач-экране не открывается (так устроен Radix), поэтому
 * то же содержимое должно быть доступно иначе — кликом.
 */
export const HoverCard = {
  Root: RadixHoverCard.Root,
  Trigger: RadixHoverCard.Trigger,
  Content: HoverCardContent,
};
