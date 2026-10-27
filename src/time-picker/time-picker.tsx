import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

import { Check, Clock } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';

import { useFieldControl } from '../field/field-context';
import frame from '../field-frame/field-frame.module.css';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import menu from '../menu/menu.module.css';
import { PopoverContent } from '../popover/popover-parts';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import {
  clampTime,
  closestOptionIndex,
  createTimeFormatter,
  dayPeriodLabels,
  displayHour,
  fromDisplayHour,
  hourLimits,
  isTimeOutOfRange,
  MINUTE_LIMITS,
  parseTime,
  partsFromValue,
  periodOf,
  setPeriod,
  stepHour,
  stepMinute,
  timeOptions,
  togglePeriod,
  typeDigit,
  valueFromParts,
  type HourCycle,
  type IsoTime,
  type TimeParts,
} from './time';
import styles from './time-picker.module.css';

type Segment = 'hour' | 'minute' | 'period';

type NativeInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'min' | 'max' | 'step' | 'type' | 'name'
>;

export interface TimePickerProps extends NativeInputProps {
  /** Время `HH:MM` (24 ч); null — пусто */
  value?: IsoTime | null;
  defaultValue?: IsoTime | null;
  /** Полное время в пределах min / max; null — поле очищено */
  onValueChange?: (value: IsoTime | null) => void;
  /** Раньше нельзя (включительно можно) */
  min?: IsoTime;
  /** Позже нельзя (включительно можно) */
  max?: IsoTime;
  /** Шаг минут: стрелки на минутах и варианты в списке; по умолчанию 15 */
  step?: number;
  /** `h23` — 24 ч (по умолчанию), `h12` — 1–12 и сегмент AM / PM из Intl */
  hourCycle?: HourCycle;
  /** Локаль подписей списка и AM / PM; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
  /** Кнопка со списком вариантов; по умолчанию есть */
  showList?: boolean;
  /** 24 / 28 / 32 px — как у Input и Button */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  fullWidth?: boolean;
  /** Имя скрытого `<input>` для форм: `HH:MM` или пустая строка */
  name?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Подпись сегмента часов, когда поле не внутри <Field> с меткой */
  hourLabel?: string;
  minuteLabel?: string;
  periodLabel?: string;
  listLabel?: string;
  /** Класс на рамке; className уходит на сегмент часов */
  wrapperClassName?: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Поле времени: сегменты часов и минут в рамке поля (как системные поля времени), ↑ / ↓ меняют сегмент,
 * цифры набираются с автопереходом, ← / → и `:` ходят между сегментами, Backspace очищает сегмент.
 * Список вариантов с шагом `step` — в поповере по кнопке или Alt+↓. Пока человек печатает, значение
 * не зажимается в min / max (иначе не набрать «1» на пути к «14») — зажим на уходе фокуса из поля.
 */
export function TimePicker({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 15,
  hourCycle = 'h23',
  locale: localeProp,
  showList = true,
  size = 'md',
  invalid,
  fullWidth,
  disabled,
  readOnly,
  name,
  form,
  open,
  onOpenChange,
  hourLabel: hourLabelProp,
  minuteLabel: minuteLabelProp,
  periodLabel: periodLabelProp,
  listLabel: listLabelProp,
  wrapperClassName,
  className,
  onKeyDown,
  onFocus,
  ...rest
}: TimePickerProps) {
  const text = useUiStrings().timePicker;
  const locale = useUiLocale(localeProp);
  const hourLabel = hourLabelProp ?? text.hour;
  const minuteLabel = minuteLabelProp ?? text.minute;
  const periodLabel = periodLabelProp ?? text.period;
  const listLabel = listLabelProp ?? text.list;
  const control = useFieldControl({ invalid, ...rest });
  const [innerValue, setInnerValue] = useState(defaultValue);
  const committed = value === undefined ? innerValue : value;
  const [parts, setParts] = useState(() => partsFromValue(committed));
  const [shownValue, setShownValue] = useState(committed);
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const segments = useRef<Partial<Record<Segment, HTMLInputElement | null>>>({});
  // Набранные подряд цифры текущего сегмента: «1», затем «4» — это 14, а не 4
  const typed = useRef<{ segment: Segment | null; buffer: string }>({ segment: null, buffer: '' });
  const order: Segment[] = hourCycle === 'h12' ? ['hour', 'minute', 'period'] : ['hour', 'minute'];
  const periods = dayPeriodLabels(locale);
  const formatOption = createTimeFormatter(locale, hourCycle);
  const typedValue = valueFromParts(parts);
  const period = parts.hour === null ? parts.period : periodOf(parts.hour);
  const outOfRange = typedValue !== null && isTimeOutOfRange(typedValue, min, max);
  const locked = disabled || readOnly;

  // Значение пришло снаружи (управляемый режим, сброс формы) — показать его, а не прежний ввод
  if (committed !== shownValue) {
    setShownValue(committed);
    setParts(partsFromValue(committed, parts.period));
  }

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);

    onOpenChange?.(next);
  };

  const emit = (next: IsoTime | null) => {
    setShownValue(next);

    if (next === committed) return;
    if (value === undefined) setInnerValue(next);

    onValueChange?.(next);
  };

  /** Новое состояние сегментов; полное время в пределах — сразу значение, пустое поле — null */
  const apply = (next: TimeParts, { clamp = false } = {}) => {
    const full = valueFromParts(next);

    if (full !== null && clamp) {
      const clamped = clampTime(full, min, max);

      setParts(partsFromValue(clamped, next.period));
      emit(clamped);

      return;
    }

    setParts(next);

    // Недобранное время — ещё не значение: снаружи видят null, пока сегменты не заполнены
    if (full === null) emit(null);
    else if (!isTimeOutOfRange(full, min, max)) emit(full);
  };

  const focusSegment = (segment: Segment | undefined) => {
    if (!segment) return;

    segments.current[segment]?.focus();
  };

  const neighbour = (segment: Segment, delta: number) => order[order.indexOf(segment) + delta];

  const typeInto = (segment: Segment, digit: string) => {
    const buffer = typed.current.segment === segment ? typed.current.buffer : '';
    const limits = segment === 'hour' ? hourLimits(hourCycle) : MINUTE_LIMITS;
    const result = typeDigit(buffer, digit, limits);

    typed.current = { segment, buffer: result.buffer };

    if (result.value !== null) {
      const next =
        segment === 'minute'
          ? { ...parts, minute: result.value }
          : {
              ...parts,
              hour: hourCycle === 'h12' ? fromDisplayHour(result.value, period) : result.value,
            };

      apply(next);
    }

    if (result.advance) focusSegment(neighbour(segment, 1));
  };

  const handleSegmentKeyDown = (segment: Segment, event: KeyboardEvent<HTMLInputElement>) => {
    if (segment === 'hour') onKeyDown?.(event);

    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.key === 'Tab' || event.ctrlKey || event.metaKey) return;

    if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();

      if (showList && !locked) setOpen(true);

      return;
    }

    // Всё остальное поле обрабатывает само: печатный символ не должен попасть в сегмент как текст
    event.preventDefault();

    if (event.key === 'ArrowLeft') return focusSegment(neighbour(segment, -1));
    if (event.key === 'ArrowRight' || (event.key === ':' && segment === 'hour')) {
      return focusSegment(neighbour(segment, 1));
    }

    if (locked) return;

    const delta = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;

    if (delta) {
      typed.current = { segment: null, buffer: '' };

      if (segment === 'hour') apply(stepHour(parts, delta, hourCycle), { clamp: true });
      if (segment === 'minute') apply(stepMinute(parts, delta, step), { clamp: true });
      if (segment === 'period') apply(togglePeriod(parts), { clamp: true });

      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      typed.current = { segment: null, buffer: '' };

      if (segment === 'period') return;

      // Пустой сегмент — Backspace уходит назад, как в системном поле
      if (parts[segment] === null && event.key === 'Backspace') {
        return focusSegment(neighbour(segment, -1));
      }

      return apply({ ...parts, [segment]: null });
    }

    if (segment === 'period') {
      const key = event.key.toLowerCase();

      if (key === 'a' || key === periods.am.charAt(0).toLowerCase()) apply(setPeriod(parts, 'am'));
      if (key === 'p' || key === periods.pm.charAt(0).toLowerCase()) apply(setPeriod(parts, 'pm'));

      return;
    }

    if (/^\d$/.test(event.key)) typeInto(segment, event.key);
  };

  /** Вставка «14:30» в любой сегмент — целиком */
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const time = parseTime(event.clipboardData.getData('text').trim().padStart(5, '0'));

    if (time && !locked)
      apply(partsFromValue(`${pad(time.hour)}:${pad(time.minute)}`), { clamp: true });
  };

  /** Фокус ушёл из поля: недобранное достраивается и зажимается, как у NumberInput на blur */
  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;

    typed.current = { segment: null, buffer: '' };

    if (parts.hour !== null && parts.minute === null) {
      apply({ ...parts, minute: 0 }, { clamp: true });
    } else if (outOfRange) {
      apply(parts, { clamp: true });
    }
  };

  const segmentText = (segment: Segment) => {
    if (segment === 'period') {
      return periods[period];
    }

    const shown = parts[segment];

    if (shown === null) return '';

    return pad(segment === 'hour' ? displayHour(shown, hourCycle) : shown);
  };

  const segmentInput = (segment: Segment) => {
    const isHour = segment === 'hour';
    const limits = isHour ? hourLimits(hourCycle) : MINUTE_LIMITS;
    const current = parts[segment === 'period' ? 'hour' : segment];

    return (
      <input
        key={segment}
        ref={(node) => {
          segments.current[segment] = node;
        }}
        type="text"
        role="spinbutton"
        inputMode={segment === 'period' ? 'text' : 'numeric'}
        autoComplete="off"
        spellCheck={false}
        className={cx(styles.segment, segment === 'period' && styles.period, isHour && className)}
        value={segmentText(segment)}
        placeholder={segment === 'period' ? undefined : '––'}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={
          isHour
            ? control.props.id
              ? undefined
              : hourLabel
            : segment === 'minute'
              ? minuteLabel
              : periodLabel
        }
        aria-valuenow={
          segment === 'period' || current === null
            ? undefined
            : isHour
              ? displayHour(current, hourCycle)
              : current
        }
        aria-valuemin={segment === 'period' ? undefined : limits.min}
        aria-valuemax={segment === 'period' ? undefined : limits.max}
        aria-valuetext={
          segment === 'period' ? segmentText('period') : current === null ? text.empty : undefined
        }
        aria-invalid={isHour ? control.invalid || outOfRange || undefined : undefined}
        onChange={() => {}}
        onKeyDown={(event) => handleSegmentKeyDown(segment, event)}
        onPaste={handlePaste}
        onFocus={(event) => {
          if (isHour) onFocus?.(event);

          typed.current = { segment, buffer: '' };
          event.currentTarget.select();
        }}
        // Сегмент — значение целиком, а не текст с кареткой: клик выделяет его, а не ставит курсор
        onMouseUp={(event) => event.currentTarget.select()}
        {...(isHour ? { ...rest, ...control.props } : {})}
      />
    );
  };

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={(next) => !locked && setOpen(next)}>
      <RadixPopover.Anchor asChild>
        <span
          role="group"
          className={cx(
            frame.frame,
            frame[size],
            fullWidth && frame.fullWidth,
            styles.root,
            wrapperClassName,
          )}
          data-invalid={control.invalid || outOfRange || undefined}
          data-disabled={disabled || undefined}
          data-state={isOpen ? 'open' : 'closed'}
          onBlur={handleBlur}
        >
          <span className={styles.segments}>
            {segmentInput('hour')}

            <span className={styles.separator} aria-hidden>
              :
            </span>

            {segmentInput('minute')}

            {hourCycle === 'h12' && segmentInput('period')}
          </span>

          {showList && (
            <RadixPopover.Trigger asChild>
              <IconButton
                label={listLabel}
                size="xs"
                variant="ghost"
                tabIndex={-1}
                disabled={locked}
                className={styles.listButton}
              >
                <Icon icon={Clock} size="sm" />
              </IconButton>
            </RadixPopover.Trigger>
          )}

          {name !== undefined && (
            <input type="hidden" name={name} form={form} value={committed ?? ''} />
          )}
        </span>
      </RadixPopover.Anchor>

      {showList && (
        <PopoverContent
          align="start"
          aria-label={listLabel}
          className={styles.content}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <TimeOptionList
            options={timeOptions(step, min, max)}
            selected={committed}
            format={formatOption}
            label={listLabel}
            onSelect={(option) => {
              apply(partsFromValue(option));
              setOpen(false);
            }}
          />
        </PopoverContent>
      )}
    </RadixPopover.Root>
  );
}

interface TimeOptionListProps {
  options: readonly IsoTime[];
  selected: IsoTime | null;
  format: (value: IsoTime) => string;
  label: string;
  onSelect: (value: IsoTime) => void;
}

/**
 * Список вариантов — listbox с активным пунктом через aria-activedescendant: фокус стоит на списке,
 * стрелки двигают выделение, Enter выбирает. При открытии список встаёт на выбранный (или ближайший).
 */
function TimeOptionList({ options, selected, format, label, onSelect }: TimeOptionListProps) {
  const [active, setActive] = useState(() => closestOptionIndex(options, selected));
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const centered = useRef(false);

  useEffect(() => {
    const list = listRef.current;

    if (!list) return;

    const first = !centered.current;

    centered.current = true;

    if (first) list.focus();

    const option = list.querySelector<HTMLElement>(`[data-index="${active}"]`);

    if (!option) return;

    /*
     * Прокрутка самого списка, не scrollIntoView: тот двигает и все прокручиваемые предки, вплоть до
     * страницы под поповером. При открытии — выбранный по центру, дальше — ровно до видимости активного.
     */
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;

    if (first) list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2;
    else if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }, [active]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
      PageDown: Math.min(active + 8, last),
      PageUp: Math.max(active - 8, 0),
    };

    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]!);

      return;
    }

    const option = options[active];

    if ((event.key === 'Enter' || event.key === ' ') && option) {
      event.preventDefault();
      onSelect(option);
    }
  };

  return (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={options[active] ? optionId(active) : undefined}
      className={styles.list}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => (
        <div
          key={option}
          id={optionId(index)}
          role="option"
          aria-selected={option === selected}
          data-index={index}
          data-highlighted={index === active ? '' : undefined}
          className={cx(menu.item, styles.option)}
          onPointerMove={() => setActive(index)}
          onClick={() => onSelect(option)}
        >
          <span className={menu.icon}>
            {option === selected && <Icon icon={Check} size="sm" />}
          </span>

          <span className={menu.label}>{format(option)}</span>
        </div>
      ))}
    </div>
  );
}
