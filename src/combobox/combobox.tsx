import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Check, ChevronsUpDown, SearchX } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';

import { EmptyState } from '../empty-state/empty-state';
import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { Input } from '../input/input';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';
import { useVirtualWindow } from '../virtual-list/use-virtual-window';

import styles from './combobox.module.css';
import { filterOptions, highlightSegments } from './combobox-filter';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Вторая строка мельче: ник, роль, число участников */
  description?: string;
  /** Иконка или аватар слева */
  icon?: ReactNode;
  /** Скрытые слова для поиска: ник, транслит, id */
  keywords?: readonly string[];
  disabled?: boolean;
}

export interface ComboboxProps {
  options: readonly ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Текст в триггере, пока ничего не выбрано */
  placeholder?: string;
  /** Подсказка в поле поиска; она же — его подпись для скринридера */
  searchPlaceholder?: string;
  /** Заголовок пустого результата */
  emptyText?: ReactNode;
  /**
   * Сколько пунктов показывать: остальные — по уточнению запроса («ещё N»). Без него список
   * виртуализирован и показывает все совпадения — в DOM только видимые пункты
   */
  maxResults?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 24 / 28 / 32 px — как у Input */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/** Первый доступный пункт, начиная с from в направлении step; -1 — таких нет */
function findEnabled(options: readonly ComboboxOption[], from: number, step: 1 | -1): number {
  for (let index = from; index >= 0 && index < options.length; index += step) {
    const option = options[index];

    if (option && !option.disabled) return index;
  }

  return -1;
}

/** Открытие — с выбранного пункта, чтобы было видно, что сейчас стоит; иначе с первого доступного */
function initialActive(options: readonly ComboboxOption[], value: string | null): number {
  const selectedIndex = options.findIndex((option) => option.value === value);

  return selectedIndex >= 0 ? selectedIndex : findEnabled(options, 0, 1);
}

/** Оценка высоты пункта до измерения: строка 28 px, с описанием — две строки */
const optionEstimate = (option: ComboboxOption | undefined) => (option?.description ? 44 : 28);

/**
 * Выбор одного значения из большого списка с поиском. Триггер — на рамке поля, список — в поповере со
 * стеклом. Фокус остаётся в поле поиска, активный пункт ведёт `aria-activedescendant`: так набор текста и
 * стрелки работают одновременно, как в палитре команд.
 */
export function Combobox({
  options,
  value,
  defaultValue = null,
  onValueChange,
  placeholder: placeholderProp,
  searchPlaceholder: searchPlaceholderProp,
  emptyText: emptyTextProp,
  maxResults,
  open,
  defaultOpen = false,
  onOpenChange,
  size = 'md',
  invalid,
  disabled,
  fullWidth,
  id,
  name,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: ComboboxProps) {
  const strings = useUiStrings();
  const placeholder = placeholderProp ?? strings.combobox.placeholder;
  const searchPlaceholder = searchPlaceholderProp ?? strings.combobox.searchPlaceholder;
  const emptyText = emptyTextProp ?? strings.combobox.empty;
  const container = usePortalContainer();
  const control = useFieldControl({ id, invalid, 'aria-describedby': ariaDescribedBy });
  const baseId = useId();
  const listId = `${baseId}-list`;

  const [innerValue, setInnerValue] = useState(defaultValue);
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(() =>
    initialActive(options, value !== undefined ? value : defaultValue),
  );

  const currentValue = value !== undefined ? value : innerValue;
  const isOpen = open ?? innerOpen;
  const selected = options.find((option) => option.value === currentValue);
  const results = filterOptions(options, query);
  const limited = maxResults !== undefined;
  const visible = limited ? results.slice(0, maxResults) : results;
  const listRef = useRef<HTMLUListElement>(null);
  const hidden = results.length - visible.length;
  const activeId = activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  const setOpen = (next: boolean) => {
    if (next) {
      setQuery('');
      setActiveIndex(initialActive(options, currentValue));
    }

    setInnerOpen(next);
    onOpenChange?.(next);
  };

  const choose = (option: ComboboxOption) => {
    if (option.disabled) return;

    setInnerValue(option.value);
    onValueChange?.(option.value);
    setOpen(false);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    const filtered = filterOptions(options, next);

    setActiveIndex(findEnabled(limited ? filtered.slice(0, maxResults) : filtered, 0, 1));
  };

  const windowed = useVirtualWindow({
    count: visible.length,
    getKey: (index) => visible[index]?.value ?? index,
    estimateSize: (index) => optionEstimate(visible[index]),
    scrollRef: listRef,
    enabled: !limited,
    overscan: 8,
  });
  const { scrollToIndex } = windowed;

  useEffect(() => {
    if (!limited || !isOpen || !activeId) return;

    document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [limited, isOpen, activeId]);

  // Виртуальный список: активный пункт должен быть в DOM, иначе aria-activedescendant указывал бы в
  // пустоту. Layout-эффект — прокрутка до отрисовки; query — после поиска список начинается заново
  useLayoutEffect(() => {
    if (limited || !isOpen || activeIndex < 0) return;

    scrollToIndex(activeIndex, 'auto');
  }, [limited, isOpen, activeIndex, query, scrollToIndex]);

  const rows = limited
    ? visible.map((option, index) => ({ option, index }))
    : windowed.items.map((item) => ({
        option: visible[item.index] as ComboboxOption,
        index: item.index,
      }));

  const moveActive = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = visible.length - 1;
    const next = {
      ArrowDown: () => findEnabled(visible, activeIndex + 1, 1),
      ArrowUp: () => findEnabled(visible, activeIndex - 1, -1),
      Home: () => findEnabled(visible, 0, 1),
      End: () => findEnabled(visible, last, -1),
    }[event.key];

    if (next) {
      event.preventDefault();

      const index = next();

      if (index !== -1) setActiveIndex(index);

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      const option = visible[activeIndex];

      if (option) choose(option);
    }
  };

  const openFromTrigger = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);

      return;
    }

    // Печать на закрытом триггере начинает поиск — как у нативного select
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (printable && event.key !== ' ') {
      event.preventDefault();
      setOpen(true);
      changeQuery(event.key);
    }
  };

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={setOpen}>
      <RadixPopover.Trigger
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-invalid={control.invalid || undefined}
        disabled={disabled}
        className={cx(
          frame.frame,
          frame[size],
          fullWidth && frame.fullWidth,
          styles.trigger,
          styles[size],
          className,
        )}
        data-invalid={control.invalid || undefined}
        data-disabled={disabled || undefined}
        data-placeholder={selected ? undefined : ''}
        onKeyDown={openFromTrigger}
        {...control.props}
      >
        {selected?.icon && <span className={styles.triggerIcon}>{selected.icon}</span>}

        <span className={styles.value}>{selected ? selected.label : placeholder}</span>

        <Icon icon={ChevronsUpDown} size="sm" className={styles.chevron} />
      </RadixPopover.Trigger>

      {name && <input type="hidden" name={name} value={currentValue ?? ''} />}

      <RadixPopover.Portal container={container}>
        <RadixPopover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className={styles.content}
          aria-label={ariaLabel ?? searchPlaceholder}
        >
          <div className={styles.header}>
            <Input
              size="sm"
              prompt
              fullWidth
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
              wrapperClassName={styles.search}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={moveActive}
            />
          </div>

          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className={styles.list}
            data-virtual={limited ? undefined : ''}
          >
            {/* Распорки окна — пустыми пунктами, а не padding списка: список сам прокручивается, и
                padding в тысячи пикселей перевесил бы его max-height */}
            {!limited && windowed.before > 0 && (
              <li
                role="none"
                aria-hidden
                className={styles.spacer}
                style={{ height: windowed.before }}
              />
            )}

            {rows.map(({ option, index }) => (
              <li
                key={option.value}
                ref={limited ? undefined : windowed.measureElement}
                id={`${baseId}-option-${index}`}
                role="option"
                // В DOM лишь окно пунктов: размер и позицию скринридер берёт отсюда
                aria-setsize={limited ? undefined : visible.length}
                aria-posinset={limited ? undefined : index + 1}
                data-virtual-index={limited ? undefined : index}
                aria-selected={option.value === currentValue}
                aria-disabled={option.disabled || undefined}
                className={styles.option}
                data-active={index === activeIndex || undefined}
                data-disabled={option.disabled || undefined}
                // Клик не должен уводить фокус из поля поиска
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => {
                  if (!option.disabled && index !== activeIndex) setActiveIndex(index);
                }}
                onClick={() => choose(option)}
              >
                {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}

                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>
                    {highlightSegments(option.label, query).map((segment, segmentIndex) =>
                      segment.match ? (
                        // Куски подписи не переставляются: индекс — стабильный ключ
                        <mark key={segmentIndex} className={styles.match}>
                          {segment.text}
                        </mark>
                      ) : (
                        segment.text
                      ),
                    )}
                  </span>

                  {option.description && (
                    <span className={styles.optionDescription}>{option.description}</span>
                  )}
                </span>

                {option.value === currentValue && (
                  <Icon icon={Check} size="sm" className={styles.check} />
                )}
              </li>
            ))}

            {!limited && windowed.after > 0 && (
              <li
                role="none"
                aria-hidden
                className={styles.spacer}
                style={{ height: windowed.after }}
              />
            )}
          </ul>

          {results.length === 0 && (
            <EmptyState
              compact
              role="status"
              icon={<Icon icon={SearchX} />}
              title={emptyText}
              description={query ? strings.combobox.emptyFor(query.trim()) : undefined}
            />
          )}

          {hidden > 0 && (
            <div className={styles.more} role="status">
              {strings.combobox.more(hidden)}
            </div>
          )}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
