import { useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import { EmojiPicker } from '../emoji-picker/emoji-picker';
import { loadEmojiData } from '../emoji-picker/emoji-load';
import { Popover } from '../popover/popover';
import { useUiStrings } from '../strings/ui-strings-context';

import { DEFAULT_QUICK_REACTIONS } from './reaction-model';
import styles from './reaction-bar.module.css';

export interface ReactionPickerProps {
  /** Триггер — кнопка, получает пропсы через asChild */
  children: ReactElement;
  /** Выбрана реакция — символ эмодзи */
  onSelect: (emoji: string) => void;
  /** Частые реакции быстрым рядом сверху */
  quick?: readonly string[];
  /** Полный пикер под быстрым рядом; `false` — только быстрый ряд */
  full?: boolean;
  /** Ключ localStorage для «Недавних» полного пикера */
  recentStorageKey?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Закрыть после выбора; по умолчанию да */
  closeOnSelect?: boolean;
}

interface QuickRowProps {
  emojis: readonly string[];
  label: string;
  onPick: (emoji: string) => void;
}

/** Быстрый ряд — тулбар: стрелки, Home / End; Tab уходит дальше, в поиск полного пикера */
function QuickRow({ emojis, label, onPick }: QuickRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(0);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = emojis.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? Math.min(focused + 1, last)
        : event.key === 'ArrowLeft'
          ? Math.max(focused - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;

    if (next === null) return;

    event.preventDefault();
    setFocused(next);
    rowRef.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  };

  return (
    <div ref={rowRef} role="toolbar" aria-label={label} className={styles.quick} onKeyDown={move}>
      {emojis.map((emoji, index) => (
        <button
          key={emoji}
          type="button"
          className={styles.quickItem}
          tabIndex={index === focused ? 0 : -1}
          onFocus={() => setFocused(index)}
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/**
 * Выбор реакции: частые быстрым рядом сверху, под ними полный `EmojiPicker` (данные — лениво, при
 * наведении на триггер). Фокус при открытии — на первой частой: одна стрелка и Enter — и реакция стоит.
 */
export function ReactionPicker({
  children,
  onSelect,
  quick = DEFAULT_QUICK_REACTIONS,
  full = true,
  recentStorageKey,
  open,
  defaultOpen,
  onOpenChange,
  side = 'top',
  align = 'start',
  closeOnSelect = true,
}: ReactionPickerProps) {
  const text = useUiStrings().reactionPicker;
  const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false);
  const isOpen = open ?? innerOpen;

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);

    onOpenChange?.(next);
  };

  const pick = (emoji: string) => {
    onSelect(emoji);

    if (closeOnSelect) setOpen(false);
  };

  const preload = full ? () => void loadEmojiData().catch(() => undefined) : undefined;

  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger asChild onPointerEnter={preload} onFocus={preload}>
        {children}
      </Popover.Trigger>

      <Popover.Content
        flush
        side={side}
        align={align}
        aria-label={text.dialog}
        className={styles.picker}
        onEscapeKeyDown={(event) => {
          const target = event.target as HTMLElement | null;

          // Esc в непустом поиске пикера очищает поиск, а не закрывает слой — как у EmojiPickerPopover
          if (
            target instanceof HTMLInputElement &&
            target.dataset.emojiSearch !== undefined &&
            target.value
          ) {
            event.preventDefault();
          }
        }}
      >
        {quick.length > 0 && <QuickRow emojis={quick} label={text.quick} onPick={pick} />}

        {full && (
          <EmojiPicker
            autoFocus={false}
            recentStorageKey={recentStorageKey}
            onSelect={(emoji) => pick(emoji.char)}
          />
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
