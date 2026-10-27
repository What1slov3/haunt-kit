import { Divider, type DividerProps } from '../divider/divider';
import { useUiLocale } from '../strings/ui-strings-context';
import { toDate, type TimestampInput } from '../timestamp/timestamp-format';

import { dayLabel } from './day-label';

export interface DateDividerProps extends Omit<DividerProps, 'label' | 'orientation'> {
  /** День, который начинается под разделителем */
  date: TimestampInput;
  /** «Сегодня» и «вчера» вместо даты; по умолчанию да */
  relative?: boolean;
  /** Локаль Intl; по умолчанию из UiStringsProvider */
  locale?: string;
  /** «Сейчас» для подписи — истории и тесты с фиксированным днём; по умолчанию текущее время */
  now?: TimestampInput;
}

/**
 * Разделитель дня в ленте на `Divider`: «сегодня», «вчера», иначе день недели и дата («понедельник,
 * 26 октября», год — если не текущий). Подпись — у левого края, как заголовок раздела ленты: дату ищут
 * взглядом по колонке текста, а не посреди строки. Слова — из Intl локали. У разделителя содержимое не читается
 * скринридером, поэтому подпись — ещё и `aria-label`. Подпись не обновляется в полночь сама: лента
 * перерисовывается с новыми сообщениями.
 */
export function DateDivider({
  date,
  relative,
  locale,
  now,
  align = 'start',
  ...rest
}: DateDividerProps) {
  const value = toDate(date);
  const label = dayLabel(value, now === undefined ? new Date() : toDate(now), useUiLocale(locale), {
    relative,
  });
  const valid = !Number.isNaN(value.getTime());

  return (
    <Divider
      aria-label={label}
      align={align}
      {...rest}
      label={<time dateTime={valid ? value.toISOString() : undefined}>{label}</time>}
    />
  );
}
