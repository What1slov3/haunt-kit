import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { cx } from '../lib/cx';

import styles from './mention.module.css';

export type MentionKind = 'user' | 'channel' | 'role';

export interface MentionProps extends Omit<ComponentPropsWithRef<'button'>, 'color'> {
  /** user и role — `@`, channel — `#` */
  kind?: MentionKind;
  /** Ник, имя канала или роли — без префикса */
  children: string;
  /**
   * Цвет роли — данные сообщества (любой CSS-цвет), а не токен: из него выводятся фон и текст с тем же
   * контрастом, что у акцента. Без цвета — тон акцента пространства
   */
  color?: string;
  /** Упоминание текущего пользователя — плашка ярче, как в Discord */
  self?: boolean;
}

const prefix: Record<MentionKind, string> = { user: '@', channel: '#', role: '@' };

/**
 * Инлайн-плашка упоминания в тексте сообщения: `@ник`, `#канал`, `@роль`. Кнопка: фокусируется,
 * открывается кликом и с клавиатуры. Карточка профиля при наведении — обернуть в `ProfileHoverCard`, своё
 * содержимое — в `HoverCard.Trigger asChild` (ref и пропсы доходят до кнопки); то же содержимое должно
 * открываться и по `onClick`.
 */
export function Mention({
  kind = 'user',
  color,
  self,
  className,
  style,
  children,
  ...rest
}: MentionProps) {
  return (
    <button
      type="button"
      className={cx(styles.mention, color && styles.colored, className)}
      data-kind={kind}
      data-self={self || undefined}
      style={color ? ({ ...style, '--mention-color': color } as CSSProperties) : style}
      {...rest}
    >
      <span className={styles.prefix}>{prefix[kind]}</span>

      {children}
    </button>
  );
}
