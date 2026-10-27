import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  daysInMonth,
  endOfMonth,
  endOfWeek,
  formatIsoDate,
  formatIsoDateRange,
  isLeapYear,
  isOutOfRange,
  isSameMonth,
  monthGrid,
  monthName,
  moveByKey,
  parseIsoDate,
  startOfWeek,
  todayIsoDate,
  toIsoDate,
  weekday,
  weekdayLabels,
} from './calendar-date';

describe('високосные годы и длина месяцев', () => {
  it('високосный: делится на 4, кроме веков, кроме кратных 400', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it('дней в месяце', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('parseIsoDate / toIsoDate', () => {
  it('разбирает и собирает обратно', () => {
    expect(parseIsoDate('2026-10-26')).toEqual({ year: 2026, month: 10, day: 26 });
    expect(toIsoDate({ year: 2026, month: 3, day: 5 })).toBe('2026-03-05');
  });

  it('несуществующие дни и мусор — null', () => {
    expect(parseIsoDate('2026-02-29')).toBeNull();
    expect(parseIsoDate('2024-02-29')).not.toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('26.10.2026')).toBeNull();
  });
});

describe('арифметика', () => {
  it('addDays переходит границы месяца и года', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('addDays не спотыкается о перевод часов', () => {
    // 29 марта 2026 в Европе переводят часы; в UTC сутки всегда 24 часа
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('addMonths прижимает день к концу короткого месяца', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -13)).toBe('2024-12-15');
  });

  it('addYears с 29 февраля — на 28-е', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(addYears('2024-02-29', 4)).toBe('2028-02-29');
  });
});

describe('недели', () => {
  it('день недели', () => {
    expect(weekday('2026-10-26')).toBe(1);
    expect(weekday('2026-11-01')).toBe(0);
  });

  it('начало и конец недели с понедельника и с воскресенья', () => {
    expect(startOfWeek('2026-10-28', 1)).toBe('2026-10-26');
    expect(endOfWeek('2026-10-28', 1)).toBe('2026-11-01');
    expect(startOfWeek('2026-11-01', 1)).toBe('2026-10-26');
    expect(startOfWeek('2026-10-28', 0)).toBe('2026-10-25');
    expect(endOfWeek('2026-10-28', 0)).toBe('2026-10-31');
  });
});

describe('monthGrid', () => {
  it('всегда 6 недель по 7 дней, первая — с начала недели', () => {
    const grid = monthGrid('2026-10-15', 1);

    expect(grid).toHaveLength(6);
    grid.forEach((week) => expect(week).toHaveLength(7));
    // 1 октября 2026 — четверг: неделя с понедельника начинается 28 сентября
    expect(grid[0]![0]).toBe('2026-09-28');
    expect(grid[0]![3]).toBe('2026-10-01');
    expect(grid[5]![6]).toBe('2026-11-08');
  });

  it('неделя с воскресенья сдвигает сетку', () => {
    expect(monthGrid('2026-10-15', 0)[0]![0]).toBe('2026-09-27');
  });

  it('месяц, начавшийся с первого дня недели, — без хвоста слева', () => {
    // 1 февраля 2027 — понедельник
    expect(monthGrid('2027-02-10', 1)[0]![0]).toBe('2027-02-01');
  });

  it('февраль високосного года целиком в сетке', () => {
    const days = monthGrid('2024-02-01', 1).flat();

    expect(days).toContain('2024-02-29');
    expect(days.filter((day) => isSameMonth(day, '2024-02-01'))).toHaveLength(29);
  });
});

describe('границы', () => {
  it('clampDate и isOutOfRange', () => {
    expect(clampDate('2026-10-01', '2026-10-10', '2026-10-20')).toBe('2026-10-10');
    expect(clampDate('2026-10-25', '2026-10-10', '2026-10-20')).toBe('2026-10-20');
    expect(clampDate('2026-10-15')).toBe('2026-10-15');
    expect(isOutOfRange('2026-10-09', '2026-10-10')).toBe(true);
    expect(isOutOfRange('2026-10-10', '2026-10-10', '2026-10-10')).toBe(false);
  });

  it('todayIsoDate — по местным часам', () => {
    expect(todayIsoDate(new Date(2026, 9, 26, 23, 59))).toBe('2026-10-26');
  });
});

describe('moveByKey', () => {
  const at = '2026-10-28';

  it('стрелки — день и неделя', () => {
    expect(moveByKey(at, { key: 'ArrowLeft' }, 1)).toBe('2026-10-27');
    expect(moveByKey(at, { key: 'ArrowRight' }, 1)).toBe('2026-10-29');
    expect(moveByKey(at, { key: 'ArrowUp' }, 1)).toBe('2026-10-21');
    expect(moveByKey(at, { key: 'ArrowDown' }, 1)).toBe('2026-11-04');
  });

  it('PageUp / PageDown — месяц, с Shift — год', () => {
    expect(moveByKey('2026-03-31', { key: 'PageUp' }, 1)).toBe('2026-02-28');
    expect(moveByKey(at, { key: 'PageDown' }, 1)).toBe('2026-11-28');
    expect(moveByKey(at, { key: 'PageDown', shiftKey: true }, 1)).toBe('2027-10-28');
  });

  it('Home / End — неделя по weekStartsOn', () => {
    expect(moveByKey(at, { key: 'Home' }, 1)).toBe('2026-10-26');
    expect(moveByKey(at, { key: 'End' }, 1)).toBe('2026-11-01');
    expect(moveByKey(at, { key: 'Home' }, 0)).toBe('2026-10-25');
  });

  it('чужая клавиша — null', () => {
    expect(moveByKey(at, { key: 'Enter' }, 1)).toBeNull();
  });
});

describe('подписи на Intl', () => {
  it('дни недели по-русски с понедельника и по-английски с воскресенья', () => {
    const ru = weekdayLabels('ru', 1);
    const en = weekdayLabels('en-US', 0);

    expect(ru.map((label) => label.short)).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
    expect(ru[0]!.long).toBe('понедельник');
    expect(en[0]!.short).toBe('Sun');
  });

  it('название месяца — именительный падеж с заглавной', () => {
    expect(monthName('2026-10-26', 'ru')).toBe('Октябрь');
    expect(monthName('2026-05-01', 'en')).toBe('May');
  });

  it('дата не сдвигается часовым поясом', () => {
    expect(formatIsoDate('2026-01-01', 'ru', { day: 'numeric', month: 'long' })).toBe('1 января');
  });
});

describe('endOfMonth и подпись периода', () => {
  it('последний день месяца с учётом високосного февраля', () => {
    expect(endOfMonth('2026-10-14')).toBe('2026-10-31');
    expect(endOfMonth('2024-02-01')).toBe('2024-02-29');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
  });

  it('период не повторяет общий месяц и год', () => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' } as const;
    // Intl ставит узкие неразрывные пробелы перед «г.» и вокруг тире — сравниваем по смыслу
    const range = (start: string, end: string) =>
      formatIsoDateRange(start, end, 'ru', options).replace(/\s/g, ' ');

    expect(range('2026-10-01', '2026-10-07')).toBe('1–7 октября 2026 г.');
    expect(range('2026-10-28', '2026-11-03')).toBe('28 октября – 3 ноября 2026 г.');
    expect(range('2026-10-05', '2026-10-05')).toBe('5 октября 2026 г.');
  });
});
