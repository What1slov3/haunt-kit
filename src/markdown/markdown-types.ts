import type { HTMLAttributes, MouseEvent } from 'react';

import type { MentionProps } from '../mention/mention';

/*
 * Типы отдельным модулем без зависимостей: их читают и лёгкий `Markdown` (в стартовом чанке), и ленивый
 * рендер. Импорт типов из markdown-view.tsx в лёгкий модуль стёрся бы, но так граница видна глазом.
 */

/** `@` — ник или роль (решает резолвер, вернув `kind: 'role'`), `#` — канал */
export type MarkdownMentionKind = 'user' | 'channel';

/** Что вернул резолвер: пропсы `Mention` и подпись вместо имени из текста (отображаемое имя) */
export interface MarkdownMentionProps extends Omit<MentionProps, 'children'> {
  label?: string;
}

/** Неизвестное (`null` / `undefined`) остаётся текстом `@ник` */
export type MentionResolver = (
  kind: MarkdownMentionKind,
  name: string,
) => MarkdownMentionProps | null | undefined;

export interface MarkdownProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Исходный текст сообщения */
  children: string;
  /** Без блоков — одной строкой в `<span>`: превью ответа, уведомление, последняя строка канала */
  inline?: boolean;
  /** Упоминания `@ник`, `#канал`, `@роль` → `Mention`; без резолвера они остаются текстом */
  resolveMention?: MentionResolver;
  /** Клик по ссылке — до перехода; `event.preventDefault()` оставляет на странице (свой роутер, предупреждение) */
  onLinkClick?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Словарь шорткодов без двоеточий: `{ smile: '😄' }`; без него `:smile:` остаётся текстом */
  emoji?: Readonly<Record<string, string>>;
}
