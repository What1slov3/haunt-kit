import {
  addDays,
  parseIsoDate,
  startOfWeek,
  weekday,
  type IsoDate,
  type Weekday,
} from '../calendar/calendar-date';

/*
 * Раскладка календаря активности: столбцы — недели, строки — дни недели в порядке локали. Дни вне
 * периода — null: сетка остаётся прямоугольной, а первый и последний столбец — неполными, как у GitHub.
 */

export interface HeatmapLayout {
  /** Недели слева направо; в каждой 7 дней в порядке строк, null — вне периода */
  weeks: (IsoDate | null)[][];
  /** Подписи месяцев: столбец, где месяц начинается, и первый день месяца */
  months: { week: number; month: IsoDate }[];
}

/** Подпись месяца шириной около трёх столбцов: ближе — налезут, вторая пропускается */
const MONTH_LABEL_WEEKS = 3;

export function heatmapLayout(start: IsoDate, end: IsoDate, weekStartsOn: Weekday): HeatmapLayout {
  if (end < start) return { weeks: [], months: [] };

  const weeks: (IsoDate | null)[][] = [];
  const starts: HeatmapLayout['months'] = [];
  let cursor = startOfWeek(start, weekStartsOn);

  while (cursor <= end) {
    const week = Array.from({ length: 7 }, (_, row) => {
      const date = addDays(cursor, row);

      return date < start || date > end ? null : date;
    });
    const first = week.find((date) => date !== null && date.endsWith('-01'));

    if (first) starts.push({ week: weeks.length, month: first });

    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  // Месяц, с которого начинается период, подписан в первом столбце — если до начала следующего есть место
  const opening = starts[0]?.week === 0 ? [] : [{ week: 0, month: `${start.slice(0, 7)}-01` }];
  const months: HeatmapLayout['months'] = [];

  for (const label of [...opening, ...starts]) {
    const previous = months.at(-1);

    if (!previous || label.week - previous.week >= MONTH_LABEL_WEEKS) months.push(label);
    else if (previous.week === 0 && opening.length) months[months.length - 1] = label;
  }

  return { weeks, months };
}

/** Строка дня в сетке при начале недели `weekStartsOn` */
export function rowOf(date: IsoDate, weekStartsOn: Weekday): number {
  return (weekday(date) - weekStartsOn + 7) % 7;
}

/**
 * Уровень цвета 0–levels: 0 — пусто, остальное — равными долями от максимума. Линейно, а не квантилями:
 * «вдвое темнее — вдвое больше» читается без легенды, а один всплеск активности не перекрашивает год.
 */
export function heatLevel(value: number, max: number, levels = 4): number {
  if (!(value > 0) || !(max > 0)) return 0;

  return Math.min(levels, Math.max(1, Math.ceil((value / max) * levels)));
}

/** Максимум за период — шкала не зависит от дней вне сетки */
export function maxInRange(
  values: Readonly<Record<IsoDate, number>>,
  start: IsoDate,
  end: IsoDate,
): number {
  let max = 0;

  for (const [date, value] of Object.entries(values)) {
    if (date >= start && date <= end && Number.isFinite(value)) max = Math.max(max, value);
  }

  return max;
}

/** Период по умолчанию — год до `end` включительно: 53 столбца, как у GitHub */
export function defaultStart(end: IsoDate, weeks = 53): IsoDate {
  return addDays(end, -(weeks * 7 - 1));
}

/**
 * Куда уходит фокус по стрелке: вверх / вниз — соседний день, влево / вправо — неделя. Home / End — начало
 * и конец периода. За пределы периода не выходит; null — клавиша не сетки.
 */
export function moveHeatmapFocus(
  date: IsoDate,
  key: string,
  start: IsoDate,
  end: IsoDate,
): IsoDate | null {
  const delta: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

  if (key === 'Home') return start;
  if (key === 'End') return end;

  const step = delta[key];

  if (step === undefined || !parseIsoDate(date)) return null;

  const next = addDays(date, step);

  return next < start || next > end ? date : next;
}
