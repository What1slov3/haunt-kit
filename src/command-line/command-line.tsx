import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from 'react';

import { Popover as RadixPopover, VisuallyHidden } from 'radix-ui';

import { highlightSegments } from '../combobox/combobox-filter';
import { BoxFrame } from '../box-frame/box-frame';
import type { InputSize } from '../input/input';
import { cx } from '../lib/cx';
import {
  createHistory,
  historyNext,
  historyPrevious,
  pushCommand,
  type CommandHistory,
} from '../log-view/log-view-history';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';
import { TuiSpinner } from '../tui-spinner/tui-spinner';
import { assignRef } from '../lib/assign-ref';

import {
  completion,
  matchSuggestions,
  toSuggestion,
  type CommandSuggestion,
} from './command-line-model';
import styles from './command-line.module.css';

/**
 * Откуда подсказки: готовый список (фильтруется под набранное) или функция — запрос к серверу. Функция
 * получает `signal`: следующий набор отменяет прошлый запрос, устаревший ответ не перезапишет свежий.
 */
export type CommandSuggestionSource =
  | readonly (string | CommandSuggestion)[]
  | ((
      query: string,
      options: { signal: AbortSignal },
    ) =>
      readonly (string | CommandSuggestion)[] | Promise<readonly (string | CommandSuggestion)[]>);

export interface CommandLineProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'onSubmit' | 'value' | 'defaultValue' | 'onChange' | 'size' | 'prefix'
> {
  /** Отправка: Enter без выбранной подсказки; строка очищается и уходит в историю */
  onSubmit: (value: string) => void;
  suggestions?: CommandSuggestionSource;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Знак приглашения: true — `>` из TUI-токена, строка — свой (`$`, `/`) */
  prompt?: boolean | string;
  /** История для ↑ / ↓ с прошлой сессии, от старых к новым */
  defaultHistory?: readonly string[];
  /** Сколько команд помнить; 0 — без истории */
  historySize?: number;
  /** Не больше стольких подсказок в списке */
  maxSuggestions?: number;
  /** Пауза перед запросом подсказок функцией, мс */
  debounce?: number;
  /** Подпись поля для скринридера */
  label?: string;
  size?: InputSize;
}

/**
 * Командная строка терминала: приглашение, ввод и блочный курсор в клетку моно-сетки, без рамки поля —
 * фокус виден по курсору и цвету приглашения. Курсор рисует зеркало над настоящим `<input>`: нативная
 * каретка спрятана, выделение, вставка и IME остаются браузерными. Автодополнение и история: Подсказки — листбокс под строкой
 * (`aria-activedescendant`, фокус остаётся в поле): ↑ / ↓ — по подсказкам, Tab — дополнить (выбранную,
 * иначе общее начало, как в bash), Enter на выбранной — подставить, Esc — закрыть список. Без открытого
 * списка ↑ / ↓ листают историю, как в LogView: черновик возвращается после самой новой команды.
 */
export function CommandLine({
  onSubmit,
  suggestions,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  prompt = true,
  defaultHistory,
  historySize = 50,
  maxSuggestions = 8,
  debounce = 120,
  label,
  placeholder,
  size = 'md',
  className,
  onKeyDown,
  onFocus,
  onBlur,
  onSelect,
  onScroll,
  ref,
  ...rest
}: CommandLineProps) {
  const strings = useUiStrings().commandLine;
  const container = usePortalContainer();
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [valueState, setValueState] = useState(defaultValue);
  const [history, setHistory] = useState<CommandHistory>(() =>
    createHistory((defaultHistory ?? []).slice(-Math.max(0, historySize))),
  );
  const [items, setItems] = useState<CommandSuggestion[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Курсор: позиция без выделения (null — выделен диапазон, курсора нет) и прокрутка длинной строки
  const [caret, setCaret] = useState<number | null>(null);
  const [scroll, setScroll] = useState(0);
  const value = valueProp ?? valueState;
  const open = focused && !dismissed && items.length > 0;
  const activeId = open && active !== null ? `${listId}-${active}` : undefined;

  const cancelRequest = () => {
    clearTimeout(timer.current);
    controller.current?.abort();
    controller.current = null;
  };

  // Размонтирование посреди запроса: ответ уже некому показывать
  useEffect(() => cancelRequest, []);

  const syncCursor = () => {
    const input = inputRef.current;

    if (!input) return;

    const { selectionStart: start, selectionEnd: end } = input;

    setCaret(start !== null && start === end ? start : null);
    setScroll(input.scrollLeft);
  };

  const setInput = (node: HTMLInputElement | null) => {
    inputRef.current = node;

    assignRef(ref, node);
  };

  const setValue = (next: string) => {
    setValueState(next);
    onValueChange?.(next);
    // Значение из истории или подсказки ставит каретку в конец без события select — сверяемся после кадра
    requestAnimationFrame(syncCursor);
  };

  const showItems = (next: readonly (string | CommandSuggestion)[]) => {
    setItems(next.map(toSuggestion).slice(0, maxSuggestions));
    setActive(null);
  };

  const requestSuggestions = (query: string) => {
    cancelRequest();

    if (!suggestions || query.trim() === '') {
      setItems([]);
      setLoading(false);

      return;
    }

    if (typeof suggestions !== 'function') {
      setItems(matchSuggestions(suggestions, query, maxSuggestions));
      setActive(null);

      return;
    }

    const request = new AbortController();

    controller.current = request;
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const result = await suggestions(query, { signal: request.signal });

        if (!request.signal.aborted) showItems(result);
      } catch {
        // Отмена или ошибка источника — без подсказок; строка ввода работает дальше
        if (!request.signal.aborted) setItems([]);
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    }, debounce);
  };

  const change = (next: string) => {
    setValue(next);
    setDismissed(false);
    // Набор после листания истории — уже не запись истории, а новый черновик
    setHistory((current) => (current.index === null ? current : createHistory(current.entries)));
    requestSuggestions(next);
  };

  const accept = (next: string) => {
    setValue(next);
    cancelRequest();
    setItems([]);
    setLoading(false);
    setActive(null);
  };

  const submit = () => {
    const command = value.trim();

    if (!command) return;

    onSubmit(command);

    if (historySize > 0) setHistory((current) => pushCommand(current, command, historySize));

    accept('');
  };

  const browseHistory = (direction: 'up' | 'down') => {
    const step = direction === 'up' ? historyPrevious(history, value) : historyNext(history);

    if (!step) return false;

    setHistory(step.history);
    setValue(step.value);
    cancelRequest();
    setItems([]);

    return true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || event.nativeEvent.isComposing) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const up = event.key === 'ArrowUp';

      if (open) {
        event.preventDefault();

        const last = items.length - 1;
        const next =
          active === null
            ? up
              ? last
              : 0
            : up
              ? active <= 0
                ? last
                : active - 1
              : active >= last
                ? 0
                : active + 1;

        setActive(next);

        return;
      }

      if (browseHistory(up ? 'up' : 'down')) event.preventDefault();

      return;
    }

    if (event.key === 'Tab' && !event.shiftKey) {
      const next = completion(value, open ? items : [], active);

      if (next === null) return;

      event.preventDefault();
      setValue(next);
      // Выбранная или единственная — команда целиком, список закрыт; общее начало — подсказки под него
      if (active !== null || items.length === 1) accept(next);
      else requestSuggestions(next);

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      const chosen = open && active !== null ? items[active] : undefined;

      if (chosen) accept(chosen.value);
      else submit();

      return;
    }

    if (event.key === 'Escape' && open) {
      // Esc закрывает список, а не диалог или панель вокруг строки
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => change(event.target.value);

  return (
    <RadixPopover.Root open={open}>
      <RadixPopover.Anchor asChild>
        <div
          ref={anchorRef}
          className={cx(styles.root, styles[size], className)}
          data-focused={focused || undefined}
        >
          {prompt && (
            <span className={cx(styles.prompt, prompt === true && styles.promptToken)} aria-hidden>
              {typeof prompt === 'string' ? prompt : null}
            </span>
          )}

          <span className={styles.field}>
            <input
              ref={setInput}
              className={styles.input}
              value={value}
              placeholder={placeholder ?? strings.placeholder}
              aria-label={label ?? strings.label}
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-busy={loading || undefined}
              autoComplete="off"
              spellCheck={false}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onSelect={(event) => {
                onSelect?.(event);
                syncCursor();
              }}
              onScroll={(event) => {
                onScroll?.(event);
                syncCursor();
              }}
              onFocus={(event) => {
                onFocus?.(event);
                setFocused(true);
                syncCursor();
              }}
              onBlur={(event) => {
                onBlur?.(event);
                setFocused(false);
              }}
              {...rest}
            />

            {focused && caret !== null && (
              <span className={styles.mirror} aria-hidden>
                <span
                  className={styles.mirrorLine}
                  style={{ transform: `translateX(${-scroll}px)` }}
                >
                  <span className={styles.before}>{value.slice(0, caret)}</span>

                  {/* Ключ по позиции и тексту: каждое нажатие перезапускает мигание — пока печатают, курсор горит */}
                  <span key={`${caret}:${value}`} className={styles.cursor} data-motion-keep="">
                    {caret < value.length ? String.fromCodePoint(value.codePointAt(caret)!) : ' '}
                  </span>
                </span>
              </span>
            )}
          </span>

          {loading && <TuiSpinner label={strings.loading} />}

          <VisuallyHidden.Root role="status">
            {open ? strings.count(items.length) : ''}
          </VisuallyHidden.Root>
        </div>
      </RadixPopover.Anchor>

      <RadixPopover.Portal container={container}>
        <RadixPopover.Content
          align="start"
          side="bottom"
          sideOffset={0}
          collisionPadding={8}
          className={styles.content}
          // Фокус остаётся в строке: список ведёт aria-activedescendant, набор не прерывается
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
            else setDismissed(true);
          }}
          onEscapeKeyDown={() => setDismissed(true)}
        >
          <BoxFrame padding="none" className={styles.frame}>
            <ul id={listId} role="listbox" aria-label={strings.suggestions} className={styles.list}>
              {items.map((item, index) => (
                <li
                  key={item.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active || undefined}
                  className={styles.option}
                  // pointerdown, а не click: иначе поле теряет фокус и список закрывается раньше выбора
                  onPointerDown={(event) => {
                    event.preventDefault();
                    accept(item.value);
                  }}
                  onPointerMove={() => setActive(index)}
                >
                  <span className={styles.value}>
                    {highlightSegments(item.label ?? item.value, value).map((segment, part) =>
                      segment.match ? (
                        <mark key={part} className={styles.match}>
                          {segment.text}
                        </mark>
                      ) : (
                        segment.text
                      ),
                    )}
                  </span>

                  {item.description && (
                    <span className={styles.description}>{item.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </BoxFrame>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
