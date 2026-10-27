/*
 * Пресеты периода — данными: подпись и функция «сегодня → период». Функция, а не готовый период: пикер
 * может жить в открытом окне через полночь, и «7 дней» должны считаться от сегодняшнего дня, а не от
 * дня, когда собрали массив.
 */

import { addDays, isOutOfRange, startOfMonth, type IsoDate } from '../calendar/calendar-date';
import type { DateRange } from '../calendar/calendar-range';
import { ruStrings } from '../strings/ru';
import type { DateRangePresetKey } from '../strings/ui-strings-types';

export interface DateRangePreset {
  id: string;
  label: string;
  range: (today: IsoDate) => DateRange;
}

/**
 * Пресеты смотрят назад от сегодня (журнал, статистика), поэтому и «Этот месяц» — с первого числа по
 * сегодня, а не до конца месяца: будущих дней в отчёте нет.
 */
export function createDateRangePresets(
  labels: Record<DateRangePresetKey, string>,
): readonly DateRangePreset[] {
  return [
    { id: 'today', label: labels.today, range: (today) => ({ start: today, end: today }) },
    {
      id: 'last-7-days',
      label: labels['last-7-days'],
      range: (today) => ({ start: addDays(today, -6), end: today }),
    },
    {
      id: 'last-30-days',
      label: labels['last-30-days'],
      range: (today) => ({ start: addDays(today, -29), end: today }),
    },
    {
      id: 'this-month',
      label: labels['this-month'],
      range: (today) => ({ start: startOfMonth(today), end: today }),
    },
  ];
}

/** Пресеты с русскими подписями; DateRangePicker без `presets` берёт подписи из UiStringsProvider */
export const defaultDateRangePresets = createDateRangePresets(ruStrings.dateRangePicker.presets);

export interface RangeLimits {
  min?: IsoDate;
  max?: IsoDate;
  isDateDisabled?: (date: IsoDate) => boolean;
  allowDisabledInRange?: boolean;
}

/**
 * Период пресета с учётом ограничений пикера: выходящий за min / max обрезается по ним, а пресет, у
 * которого не остаётся ни дня или внутри есть выключенный день, недоступен (null) — та же проверка, что
 * у выбора мышью.
 */
export function resolvePreset(
  preset: DateRangePreset,
  today: IsoDate,
  { min, max, isDateDisabled, allowDisabledInRange = false }: RangeLimits = {},
): DateRange | null {
  const raw = preset.range(today);
  const start = min && raw.start < min ? min : raw.start;
  const end = max && raw.end > max ? max : raw.end;

  if (start > end || isOutOfRange(start, min, max) || isOutOfRange(end, min, max)) return null;
  if (!isDateDisabled) return { start, end };
  if (isDateDisabled(start) || isDateDisabled(end)) return null;

  if (!allowDisabledInRange) {
    for (let day = addDays(start, 1); day < end; day = addDays(day, 1)) {
      if (isDateDisabled(day)) return null;
    }
  }

  return { start, end };
}
