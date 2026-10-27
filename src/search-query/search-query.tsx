import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { Search, X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { SuggestionList, type SuggestionItem } from '../rich-composer/suggestion-list';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  absorbFilters,
  formatFilter,
  formatSearchQuery,
  matchKeys,
  matchValues,
  parseSearchQuery,
  replaceToken,
  searchContext,
  type SearchContext,
  type SearchFilter,
  type SearchKey,
  type SearchQueryValue,
  type SearchValueOption,
} from './search-query-parse';
import styles from './search-query.module.css';

export interface SearchQueryProps {
  /** Ключи фильтров: `from`, `in`, `has`… — с подсказками значений и проверкой */
  keys: readonly SearchKey[];
  /** Строка запроса целиком: `from:@anna in:#general привет` */
  value?: string;
  defaultValue?: string;
  onValueChange?: (query: string) => void;
  /** Enter: строка и разобранные фильтры */
  onSearch?: (query: string, parsed: SearchQueryValue) => void;
  placeholder?: string;
  /** 24 / 28 / 32 px в одну строку; чипы переносятся, поле растёт */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

interface Suggestion extends SuggestionItem {
  apply: () => void;
}

interface SuggestState {
  context: SearchContext;
  title: string;
  items: Suggestion[];
  loading: boolean;
  active: number;
  emptyText: string;
  anchor: DOMRect;
}

const isThenable = <T,>(value: unknown): value is Promise<T> =>
  typeof (value as Promise<T> | null)?.then === 'function';

/**
 * Поиск с фильтрами-чипами: `from:@ник in:#канал has:file before:2026-10-01` и свободный текст. Готовый
 * фильтр (с пробелом за ним) становится чипом; подсказки — ключи, затем значения ключа. Backspace в
 * начале поля возвращает последний чип в текст для правки, клик по чипу — тоже. Значение — строка
 * запроса (`parseSearchQuery` / `formatSearchQuery`), её можно хранить в адресе страницы.
 */
export function SearchQuery({
  keys,
  value,
  defaultValue = '',
  onValueChange,
  onSearch,
  placeholder: placeholderProp,
  size = 'md',
  invalid,
  disabled,
  fullWidth,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: SearchQueryProps) {
  const strings = useUiStrings();
  const placeholder = placeholderProp ?? strings.searchQuery.placeholder;
  const control = useFieldControl({ id, invalid, 'aria-describedby': ariaDescribedBy });
  const baseId = useId();
  const listId = `${baseId}-suggestions`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const emittedRef = useRef<string | null>(null);
  /** Esc закрыл подсказки этого слова — пока курсор в нём, не открывать */
  const dismissedRef = useRef<number | null>(null);
  const caretRef = useRef<number | null>(null);

  const [state, setState] = useState<SearchQueryValue>(() =>
    parseSearchQuery(value ?? defaultValue, keys),
  );
  const [suggest, setSuggest] = useState<SuggestState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [syncedValue, setSyncedValue] = useState(value);

  // Значение пришло извне (не то, что поле отдало само) — разбираем заново в чипы и текст
  if (value !== syncedValue) {
    setSyncedValue(value);

    if (value !== undefined && value !== emittedRef.current)
      setState(parseSearchQuery(value, keys));
  }

  const { filters, text: draft } = state;

  const commit = (next: SearchQueryValue) => {
    const query = formatSearchQuery(next);

    setState(next);
    emittedRef.current = query;
    onValueChange?.(query);
  };

  const closeSuggestions = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setSuggest(null);
  };

  /*
   * Курсор ставится сразу после рендера нового текста (layout-эффект), а не в следующем кадре: при
   * быстром наборе кадр приходил после следующей буквы и переносил курсор посреди слова.
   */
  const setCaret = (caret: number) => {
    caretRef.current = caret;
  };

  useLayoutEffect(() => {
    const caret = caretRef.current;

    if (caret === null) return;

    caretRef.current = null;
    inputRef.current?.setSelectionRange(caret, caret);
  });

  const addFilters = (added: SearchFilter[], rest: string, base = filters) => {
    commit({ filters: [...base, ...added], text: rest });

    if (added.length > 0)
      setAnnouncement(strings.searchQuery.added(added.map(formatFilter).join(', ')));
  };

  const refresh = (nextDraft: string, caret: number) => {
    const context = searchContext(nextDraft, caret, keys);

    if (!context || dismissedRef.current === context.token.start) {
      if (!context) dismissedRef.current = null;

      closeSuggestions();

      return;
    }

    const anchor = frameRef.current?.getBoundingClientRect();

    if (!anchor) return;

    requestRef.current?.abort();

    if (context.kind === 'key') {
      const items = matchKeys(keys, context.query).map<Suggestion>((key) => ({
        key: key.key,
        label: `${key.key}:`,
        description: key.label,
        apply: () => {
          const next = replaceToken(nextDraft, context.token, `${key.key}:`);

          commit({ filters, text: next.draft });
          setCaret(next.caret);
          refresh(next.draft, next.caret);
        },
      }));

      if (items.length === 0) {
        closeSuggestions();

        return;
      }

      // Ключи — подсказка, а не автозамена: Enter без стрелки ищет набранное («f» не превращается в «from:»)
      setSuggest({
        context,
        title: strings.searchQuery.keys,
        items,
        loading: false,
        active: -1,
        emptyText: '',
        anchor,
      });

      return;
    }

    const { key, query } = context;
    const toItems = (options: readonly SearchValueOption[]) =>
      options.map<Suggestion>((option) => ({
        key: option.value,
        label: option.label ?? `${key.valuePrefix ?? ''}${option.value}`,
        description: option.description,
        icon: option.icon,
        apply: () => {
          const filter = { key: key.key, value: `${key.valuePrefix ?? ''}${option.value}` };
          const rest = replaceToken(nextDraft, context.token, '').draft.replace(/\s{2,}/gu, ' ');

          closeSuggestions();
          addFilters([filter], rest.trimStart());
          setCaret(rest.trimStart().length);
        },
      }));
    const show = (options: readonly SearchValueOption[], loading = false) =>
      setSuggest({
        context,
        title: strings.searchQuery.values(key.key),
        items: toItems(options),
        loading,
        active: options.length > 0 ? 0 : -1,
        emptyText: key.placeholder ?? strings.searchQuery.empty,
        anchor,
      });

    if (!key.values) {
      if (key.placeholder) {
        show([]);
        setAnnouncement(key.placeholder);
      } else {
        closeSuggestions();
      }

      return;
    }

    if (Array.isArray(key.values)) {
      show(matchValues(key.values as readonly SearchValueOption[], query));

      return;
    }

    const controller = new AbortController();
    const source = key.values as Exclude<
      SearchKey['values'],
      readonly SearchValueOption[] | undefined
    >;
    const ready = (options: readonly SearchValueOption[]) => {
      if (!controller.signal.aborted) {
        show(options);
        setAnnouncement(strings.searchQuery.results(options.length));
      }
    };

    requestRef.current = controller;

    let result: ReturnType<typeof source>;

    try {
      result = source(query, controller.signal);
    } catch {
      result = [];
    }

    if (isThenable<readonly SearchValueOption[]>(result)) {
      setSuggest((previous) =>
        previous?.context.kind === 'value' && previous.context.key === key
          ? { ...previous, context, loading: true }
          : {
              context,
              title: strings.searchQuery.values(key.key),
              items: [],
              loading: true,
              active: -1,
              emptyText: '',
              anchor,
            },
      );
      result.then(ready, () => ready([]));
    } else {
      ready(result);
    }
  };

  const changeDraft = (nextDraft: string, caret: number) => {
    const absorbed = absorbFilters(nextDraft, keys);

    if (absorbed.filters.length > 0) {
      addFilters(absorbed.filters, absorbed.rest);
      setCaret(absorbed.rest.length);
      refresh(absorbed.rest, absorbed.rest.length);

      return;
    }

    commit({ filters, text: nextDraft });
    refresh(nextDraft, caret);
  };

  const removeFilter = (index: number, edit = false) => {
    const filter = filters[index];

    if (!filter) return;

    const rest = filters.filter((_, filterIndex) => filterIndex !== index);
    const text = edit ? [formatFilter(filter), draft].filter(Boolean).join(' ') : draft;

    commit({ filters: rest, text });
    setAnnouncement(strings.searchQuery.removed(formatFilter(filter)));
    inputRef.current?.focus();

    if (edit) {
      const caret = formatFilter(filter).length;

      setCaret(caret);
      refresh(text, caret);
    }
  };

  const search = () => {
    const absorbed = absorbFilters(draft, keys, { all: true });
    const next = { filters: [...filters, ...absorbed.filters], text: absorbed.rest.trim() };

    closeSuggestions();
    commit(next);
    onSearch?.(formatSearchQuery(next), next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    const input = event.currentTarget;
    const items = suggest?.items ?? [];

    if (suggest && event.key === 'Escape') {
      event.preventDefault();
      dismissedRef.current = suggest.context.token.start;
      closeSuggestions();

      return;
    }

    if (suggest && items.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();

      const step = event.key === 'ArrowDown' ? 1 : -1;
      const from = suggest.active < 0 ? (step > 0 ? -1 : 0) : suggest.active;

      setSuggest({ ...suggest, active: (from + step + items.length) % items.length });

      return;
    }

    if (suggest && suggest.active >= 0 && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault();
      items[suggest.active]?.apply();

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      search();

      return;
    }

    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;

    if (event.key === 'Backspace' && atStart && filters.length > 0) {
      event.preventDefault();
      removeFilter(filters.length - 1, true);
    }
  };

  /** Пустое место рамки — не контрол: клик по нему ведёт в поле */
  const isBackground = (event: MouseEvent<HTMLDivElement>) =>
    !(event.target as HTMLElement).closest('button, input');

  useEffect(() => () => requestRef.current?.abort(), []);

  const query = formatSearchQuery(state);
  const active = suggest && suggest.items.length > 0 ? suggest.active : -1;

  return (
    <div className={cx(styles.root, fullWidth && styles.fullWidth, className)}>
      <div
        ref={frameRef}
        className={cx(
          frame.frame,
          frame[size],
          fullWidth && frame.fullWidth,
          styles.frame,
          styles[size],
        )}
        data-invalid={control.invalid || undefined}
        data-disabled={disabled || undefined}
        onMouseDown={(event) => {
          if (isBackground(event)) event.preventDefault();
        }}
        onClick={(event) => {
          if (isBackground(event)) inputRef.current?.focus();
        }}
      >
        <Icon icon={Search} size="sm" className={styles.icon} />

        <ul className={styles.chips} aria-label={strings.searchQuery.filters}>
          {filters.map((filter, index) => {
            const label = formatFilter(filter);

            return (
              <li key={`${label}-${index}`} className={styles.chip}>
                <button
                  type="button"
                  className={styles.chipBody}
                  disabled={disabled}
                  onClick={() => removeFilter(index, true)}
                >
                  <span className={styles.chipKey}>{filter.key}:</span>

                  <span className={styles.chipValue}>{filter.value}</span>
                </button>

                <button
                  type="button"
                  className={styles.remove}
                  aria-label={strings.searchQuery.remove(label)}
                  disabled={disabled}
                  onClick={() => removeFilter(index)}
                >
                  <Icon icon={X} size="xs" />
                </button>
              </li>
            );
          })}
        </ul>

        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          placeholder={filters.length === 0 ? placeholder : undefined}
          disabled={disabled}
          role="combobox"
          aria-label={ariaLabel ?? strings.searchQuery.label}
          aria-expanded={suggest !== null}
          aria-controls={suggest ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          aria-invalid={control.invalid || undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(event) =>
            changeDraft(
              event.target.value,
              event.target.selectionStart ?? event.target.value.length,
            )
          }
          onKeyDown={onKeyDown}
          onFocus={(event) => refresh(draft, event.target.selectionStart ?? draft.length)}
          onClick={(event) => refresh(draft, event.currentTarget.selectionStart ?? draft.length)}
          onBlur={closeSuggestions}
          {...control.props}
        />

        {query && !disabled && (
          <button
            type="button"
            className={styles.clear}
            aria-label={strings.searchQuery.clear}
            onClick={() => {
              commit({ filters: [], text: '' });
              closeSuggestions();
              inputRef.current?.focus();
            }}
          >
            <Icon icon={X} size="sm" />
          </button>
        )}
      </div>

      {suggest && (
        <SuggestionList
          id={listId}
          title={suggest.title}
          items={suggest.items}
          activeIndex={active}
          optionId={optionId}
          query={suggest.context.query}
          loading={suggest.loading}
          loadingText={strings.searchQuery.loading}
          emptyText={suggest.emptyText}
          anchor={suggest.anchor}
          placement="bottom"
          width="anchor"
          onActiveChange={(index) => setSuggest({ ...suggest, active: index })}
          onChoose={(index) => suggest.items[index]?.apply()}
        />
      )}

      <VisuallyHidden.Root role="status">{announcement}</VisuallyHidden.Root>
    </div>
  );
}
