import { useState, type ComponentPropsWithRef } from 'react';

import { CalendarDays } from 'lucide-react';
import { Popover as RadixPopover } from 'radix-ui';

import { Calendar, type CalendarSingleProps } from '../calendar/calendar';
import { createDateFormatter, parseIsoDate, type IsoDate } from '../calendar/calendar-date';
import { useFieldControl } from '../field/field-context';
import { PopoverContent } from '../popover/popover-parts';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import { PickerTrigger } from './picker-trigger';

type CalendarPassThrough = Pick<
  CalendarSingleProps,
  'min' | 'max' | 'isDateDisabled' | 'locale' | 'weekStartsOn' | 'defaultMonth' | 'today'
>;

export interface DatePickerProps
  extends
    CalendarPassThrough,
    Omit<ComponentPropsWithRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'name'> {
  /** Выбранный день `YYYY-MM-DD`; null — пусто */
  value?: IsoDate | null;
  defaultValue?: IsoDate | null;
  /** Новый день; null — значение очищено */
  onValueChange?: (value: IsoDate | null) => void;
  placeholder?: string;
  /** 24 / 28 / 32 px — как у Input и Button */
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  fullWidth?: boolean;
  /** Как показать дату в поле; по умолчанию «26 октября 2026 г.» */
  formatOptions?: Intl.DateTimeFormatOptions;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Очистка: крестик в поле и Backspace / Delete на нём; по умолчанию есть */
  clearable?: boolean;
  clearLabel?: string;
  /** Имя скрытого `<input>` для форм: значение `YYYY-MM-DD` или пустая строка */
  name?: string;
  /** Класс на рамке; className уходит на кнопку-триггер */
  wrapperClassName?: string;
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/**
 * Поле даты: триггер в рамке поля (field-frame, как Input и Select.Trigger) и поповер с Calendar. Внутри
 * <Field> получает id, описание и ошибку. Выбор дня закрывает поповер, фокус возвращается на поле.
 */
export function DatePicker({
  value,
  defaultValue = null,
  onValueChange,
  placeholder,
  size = 'md',
  invalid,
  fullWidth,
  formatOptions = DEFAULT_FORMAT,
  open,
  onOpenChange,
  clearable = true,
  clearLabel,
  name,
  form,
  min,
  max,
  isDateDisabled,
  locale: localeProp,
  weekStartsOn,
  defaultMonth,
  today,
  disabled,
  wrapperClassName,
  ...rest
}: DatePickerProps) {
  const strings = useUiStrings();
  const locale = useUiLocale(localeProp);
  const control = useFieldControl({ invalid, ...rest });
  const [innerValue, setInnerValue] = useState(defaultValue);
  const [innerOpen, setInnerOpen] = useState(false);
  const selected = value === undefined ? innerValue : value;
  const isOpen = open ?? innerOpen;
  const label =
    selected && parseIsoDate(selected)
      ? createDateFormatter(locale, formatOptions)(selected)
      : null;

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);

    onOpenChange?.(next);
  };

  const change = (next: IsoDate | null) => {
    if (value === undefined) setInnerValue(next);

    onValueChange?.(next);
  };

  return (
    <RadixPopover.Root open={isOpen} onOpenChange={setOpen}>
      <PickerTrigger
        label={label}
        placeholder={placeholder ?? strings.datePicker.placeholder}
        icon={CalendarDays}
        size={size}
        invalid={control.invalid}
        fullWidth={fullWidth}
        open={isOpen}
        disabled={disabled}
        clearLabel={clearLabel ?? strings.datePicker.clear}
        onClear={clearable && label ? () => change(null) : undefined}
        frameClassName={wrapperClassName}
        hiddenInputs={
          name !== undefined && (
            <input type="hidden" name={name} form={form} value={selected ?? ''} />
          )
        }
        {...rest}
        {...control.props}
      />

      <PopoverContent
        align="start"
        aria-label={strings.datePicker.dialog}
        // Фокус ставит сам календарь — на выбранный день, а не на кнопку «предыдущий месяц»
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Calendar
          autoFocus
          value={selected}
          onValueChange={(day) => {
            change(day);
            setOpen(false);
          }}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          locale={locale}
          weekStartsOn={weekStartsOn}
          defaultMonth={defaultMonth}
          today={today}
        />
      </PopoverContent>
    </RadixPopover.Root>
  );
}
