import { useState, type ComponentPropsWithRef } from 'react';

import { CalendarRange } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';

import { Calendar, type CalendarRangeProps } from '../calendar/calendar';
import {
  formatIsoDateRange,
  parseIsoDate,
  todayIsoDate,
  type IsoDate,
} from '../calendar/calendar-date';
import { isSameRange, type DateRange } from '../calendar/calendar-range';
import { PickerTrigger } from '../date-picker/picker-trigger';
import { useFieldControl } from '../field/field-context';
import { cx } from '../lib/cx';
import { PopoverContent } from '../popover/popover-parts';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import styles from './date-range-picker.module.css';
import { createDateRangePresets, resolvePreset, type DateRangePreset } from './date-range-presets';

type CalendarPassThrough = Pick<
  CalendarRangeProps,
  | 'min'
  | 'max'
  | 'isDateDisabled'
  | 'allowDisabledInRange'
  | 'locale'
  | 'weekStartsOn'
  | 'defaultMonth'
  | 'today'
  | 'months'
>;

export interface DateRangePickerProps
  extends
    CalendarPassThrough,
    Omit<ComponentPropsWithRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'name'> {
  /** Период `{ start, end }` (концы включительно); null — пусто */
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  /** Выбраны оба конца или пресет; null — значение очищено */
  onValueChange?: (value: DateRange | null) => void;
  placeholder?: string;
  /** 24 / 28 / 32 px — как у Input и Button */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  fullWidth?: boolean;
  /** Как показать концы; общий месяц и год Intl не повторяет: «1–7 октября 2026 г.» */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Быстрый выбор слева; `[]` — без колонки пресетов */
  presets?: readonly DateRangePreset[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Очистка: крестик в поле и Backspace / Delete на нём; по умолчанию есть */
  clearable?: boolean;
  clearLabel?: string;
  /**
   * Имена скрытых `<input>` для форм — начало и конец отдельными полями `YYYY-MM-DD`. Явные имена, а не
   * `name[start]`: скобки — соглашение бэкенд-фреймворков, `serde_urlencoded` в axum их не разбирает
   */
  nameStart?: string;
  nameEnd?: string;
  /** Класс на рамке; className уходит на кнопку-триггер */
  wrapperClassName?: string;
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/**
 * Поле периода: триггер в рамке поля и поповер с календарём диапазона на два месяца и пресетами слева.
 * Внутри <Field> связывается с меткой, подсказкой и ошибкой. Выбор второго конца или пресета закрывает
 * поповер и возвращает фокус в поле.
 */
export function DateRangePicker({
  value,
  defaultValue = null,
  onValueChange,
  placeholder,
  size = 'md',
  invalid,
  fullWidth,
  formatOptions = DEFAULT_FORMAT,
  presets: presetsProp,
  open,
  onOpenChange,
  clearable = true,
  clearLabel,
  nameStart,
  nameEnd,
  form,
  min,
  max,
  isDateDisabled,
  allowDisabledInRange,
  locale: localeProp,
  weekStartsOn,
  defaultMonth,
  today: todayProp,
  months = 2,
  disabled,
  wrapperClassName,
  ...rest
}: DateRangePickerProps) {
  const strings = useUiStrings();
  const text = strings.dateRangePicker;
  const locale = useUiLocale(localeProp);
  const presets = presetsProp ?? createDateRangePresets(text.presets);
  const control = useFieldControl({ invalid, ...rest });
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [innerOpen, setInnerOpen] = useState(false);
  const selected = value === undefined ? innerValue : value;
  const isOpen = open ?? innerOpen;
  const today = todayProp ?? todayIsoDate();
  const valid = selected && parseIsoDate(selected.start) && parseIsoDate(selected.end);
  const label = valid
    ? formatIsoDateRange(selected.start, selected.end, locale, formatOptions)
    : null;
  const limits = { min, max, isDateDisabled, allowDisabledInRange };

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);

    onOpenChange?.(next);
  };

  const change = (next: DateRange | null) => {
    if (value === undefined) setInnerValue(next);

    onValueChange?.(next);
  };

  const pick = (range: DateRange) => {
    change(range);
    setOpen(false);
  };

  const hidden = (name: string | undefined, day: IsoDate | undefined) =>
    name !== undefined && <input type="hidden" name={name} form={form} value={day ?? ''} />;

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={setOpen}>
      <PickerTrigger
        label={label}
        placeholder={placeholder ?? text.placeholder}
        icon={CalendarRange}
        size={size}
        invalid={control.invalid}
        fullWidth={fullWidth}
        open={isOpen}
        disabled={disabled}
        clearLabel={clearLabel ?? text.clear}
        onClear={clearable && label ? () => change(null) : undefined}
        frameClassName={cx(styles.frame, wrapperClassName)}
        hiddenInputs={
          <>
            {hidden(nameStart, selected?.start)}
            {hidden(nameEnd, selected?.end)}
          </>
        }
        {...rest}
        {...control.props}
      />

      <PopoverContent
        align="start"
        aria-label={text.dialog}
        className={styles.content}
        // Фокус ставит сам календарь — на начало периода, а не на первый пресет
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {presets.length > 0 && (
          <div className={styles.presets} role="group" aria-label={text.presetsLabel}>
            {presets.map((preset) => {
              const range = resolvePreset(preset, today, limits);

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={styles.preset}
                  disabled={!range}
                  aria-pressed={Boolean(range && isSameRange(range, selected))}
                  onClick={() => range && pick(range)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        <Calendar
          mode="range"
          autoFocus
          months={months}
          value={selected}
          onValueChange={pick}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          allowDisabledInRange={allowDisabledInRange}
          locale={locale}
          weekStartsOn={weekStartsOn}
          defaultMonth={defaultMonth}
          today={today}
        />
      </PopoverContent>
    </RadixPopover.Root>
  );
}
