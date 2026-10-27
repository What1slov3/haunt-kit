import type { Weekday } from '../calendar/calendar-date';

interface WeekInfo {
  /** 1 — понедельник … 7 — воскресенье */
  firstDay: number;
}

type LocaleWithWeek = Intl.Locale & {
  getWeekInfo?: () => WeekInfo;
  weekInfo?: WeekInfo;
};

/*
 * Регионы, где неделя начинается с воскресенья, — запас на случай движка без Intl.Locale#getWeekInfo
 * (Firefox, старый WebKitGTK в Tauri на Linux). Список по CLDR, только крупные: ошибка здесь — сдвиг
 * сетки на день, а не неверные данные.
 */
const SUNDAY_REGIONS = new Set(['US', 'CA', 'MX', 'BR', 'JP', 'KR', 'TW', 'HK', 'IL', 'PH', 'IN']);

/** Первый день недели по локали: «ru» — понедельник, «en-US» — воскресенье */
export function weekStartForLocale(locale: string): Weekday {
  try {
    const parsed = new Intl.Locale(locale) as LocaleWithWeek;
    const info = parsed.getWeekInfo?.() ?? parsed.weekInfo;

    if (info && info.firstDay >= 1 && info.firstDay <= 7) return (info.firstDay % 7) as Weekday;

    const region = parsed.maximize().region;

    return region && SUNDAY_REGIONS.has(region) ? 0 : 1;
  } catch {
    return 1;
  }
}
