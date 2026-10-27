import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatRelative,
  HOURS_REFRESH,
  MINUTES_REFRESH,
  refreshDelay,
  toDate,
} from './timestamp-format';

// Intl местами ставит неразрывные пробелы («2025 г.») — сравниваем с обычными
const plain = (text: string) => text.replace(/\s/g, ' ');

// Даты — локальным конструктором: тесты не зависят от часового пояса машины
const now = new Date(2026, 9, 26, 15, 0, 0);

function ago(ms: number): Date {
  return new Date(now.getTime() - ms);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('formatRelative', () => {
  it('меньше 45 с — «сейчас», в обе стороны', () => {
    expect(plain(formatRelative(ago(10_000), now))).toBe('сейчас');
    expect(plain(formatRelative(ago(-10_000), now))).toBe('сейчас');
  });

  it('минуты — компактно, без «назад»; от 45 с — уже минута', () => {
    expect(plain(formatRelative(ago(50_000), now))).toBe('1 мин');
    expect(plain(formatRelative(ago(5 * MINUTE), now))).toBe('5 мин');
    expect(plain(formatRelative(ago(59 * MINUTE + 59_000), now))).toBe('59 мин');
  });

  it('часы — в пределах сегодняшнего дня', () => {
    expect(plain(formatRelative(ago(3 * HOUR), now))).toBe('3 ч');
  });

  it('вчера — со временем', () => {
    expect(plain(formatRelative(new Date(2026, 9, 25, 12, 40), now))).toBe('вчера в 12:40');
  });

  it('вчера, но меньше часа назад — всё ещё минуты', () => {
    const justAfterMidnight = new Date(2026, 9, 26, 0, 10);

    expect(plain(formatRelative(new Date(2026, 9, 25, 23, 50), justAfterMidnight))).toBe('20 мин');
  });

  it('раньше — дата; год только если не текущий', () => {
    expect(plain(formatRelative(new Date(2026, 2, 12, 9, 0), now))).toBe('12 мар.');
    expect(plain(formatRelative(new Date(2025, 2, 12, 9, 0), now))).toBe('12 мар. 2025 г.');
  });

  it('будущее — «через…» и «завтра в…»', () => {
    expect(plain(formatRelative(ago(-5 * MINUTE), now))).toBe('через 5 мин.');
    expect(plain(formatRelative(ago(-3 * HOUR), now))).toBe('через 3 ч');
    expect(plain(formatRelative(new Date(2026, 9, 27, 9, 30), now))).toBe('завтра в 09:30');
  });

  it('локаль параметром; для языка без связки — запятая', () => {
    expect(plain(formatRelative(ago(5 * MINUTE), now, 'en'))).toBe('5 min');
    expect(plain(formatRelative(new Date(2026, 9, 25, 12, 40), now, 'en'))).toBe(
      `yesterday at ${formatClock(new Date(2026, 9, 25, 12, 40), 'en')}`,
    );
    expect(plain(formatRelative(new Date(2026, 9, 25, 12, 40), now, 'de'))).toMatch(/^gestern, /);
  });
});

describe('refreshDelay', () => {
  it('пока минуты — раз в 30 с', () => {
    expect(refreshDelay(ago(5 * MINUTE), now)).toBe(MINUTES_REFRESH);
    expect(refreshDelay(ago(-5 * MINUTE), now)).toBe(MINUTES_REFRESH);
  });

  it('часы — раз в 5 мин, но не позже полуночи', () => {
    expect(refreshDelay(ago(3 * HOUR), now)).toBe(HOURS_REFRESH);

    const lateEvening = new Date(2026, 9, 26, 23, 58);

    expect(refreshDelay(new Date(2026, 9, 26, 20, 0), lateEvening)).toBe(2 * MINUTE);
  });

  it('вчера — до полуночи, потом станет датой', () => {
    expect(refreshDelay(new Date(2026, 9, 25, 12, 40), now)).toBe(9 * HOUR);
  });

  it('старая дата больше не меняется', () => {
    expect(refreshDelay(new Date(2026, 2, 12), now)).toBeNull();
  });
});

describe('toDate', () => {
  it('принимает Date, ISO-строку и число', () => {
    const date = new Date(2026, 0, 1);

    expect(toDate(date)).toBe(date);
    expect(toDate(date.toISOString()).getTime()).toBe(date.getTime());
    expect(toDate(date.getTime()).getTime()).toBe(date.getTime());
  });
});
