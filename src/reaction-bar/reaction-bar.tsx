import { useLayoutEffect, useState, type ComponentPropsWithRef } from 'react';

import { SmilePlus } from 'lucide-react';

import { Chip } from '../chip/chip';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import type { ReactionItem } from './reaction-model';
import { ReactionPicker } from './reaction-picker';
import styles from './reaction-bar.module.css';

export type { ReactionItem } from './reaction-model';

export interface ReactionBarProps extends Omit<ComponentPropsWithRef<'div'>, 'onToggle'> {
  reactions: readonly ReactionItem[];
  /** Нажали на реакцию: `mine` — новое состояние «моя» */
  onToggle?: (emoji: string, mine: boolean) => void;
  /** Выбрали в пикере реакцию, которой ещё нет; без обработчика кнопки «+» нет */
  onAdd?: (emoji: string) => void;
  /** Частые реакции быстрым рядом в пикере */
  quick?: readonly string[];
  /** Ключ localStorage для «Недавних» пикера */
  recentStorageKey?: string;
  /** Сколько имён в подсказке «кто поставил»; остальные — «и ещё N» */
  namesLimit?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Подпись группы для скринридера */
  label?: string;
  addLabel?: string;
}

const emojiKey = (reactions: readonly ReactionItem[]) =>
  reactions.map((reaction) => reaction.emoji).join('\u0000');

function Glyph({ reaction }: { reaction: ReactionItem }) {
  if (reaction.imageSrc) return <img src={reaction.imageSrc} alt="" className={styles.custom} />;

  return <span className={styles.emoji}>{reaction.emoji}</span>;
}

/**
 * Реакции под сообщением: чип со счётчиком, своя — выбранным тоном; при добавлении — «поп» и всплеск
 * `Chip` (и у новой реакции тоже). Подсказка «кто поставил» — `Tooltip`: открывается и наведением, и
 * фокусом. «+» открывает `ReactionPicker` — частые быстрым рядом и полный пикер. Реакция, выбранная в
 * пикере повторно, не дублируется: чужая становится своей, своя остаётся. Данные и запросы — у экрана
 * (`toggleReaction` — для оптимистичного обновления).
 */
export function ReactionBar({
  reactions,
  onToggle,
  onAdd,
  quick,
  recentStorageKey,
  namesLimit = 6,
  size = 'md',
  disabled,
  label,
  addLabel,
  className,
  ...rest
}: ReactionBarProps) {
  const text = useUiStrings().reactionBar;
  const key = emojiKey(reactions);
  const [known, setKnown] = useState(key);
  const knownSet = new Set(known.split('\u0000'));

  /*
   * Новая своя реакция появляется сразу выбранной, а всплеск Chip — на смену selected false → true.
   * Первый рендер новой — невыбранной, второй, до отрисовки (layout-эффект), — выбранной: глаз видит
   * только всплеск, тот же, что при нажатии.
   */
  useLayoutEffect(() => {
    if (known !== key) setKnown(key);
  }, [known, key]);

  const select = (emoji: string) => {
    const existing = reactions.find((reaction) => reaction.emoji === emoji);

    if (existing?.mine) return;

    if (existing) onToggle?.(emoji, true);
    else onAdd?.(emoji);
  };

  const who = (reaction: ReactionItem) => {
    const names = reaction.users ?? [];

    if (names.length === 0) return reaction.name ?? reaction.emoji;

    const shown = names.slice(0, namesLimit);

    return text.who(shown.join(', '), Math.max(0, reaction.count - shown.length));
  };

  return (
    <div
      role="group"
      aria-label={label ?? text.label}
      className={cx(styles.bar, className)}
      {...rest}
    >
      {reactions.map((reaction) => {
        const mine = Boolean(reaction.mine);
        const fresh = mine && !knownSet.has(reaction.emoji);

        return (
          <Tooltip
            key={reaction.emoji}
            content={
              <span className={styles.who}>
                <Glyph reaction={reaction} />
                {who(reaction)}
              </span>
            }
          >
            <Chip
              size={size}
              selected={fresh ? false : mine}
              count={reaction.count}
              icon={<Glyph reaction={reaction} />}
              aria-label={text.reaction(reaction.name ?? reaction.emoji, reaction.count, mine)}
              disabled={disabled}
              onClick={() => onToggle?.(reaction.emoji, !mine)}
            />
          </Tooltip>
        );
      })}

      {onAdd && !disabled && (
        <ReactionPicker quick={quick} recentStorageKey={recentStorageKey} onSelect={select}>
          <IconButton
            label={addLabel ?? text.add}
            size={size === 'sm' ? 'xs' : 'sm'}
            variant="ghost"
            className={styles.add}
          >
            <Icon icon={SmilePlus} size={size === 'sm' ? 'xs' : 'sm'} />
          </IconButton>
        </ReactionPicker>
      )}
    </div>
  );
}
