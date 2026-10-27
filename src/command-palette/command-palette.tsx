import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { ChevronRight } from 'lucide-react';
import { Dialog as RadixDialog, VisuallyHidden } from 'radix-ui';

import dialogStyles from '../dialog/dialog.module.css';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';
import { Kbd } from '../kbd/kbd';
import { useReturnFocus } from '../lib/use-return-focus';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';
import { TuiSpinner } from '../tui-spinner/tui-spinner';

import {
  appendLoaded,
  sectionCommands,
  splitByMatches,
  type FilterableCommand,
  type MatchRange,
} from './command-filter';
import styles from './command-palette.module.css';

/** Команды с сервера по запросу; `signal` отменяет прежний запрос, когда ввод ушёл дальше */
export type CommandLoader = (query: string, signal: AbortSignal) => Promise<readonly CommandItem[]>;

export interface CommandItem extends FilterableCommand {
  /** Группа, в которой показана команда: «Перейти», «Создать» */
  group?: string;
  /** Пояснение справа от подписи, тише; по нему тоже ищется */
  description?: string;
  /** Синонимы для поиска, не показываются: `['preferences', 'опции']` */
  keywords?: readonly string[];
  icon?: ReactNode;
  /** Подпись сочетания справа (`Ctrl+N`, удобно — `formatHotkey('mod+n')`). Клавиши слушает экран */
  shortcut?: string;
  disabled?: boolean;
  /** Выполнить команду; у команды-страницы (`items` / `loadItems`) не нужен */
  onSelect?: () => void;
  /**
   * Вложенная страница: выбор открывает подсписок («Сменить тему →») вместо выполнения. Назад — Backspace
   * на пустом вводе или Esc
   */
  items?: readonly CommandItem[];
  /** Подсписок страницы с сервера — как `loadItems` палитры */
  loadItems?: CommandLoader;
  /** Подсказка в поле на этой странице */
  placeholder?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Все команды; фильтрует и ранжирует палитра */
  items: readonly CommandItem[];
  /**
   * Команды с сервера: вызывается после паузы ввода (`loadDelay`; пустой запрос — сразу, он тоже
   * запрашивается), результат идёт после своих команд. Ошибка показывается строкой
   */
  loadItems?: CommandLoader;
  /** Пауза ввода перед `loadItems`, мс */
  loadDelay?: number;
  /** id недавних команд, свежие первыми — группа «Недавние», пока запрос пуст */
  recent?: readonly string[];
  /** После выбора любой команды — например, обновить недавние через `pushRecentCommand` */
  onItemSelect?: (item: CommandItem) => void;
  placeholder?: string;
  /** Заголовок окна для скринридера */
  label?: string;
  /** Что показать, когда ничего не нашлось */
  emptyText?: ReactNode;
  /** Подпись загрузки рядом со спиннером */
  loadingText?: string;
  /** Строка подсказок клавиш внизу */
  hints?: boolean;
}

const isPage = (item: CommandItem) => Boolean(item.items || item.loadItems);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * Палитра команд (Ctrl K). Команды — данными, а не разметкой: ранжирование смотрит на все команды сразу и
 * может поднять группу выше, подсветке нужна подпись строкой, недавние ссылаются на id. Открывает экран
 * (`useHotkey('mod+k', …)`), палитра только показывает и выбирает.
 */
export function CommandPalette({
  open,
  onOpenChange,
  label: labelProp,
  ...rest
}: CommandPaletteProps) {
  const strings = useUiStrings();
  const label = labelProp ?? strings.commandPalette.label;
  const container = usePortalContainer();
  // Палитру открывают сочетанием, а не триггером: фокус возвращается туда, где был (композер, список)
  const returnFocus = useReturnFocus();
  // Esc Radix ловит на документе раньше поля, поэтому «назад со страницы» спрашивается у тела палитры здесь
  const goBack = useRef<(() => boolean) | null>(null);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal container={container}>
        <RadixDialog.Overlay className={dialogStyles.overlay} />

        <RadixDialog.Content
          className={styles.content}
          aria-describedby={undefined}
          onOpenAutoFocus={returnFocus.remember}
          onCloseAutoFocus={returnFocus.restore}
          onEscapeKeyDown={(event) => {
            if (goBack.current?.()) event.preventDefault();
          }}
        >
          <VisuallyHidden.Root asChild>
            <RadixDialog.Title>{label}</RadixDialog.Title>
          </VisuallyHidden.Root>

          {/* Отдельный компонент: состояние запроса, страниц и выделения рождается с каждым открытием */}
          <PaletteBody
            label={label}
            onClose={() => onOpenChange(false)}
            goBack={goBack}
            {...rest}
          />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

CommandPalette.displayName = 'CommandPalette';

type PaletteBodyProps = Omit<CommandPaletteProps, 'open' | 'onOpenChange'> & {
  label: string;
  onClose: () => void;
  goBack: { current: (() => boolean) | null };
};

interface Loaded {
  /** Для какой страницы и запроса — ответ на прежний запрос не показывается под новым */
  key: string;
  items: readonly CommandItem[];
  error?: unknown;
}

function PaletteBody({
  items,
  loadItems,
  loadDelay = 200,
  recent,
  onItemSelect,
  placeholder: placeholderProp,
  label,
  emptyText: emptyTextProp,
  loadingText: loadingTextProp,
  hints = true,
  onClose,
  goBack,
}: PaletteBodyProps) {
  const strings = useUiStrings();
  const text = strings.commandPalette;
  const placeholder = placeholderProp ?? text.placeholder;
  const emptyText = emptyTextProp ?? text.empty;
  const loadingText = loadingTextProp ?? text.loading;
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pages, setPages] = useState<CommandItem[]>([]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const baseId = useId();

  const page = pages.at(-1);
  const loader = page ? page.loadItems : loadItems;
  const loadKey = `${pages.map((entry) => entry.id).join('/')}:${query}`;
  // Загрузчик — свежий в ref: экран передаёт его стрелкой, и новая ссылка на каждом рендере не должна
  // перезапускать запрос
  const loaderRef = useRef(loader);
  const hasLoader = Boolean(loader);
  const current = loaded?.key === loadKey ? loaded : null;
  const pending = hasLoader && !current;

  const sections = appendLoaded(
    sectionCommands(page ? (page.items ?? []) : items, query, {
      recent: page ? [] : recent,
      recentHeading: text.recent,
    }),
    current?.items ?? [],
    query,
  );
  const selectable = sections
    .flatMap((section) => section.items.map((entry) => entry.item))
    .filter((item) => !item.disabled);
  // Выделение держится за id: после ввода прежнего пункта может не быть — тогда первый
  const active = selectable.find((item) => item.id === activeId) ?? selectable[0];
  const optionId = (item: CommandItem) => `${baseId}-option-${item.id}`;
  const listId = `${baseId}-list`;

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    const load = loaderRef.current;

    if (!load) return;

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        load(query, controller.signal).then(
          (result) => {
            if (!controller.signal.aborted) setLoaded({ key: loadKey, items: result });
          },
          (error: unknown) => {
            // Отменённый запрос — не ошибка: его ответ просто никому не нужен
            if (!controller.signal.aborted) setLoaded({ key: loadKey, items: [], error });
          },
        );
      },
      query ? loadDelay : 0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadKey, query, hasLoader, loadDelay]);

  useEffect(() => {
    if (!active) return;

    document.getElementById(`${baseId}-option-${active.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, baseId]);

  const back = () => {
    if (!page) return false;

    setPages(pages.slice(0, -1));
    setQuery('');
    // Вернулись — выделена та команда, через которую зашли
    setActiveId(page.id);

    return true;
  };

  useEffect(() => {
    goBack.current = back;

    return () => {
      goBack.current = null;
    };
  });

  const select = (item: CommandItem) => {
    if (item.disabled) return;

    if (isPage(item)) {
      setPages([...pages, item]);
      setQuery('');
      setActiveId(null);

      return;
    }

    onClose();
    item.onSelect?.();
    onItemSelect?.(item);
  };

  const move = (to: number) => {
    if (!selectable.length) return;

    const index = (to + selectable.length) % selectable.length;

    setActiveId(selectable[index]!.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    // Backspace стирает символ, пока он есть; на пустом вводе — шаг назад по страницам
    if (event.key === 'Backspace' && !query && back()) {
      event.preventDefault();

      return;
    }

    const index = active ? selectable.indexOf(active) : -1;

    // Фокус всё время в поле, поэтому клавиши списка перехватываются здесь; Home/End двигают выделение,
    // а не каретку — запрос короткий, по нему ходят редко, а прыжок к краю списка нужен чаще
    const actions: Record<string, () => void> = {
      ArrowDown: () => move(index + 1),
      ArrowUp: () => move(index - 1),
      Home: () => move(0),
      End: () => move(selectable.length - 1),
      Enter: () => active && select(active),
    };

    const action = actions[event.key];

    if (!action) return;

    event.preventDefault();
    action();
  };

  return (
    <>
      <div className={styles.search}>
        <Input
          size="lg"
          prompt
          fullWidth
          wrapperClassName={styles.searchFrame}
          startSlot={
            pages.length ? (
              <span className={styles.crumbs}>
                {pages.map((entry) => (
                  <span key={entry.id} className={styles.crumb}>
                    {entry.label}
                  </span>
                ))}
              </span>
            ) : undefined
          }
          role="combobox"
          aria-label={label}
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={page?.placeholder ?? placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveId(null);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {sections.length > 0 && (
        <div id={listId} role="listbox" aria-label={page?.label ?? label} className={styles.list}>
          {sections.map((section, sectionIndex) => {
            const headingId = `${baseId}-group-${sectionIndex}`;

            return (
              <div
                key={section.heading ?? `__${sectionIndex}`}
                role="group"
                aria-labelledby={section.heading ? headingId : undefined}
                className={styles.group}
              >
                {section.heading && (
                  <div id={headingId} className={styles.heading} aria-hidden>
                    {section.heading}
                  </div>
                )}

                {section.items.map(({ item, matches }) => (
                  <div
                    key={item.id}
                    id={optionId(item)}
                    role="option"
                    aria-selected={item === active}
                    aria-disabled={item.disabled || undefined}
                    data-active={item === active || undefined}
                    className={styles.item}
                    // pointermove, а не enter: список, проехавший под неподвижным курсором при прокрутке
                    // стрелками, не должен перехватывать выделение
                    onPointerMove={() => !item.disabled && item !== active && setActiveId(item.id)}
                    // Фокус остаётся в поле: иначе следующий символ ушёл бы в никуда
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(item)}
                  >
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}

                    <span className={styles.text}>
                      <span className={styles.label}>
                        <Highlighted label={item.label} matches={matches} />
                      </span>

                      {item.description && (
                        <span className={styles.description}>{item.description}</span>
                      )}
                    </span>

                    {item.shortcut && (
                      <Kbd size="sm" className={styles.shortcut}>
                        {item.shortcut}
                      </Kbd>
                    )}

                    {isPage(item) && (
                      <Icon icon={ChevronRight} size="sm" className={styles.chevron} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {pending && (
        <div className={styles.status}>
          <TuiSpinner label={loadingText}>{loadingText}</TuiSpinner>
        </div>
      )}

      {current?.error !== undefined && (
        <div className={styles.error} role="alert">
          {errorMessage(current.error, text.loadFailed)}
        </div>
      )}

      {!sections.length && !pending && current?.error === undefined && (
        <div className={styles.empty} role="status">
          {emptyText}
          {query.trim() && <span className={styles.query}>«{query.trim()}»</span>}
        </div>
      )}

      {hints && (
        <div className={styles.hints} aria-hidden>
          <span className={styles.hint}>
            <Kbd size="sm">↑</Kbd>
            <Kbd size="sm">↓</Kbd>
            {text.hintSelect}
          </span>

          <span className={styles.hint}>
            <Kbd size="sm">Enter</Kbd>
            {active && isPage(active) ? text.hintOpen : text.hintRun}
          </span>

          {page && (
            <span className={styles.hint}>
              <Kbd size="sm">⌫</Kbd>
              {text.hintBack}
            </span>
          )}

          <span className={styles.hint}>
            <Kbd size="sm">Esc</Kbd>
            {page ? text.hintBack : text.hintClose}
          </span>
        </div>
      )}
    </>
  );
}

function Highlighted({ label, matches }: { label: string; matches: readonly MatchRange[] }) {
  if (!matches.length) return label;

  return splitByMatches(label, matches).map(([text, matched], index) =>
    matched ? (
      <mark key={index} className={styles.mark}>
        {text}
      </mark>
    ) : (
      text
    ),
  );
}
