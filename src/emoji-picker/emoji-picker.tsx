import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import {
  Apple,
  Clock,
  Flag,
  Hand,
  Heart,
  Lightbulb,
  PawPrint,
  Plane,
  Search,
  Smile,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Input } from '../input/input';
import { cx } from '../lib/cx';
import { Popover } from '../popover/popover';
import { Skeleton } from '../skeleton/skeleton';
import { useUiStrings } from '../strings/ui-strings-context';

import { loadEmojiData, readRecent, rememberRecent } from './emoji-load';
import { activeSectionIndex, moveInGrid, searchEmoji, type GridKey } from './emoji-search';
import type { EmojiCategory, EmojiCategoryId, EmojiItem } from './emoji-types';

import styles from './emoji-picker.module.css';

export interface EmojiPickerProps extends Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {
  /** Выбран эмодзи — кликом, Enter или пробелом */
  onSelect: (emoji: EmojiItem) => void;
  /** Ключ localStorage для «Недавних»; без него они живут в памяти вкладки */
  recentStorageKey?: string;
  /** Сколько эмодзи держать в «Недавних» */
  recentLimit?: number;
  /** Столбцов в сетке */
  columns?: number;
  /** Фокус в поиск при появлении; по умолчанию есть */
  autoFocus?: boolean;
}

type SectionId = EmojiCategoryId | 'recent' | 'search';

interface Section {
  id: SectionId;
  label: string;
  emojis: EmojiItem[];
}

const categoryIcons: Record<SectionId, LucideIcon> = {
  recent: Clock,
  search: Search,
  smileys: Smile,
  people: Hand,
  nature: PawPrint,
  food: Apple,
  activities: Trophy,
  travel: Plane,
  objects: Lightbulb,
  symbols: Heart,
  flags: Flag,
};

const GRID_KEYS = new Set<string>([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function useEmojiData() {
  const [categories, setCategories] = useState<EmojiCategory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;

    loadEmojiData().then(
      (data) => alive && setCategories(data),
      () => alive && setFailed(true),
    );

    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((value) => value + 1);
  };

  return { categories, failed, retry };
}

/**
 * Выбор эмодзи: поиск по русским и английским словам, «Недавние», вкладки разделов с прокруткой к разделу,
 * сетка со стрелками (Enter — выбрать, вверх из первого ряда — в поиск, буква — в поиск), предпросмотр
 * внизу. Набор грузится лениво при первом показе. В поповере — `EmojiPickerPopover`.
 */
export function EmojiPicker({
  onSelect,
  recentStorageKey,
  recentLimit = 24,
  columns = 8,
  autoFocus = true,
  className,
  style,
  ...rest
}: EmojiPickerProps) {
  const text = useUiStrings().emojiPicker;
  const { categories, failed, retry } = useEmojiData();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(() => readRecent(recentStorageKey));
  const [focusIndex, setFocusIndex] = useState(0);
  const [preview, setPreview] = useState<EmojiItem | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<SectionId, HTMLElement>());
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingScroll = useRef<SectionId | null>(null);
  const id = useId();

  // Разделы без поиска — они же вкладки; при поиске сетка — один раздел результатов
  const browse = useMemo<Section[]>(() => {
    if (!categories) return [];

    const byChar = new Map(categories.flatMap((c) => c.emojis.map((e) => [e.char, e] as const)));
    const recentItems = recent.flatMap((char) => byChar.get(char) ?? []);

    return [
      ...(recentItems.length
        ? [{ id: 'recent' as const, label: text.recent, emojis: recentItems }]
        : []),
      ...categories.map((category) => ({
        ...category,
        label: text.categories[category.id] ?? category.label,
      })),
    ];
  }, [categories, recent, text]);

  const sections = useMemo<Section[]>(
    () =>
      categories && query.trim()
        ? [{ id: 'search', label: text.results, emojis: searchEmoji(categories, query) }]
        : browse,
    [browse, categories, query, text],
  );

  const flat = useMemo(() => sections.flatMap((section) => section.emojis), [sections]);
  const sizes = sections.map((section) => section.emojis.length);
  const current = Math.min(focusIndex, Math.max(flat.length - 1, 0));
  const selectedTab = query ? null : (activeSection ?? browse[0]?.id);

  // Вкладку нажали во время поиска: сначала сбросили запрос, прокрутка — когда разделы отрисовались
  useEffect(() => {
    const target = pendingScroll.current;

    if (!target || query) return;

    pendingScroll.current = null;
    scrollToSection(target);
  });

  const scrollToSection = (target: SectionId) => {
    const element = sectionRefs.current.get(target);
    const container = scrollRef.current;

    if (!element || !container) return;

    container.scrollTop = element.offsetTop;
    setActiveSection(target);
  };

  const onTab = (target: SectionId) => {
    if (query) {
      pendingScroll.current = target;
      setQuery('');
      return;
    }

    scrollToSection(target);
  };

  const onScroll = () => {
    const container = scrollRef.current;

    if (!container || query) return;

    const offsets = sections.map((s) => sectionRefs.current.get(s.id)?.offsetTop ?? 0);

    setActiveSection(sections[activeSectionIndex(offsets, container.scrollTop)]?.id ?? null);
  };

  const select = (emoji: EmojiItem) => {
    setRecent(rememberRecent(emoji.char, recentLimit, recentStorageKey));
    onSelect(emoji);
  };

  const focusCell = (index: number) => {
    setFocusIndex(index);
    setPreview(flat[index] ?? null);
    cellRefs.current[index]?.focus();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && flat.length > 0) {
      event.preventDefault();
      focusCell(0);
    } else if (event.key === 'Enter' && query && flat[0]) {
      event.preventDefault();
      select(flat[0]);
    } else if (event.key === 'Escape' && query) {
      // Поповер вокруг не закрывается на этом нажатии: EmojiPickerPopover отменяет своё Esc
      setQuery('');
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (GRID_KEYS.has(event.key)) {
      event.preventDefault();

      const next = moveInGrid(sizes, columns, current, event.key as GridKey, event.ctrlKey);

      if (next === -1) searchRef.current?.focus();
      else focusCell(next);

      return;
    }

    // Набор буквы в сетке — продолжение поиска: фокус в поле до ввода, символ попадёт уже туда
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key !== ' '
    ) {
      searchRef.current?.focus();
    }
  };

  let offset = 0;

  return (
    <div
      className={cx(styles.root, className)}
      style={{ ...style, '--emoji-columns': columns } as CSSProperties}
      {...rest}
    >
      <div className={styles.header}>
        <Input
          ref={searchRef}
          size="sm"
          fullWidth
          value={query}
          placeholder={text.search}
          aria-label={text.search}
          aria-controls={`${id}-grid`}
          startSlot={<Icon icon={Search} size="sm" />}
          autoFocus={autoFocus}
          data-emoji-search
          onChange={(event) => {
            setQuery(event.target.value);
            setFocusIndex(0);
            scrollRef.current?.scrollTo({ top: 0 });
          }}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      <div className={styles.tabs} role="toolbar" aria-label={text.sections}>
        {browse.map((section) => (
          <IconButton
            key={section.id}
            label={section.label}
            size="sm"
            active={selectedTab === section.id}
            aria-pressed={selectedTab === section.id}
            onClick={() => onTab(section.id)}
          >
            <Icon icon={categoryIcons[section.id]} size="sm" />
          </IconButton>
        ))}
      </div>

      <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
        {failed ? (
          <div className={styles.state}>
            <span>{text.loadFailed}</span>

            <Button size="sm" onClick={retry}>
              {text.retry}
            </Button>
          </div>
        ) : !categories ? (
          <div className={styles.skeleton} aria-busy="true" aria-label={text.loading}>
            {Array.from({ length: columns * 6 }, (_, index) => (
              <Skeleton key={index} width={24} height={24} radius="md" />
            ))}
          </div>
        ) : flat.length === 0 ? (
          <div className={styles.state}>{text.empty}</div>
        ) : (
          <div
            id={`${id}-grid`}
            role="grid"
            aria-label={text.grid}
            className={styles.grid}
            onKeyDown={onGridKeyDown}
          >
            {sections.map((section) => {
              const start = offset;

              offset += section.emojis.length;

              return (
                <div
                  key={section.id}
                  ref={(element) => {
                    if (element) sectionRefs.current.set(section.id, element);
                    else sectionRefs.current.delete(section.id);
                  }}
                  role="rowgroup"
                  aria-labelledby={`${id}-${section.id}`}
                  className={styles.section}
                >
                  <div id={`${id}-${section.id}`} className={styles.sectionTitle}>
                    {section.label}
                  </div>

                  {chunk(section.emojis, columns).map((row, rowIndex) => (
                    <div key={rowIndex} role="row" className={styles.row}>
                      {row.map((emoji, column) => {
                        const index = start + rowIndex * columns + column;

                        return (
                          <div key={emoji.char} role="gridcell" className={styles.cell}>
                            <button
                              ref={(element) => {
                                cellRefs.current[index] = element;
                              }}
                              type="button"
                              className={styles.emoji}
                              tabIndex={index === current ? 0 : -1}
                              aria-label={text.emojiName(emoji)}
                              data-active={index === current || undefined}
                              onClick={() => select(emoji)}
                              onFocus={() => {
                                setFocusIndex(index);
                                setPreview(emoji);
                              }}
                              onPointerEnter={() => setPreview(emoji)}
                            >
                              {emoji.char}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.preview} aria-live="polite">
        {preview ? (
          <>
            <span className={styles.previewEmoji} aria-hidden>
              {preview.char}
            </span>

            <span className={styles.previewText}>
              <span className={styles.previewName}>{text.emojiName(preview)}</span>

              <span className={styles.previewCode}>:{preview.shortcode}:</span>
            </span>
          </>
        ) : (
          <span className={styles.previewHint}>{text.hint}</span>
        )}
      </div>
    </div>
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let start = 0; start < items.length; start += size)
    rows.push(items.slice(start, start + size));

  return rows;
}

export interface EmojiPickerPopoverProps extends Omit<EmojiPickerProps, 'autoFocus'> {
  /** Триггер — кнопка, получает пропсы через asChild */
  children: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** Закрыть после выбора; по умолчанию да. Shift+клик выбирает, не закрывая */
  closeOnSelect?: boolean;
}

/**
 * Пикер в поповере у триггера (кнопка смайлика в композере, реакция под сообщением). Набор начинает грузиться
 * уже по наведению или фокусу на триггер. Esc при непустом поиске сначала очищает поиск, второй — закрывает.
 * Отдельный компонент, а не `EmojiPicker.Popover`: присвоение свойства функции — побочный эффект модуля для
 * сборщика, и пикер без поповера (в Sheet, в настройках) тянул бы его за собой.
 */
export function EmojiPickerPopover({
  children,
  open,
  defaultOpen,
  onOpenChange,
  side = 'top',
  align = 'start',
  closeOnSelect = true,
  onSelect,
  ...picker
}: EmojiPickerPopoverProps) {
  const text = useUiStrings().emojiPicker;
  const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false);
  const isOpen = open ?? innerOpen;
  const shiftHeld = useRef(false);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);

    onOpenChange?.(next);
  };

  const preload = () => {
    void loadEmojiData().catch(() => undefined);
  };

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
        className={styles.popover}
        onEscapeKeyDown={(event) => {
          const target = event.target as HTMLElement | null;

          if (
            target instanceof HTMLInputElement &&
            target.dataset.emojiSearch !== undefined &&
            target.value
          ) {
            event.preventDefault();
          }
        }}
        onPointerDownCapture={(event) => {
          shiftHeld.current = event.shiftKey;
        }}
        onKeyDownCapture={(event) => {
          shiftHeld.current = event.shiftKey;
        }}
      >
        <EmojiPicker
          {...picker}
          onSelect={(emoji) => {
            onSelect(emoji);

            if (closeOnSelect && !shiftHeld.current) setOpen(false);

            shiftHeld.current = false;
          }}
        />
      </Popover.Content>
    </Popover.Root>
  );
}
