/*
 * Время суток без даты и пояса — строкой `HH:MM` (24 ч), как `IsoDate` у дат: сериализуется как есть и
 * сравнивается обычным `<` (часы и минуты с ведущим нулём). 12-часовой вид — только показ: значение
 * всегда 24-часовое.
 */

/** Время `HH:MM`, 00:00–23:59 */
export type IsoTime = string;

/** `h23` — 00–23 (по умолчанию), `h12` — 1–12 с AM / PM, подписи периода берутся из Intl */
export type HourCycle = 'h23' | 'h12';

export type DayPeriod = 'am' | 'pm';

export interface PlainTime {
  hour: number;
  minute: number;
}

/** Состояние поля: сегмент может быть пуст, пока человек не ввёл его. `hour` — всегда 0–23 */
export interface TimeParts {
  hour: number | null;
  minute: number | null;
  /** Период для 12-часового вида, пока час пуст; при заданном часе выводится из него */
  period: DayPeriod;
}

const DAY_MINUTES = 24 * 60;

const pad = (value: number) => String(value).padStart(2, '0');

/** null — не время или несуществующее (`24:00`, `9:5`) */
export function parseTime(value: string): PlainTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export function formatTime({ hour, minute }: PlainTime): IsoTime {
  return `${pad(hour)}:${pad(minute)}`;
}

export function toMinutes(value: IsoTime): number {
  const time = parseTime(value);

  if (!time) throw new Error(`Ожидалось время HH:MM, пришло «${value}»`);

  return time.hour * 60 + time.minute;
}

/** Минуты от полуночи обратно во время; за пределами суток — по кругу */
export function fromMinutes(total: number): IsoTime {
  const minutes = ((Math.round(total) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

  return formatTime({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
}

export function isTimeOutOfRange(value: IsoTime, min?: IsoTime, max?: IsoTime): boolean {
  return Boolean((min && value < min) || (max && value > max));
}

export function clampTime(value: IsoTime, min?: IsoTime, max?: IsoTime): IsoTime {
  if (min && value < min) return min;
  if (max && value > max) return max;

  return value;
}

export function periodOf(hour: number): DayPeriod {
  return hour < 12 ? 'am' : 'pm';
}

/** Час для показа: 0 → 12 AM, 13 → 1 PM */
export function displayHour(hour: number, hourCycle: HourCycle): number {
  if (hourCycle === 'h23') return hour;

  return hour % 12 === 0 ? 12 : hour % 12;
}

/** Обратно из показанного 12-часового часа в 0–23 */
export function fromDisplayHour(shown: number, period: DayPeriod): number {
  return (shown % 12) + (period === 'pm' ? 12 : 0);
}

export function partsFromValue(value: IsoTime | null, period: DayPeriod = 'am'): TimeParts {
  const time = value ? parseTime(value) : null;

  if (!time) return { hour: null, minute: null, period };

  return { ...time, period: periodOf(time.hour) };
}

/** Полное значение, если оба сегмента заданы; иначе null */
export function valueFromParts({ hour, minute }: TimeParts): IsoTime | null {
  return hour === null || minute === null ? null : formatTime({ hour, minute });
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/**
 * Стрелка на сегменте часов. Как в системных полях времени — по кругу внутри сегмента, без переноса в
 * соседний: в 12-часовом виде 11 AM ↑ даёт 12 AM, а не 12 PM — период меняется своим сегментом.
 */
export function stepHour(parts: TimeParts, delta: number, hourCycle: HourCycle): TimeParts {
  if (parts.hour === null) {
    if (hourCycle === 'h23') return { ...parts, hour: delta > 0 ? 0 : 23 };

    return { ...parts, hour: (delta > 0 ? 0 : 11) + (parts.period === 'pm' ? 12 : 0) };
  }

  if (hourCycle === 'h23') return { ...parts, hour: wrap(parts.hour + delta, 24) };

  const period = periodOf(parts.hour);

  return { ...parts, hour: wrap(parts.hour + delta, 12) + (period === 'pm' ? 12 : 0), period };
}

/**
 * Стрелка на минутах с шагом: значение встаёт на ближайшую отметку шага в сторону нажатия (07 ↑ при шаге
 * 15 — 15, а не 22), по кругу в пределах часа.
 */
export function stepMinute(parts: TimeParts, delta: number, step: number): TimeParts {
  const size = Math.max(1, Math.min(60, Math.round(step)));

  if (parts.minute === null) {
    return { ...parts, minute: delta > 0 ? 0 : 60 - size };
  }

  const next =
    delta > 0
      ? Math.floor(parts.minute / size) * size + size
      : Math.ceil(parts.minute / size) * size - size;

  return { ...parts, minute: wrap(next, 60) };
}

export function togglePeriod(parts: TimeParts): TimeParts {
  if (parts.hour === null) return { ...parts, period: parts.period === 'am' ? 'pm' : 'am' };

  const hour = wrap(parts.hour + 12, 24);

  return { ...parts, hour, period: periodOf(hour) };
}

/** Период явно: `A` / `P` на сегменте периода */
export function setPeriod(parts: TimeParts, period: DayPeriod): TimeParts {
  const current = parts.hour === null ? parts.period : periodOf(parts.hour);

  return current === period ? { ...parts, period } : togglePeriod({ ...parts, period: current });
}

export interface SegmentLimits {
  min: number;
  max: number;
}

export interface TypedDigit {
  /** Набранные цифры сегмента — продолжение ввода */
  buffer: string;
  /** Значение сегмента; null — цифры ещё не дают значения (`0` у 12-часового часа) */
  value: number | null;
  /** Больше цифр сюда не влезет — фокус переходит на следующий сегмент */
  advance: boolean;
}

/**
 * Цифра в сегменте с автопереходом: `1` у часов ждёт вторую цифру (10–19), `3` — сразу 03 и дальше, потому
 * что 30+ часов не бывает. Цифра, с которой число выходит за край, начинает ввод заново.
 */
export function typeDigit(buffer: string, digit: string, { min, max }: SegmentLimits): TypedDigit {
  let next = buffer + digit;

  if (next.length > 2 || Number(next) > max) next = digit;

  const value = Number(next);

  return {
    buffer: next,
    value: value >= min && value <= max ? value : null,
    advance: next.length === 2 || value * 10 > max,
  };
}

export function hourLimits(hourCycle: HourCycle): SegmentLimits {
  return hourCycle === 'h23' ? { min: 0, max: 23 } : { min: 1, max: 12 };
}

export const MINUTE_LIMITS: SegmentLimits = { min: 0, max: 59 };

/** Варианты списка: каждые `step` минут от полуночи, в пределах min / max */
export function timeOptions(step: number, min?: IsoTime, max?: IsoTime): IsoTime[] {
  const size = Math.max(1, Math.round(step));
  const options: IsoTime[] = [];

  for (let minutes = 0; minutes < DAY_MINUTES; minutes += size) {
    const value = fromMinutes(minutes);

    if (!isTimeOutOfRange(value, min, max)) options.push(value);
  }

  return options;
}

/** Индекс варианта, ближайшего к значению: на него встаёт список при открытии */
export function closestOptionIndex(options: readonly IsoTime[], value: IsoTime | null): number {
  if (options.length === 0) return -1;
  if (!value || !parseTime(value)) return 0;

  const target = toMinutes(value);
  let best = 0;

  options.forEach((option, index) => {
    if (Math.abs(toMinutes(option) - target) < Math.abs(toMinutes(options[best]!) - target)) {
      best = index;
    }
  });

  return best;
}

/** Подпись времени по локали: «14:30» или «02:30 PM»; Intl в UTC — у времени без даты пояса нет */
export function createTimeFormatter(
  locale: string,
  hourCycle: HourCycle,
): (value: IsoTime) => string {
  const format = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle,
    timeZone: 'UTC',
  });

  return (value) => {
    const { hour, minute } = parseTime(value) ?? { hour: 0, minute: 0 };

    return format.format(new Date(Date.UTC(1970, 0, 1, hour, minute)));
  };
}

/** Подписи AM / PM в локали — из Intl, не из словаря: в части локалей это «ДП / ПП» или «午前 / 午後» */
export function dayPeriodLabels(locale: string): Record<DayPeriod, string> {
  const format = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hourCycle: 'h12',
    timeZone: 'UTC',
  });
  const label = (hour: number) =>
    format
      .formatToParts(new Date(Date.UTC(1970, 0, 1, hour)))
      .find((part) => part.type === 'dayPeriod')?.value ?? (hour < 12 ? 'AM' : 'PM');

  return { am: label(0), pm: label(12) };
}
