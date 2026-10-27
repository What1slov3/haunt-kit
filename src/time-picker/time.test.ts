import { describe, expect, it } from 'vitest';

import {
  clampTime,
  closestOptionIndex,
  createTimeFormatter,
  dayPeriodLabels,
  displayHour,
  formatTime,
  fromDisplayHour,
  fromMinutes,
  hourLimits,
  isTimeOutOfRange,
  MINUTE_LIMITS,
  parseTime,
  partsFromValue,
  setPeriod,
  stepHour,
  stepMinute,
  timeOptions,
  toMinutes,
  togglePeriod,
  typeDigit,
  valueFromParts,
  type TimeParts,
} from './time';

const parts = (
  hour: number | null,
  minute: number | null,
  period: 'am' | 'pm' = 'am',
): TimeParts => ({
  hour,
  minute,
  period,
});

describe('разбор и запись', () => {
  it('HH:MM туда и обратно', () => {
    expect(parseTime('09:05')).toEqual({ hour: 9, minute: 5 });
    expect(formatTime({ hour: 9, minute: 5 })).toBe('09:05');
  });

  it('несуществующее и мусор — null', () => {
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('9:05')).toBeNull();
    expect(parseTime('')).toBeNull();
  });

  it('минуты от полуночи, по кругу за пределами суток', () => {
    expect(toMinutes('01:30')).toBe(90);
    expect(fromMinutes(90)).toBe('01:30');
    expect(fromMinutes(-15)).toBe('23:45');
    expect(fromMinutes(24 * 60)).toBe('00:00');
  });

  it('min / max — строковое сравнение', () => {
    expect(isTimeOutOfRange('08:59', '09:00', '18:00')).toBe(true);
    expect(isTimeOutOfRange('18:00', '09:00', '18:00')).toBe(false);
    expect(clampTime('19:30', '09:00', '18:00')).toBe('18:00');
    expect(clampTime('07:00', '09:00')).toBe('09:00');
  });

  it('части поля и значение', () => {
    expect(partsFromValue('13:15')).toEqual(parts(13, 15, 'pm'));
    expect(partsFromValue(null, 'pm')).toEqual(parts(null, null, 'pm'));
    expect(valueFromParts(parts(13, 15))).toBe('13:15');
    expect(valueFromParts(parts(13, null))).toBeNull();
  });
});

describe('12-часовой вид', () => {
  it('показ часа и обратно', () => {
    expect(displayHour(0, 'h12')).toBe(12);
    expect(displayHour(13, 'h12')).toBe(1);
    expect(displayHour(12, 'h12')).toBe(12);
    expect(displayHour(13, 'h23')).toBe(13);
    expect(fromDisplayHour(12, 'am')).toBe(0);
    expect(fromDisplayHour(12, 'pm')).toBe(12);
    expect(fromDisplayHour(1, 'pm')).toBe(13);
  });

  it('смена периода сдвигает час на 12', () => {
    expect(togglePeriod(parts(9, 0))).toEqual(parts(21, 0, 'pm'));
    expect(togglePeriod(parts(null, 30, 'am'))).toEqual(parts(null, 30, 'pm'));
    expect(setPeriod(parts(21, 0, 'pm'), 'am')).toEqual(parts(9, 0, 'am'));
    expect(setPeriod(parts(9, 0, 'am'), 'am')).toEqual(parts(9, 0, 'am'));
  });

  it('подписи периода из Intl', () => {
    expect(dayPeriodLabels('en-US')).toEqual({ am: 'AM', pm: 'PM' });
  });
});

describe('стрелки', () => {
  it('часы по кругу, без переноса', () => {
    expect(stepHour(parts(23, 10), 1, 'h23').hour).toBe(0);
    expect(stepHour(parts(0, 10), -1, 'h23').hour).toBe(23);
  });

  it('пустой час: ↑ — начало круга, ↓ — конец', () => {
    expect(stepHour(parts(null, null), 1, 'h23').hour).toBe(0);
    expect(stepHour(parts(null, null), -1, 'h23').hour).toBe(23);
    expect(stepHour(parts(null, null, 'pm'), 1, 'h12').hour).toBe(12);
    expect(stepHour(parts(null, null, 'pm'), -1, 'h12').hour).toBe(23);
  });

  it('в 12-часовом виде период не меняется стрелкой часов', () => {
    expect(stepHour(parts(11, 0), 1, 'h12')).toEqual(parts(0, 0, 'am'));
    expect(stepHour(parts(12, 0, 'pm'), -1, 'h12')).toEqual(parts(23, 0, 'pm'));
  });

  it('минуты встают на отметку шага в сторону нажатия', () => {
    expect(stepMinute(parts(9, 7), 1, 15).minute).toBe(15);
    expect(stepMinute(parts(9, 7), -1, 15).minute).toBe(0);
    expect(stepMinute(parts(9, 15), 1, 15).minute).toBe(30);
    expect(stepMinute(parts(9, 45), 1, 15).minute).toBe(0);
    expect(stepMinute(parts(9, 0), -1, 15).minute).toBe(45);
    expect(stepMinute(parts(9, 59), 1, 1).minute).toBe(0);
  });

  it('пустые минуты: ↑ — 00, ↓ — последняя отметка', () => {
    expect(stepMinute(parts(9, null), 1, 15).minute).toBe(0);
    expect(stepMinute(parts(9, null), -1, 15).minute).toBe(45);
  });
});

describe('ввод цифр', () => {
  const h23 = hourLimits('h23');
  const h12 = hourLimits('h12');

  it('часы: 1 и 2 ждут вторую цифру, 3–9 — сразу дальше', () => {
    expect(typeDigit('', '1', h23)).toEqual({ buffer: '1', value: 1, advance: false });
    expect(typeDigit('1', '4', h23)).toEqual({ buffer: '14', value: 14, advance: true });
    expect(typeDigit('', '3', h23)).toEqual({ buffer: '3', value: 3, advance: true });
  });

  it('цифра за краем начинает ввод заново', () => {
    expect(typeDigit('2', '7', h23)).toEqual({ buffer: '7', value: 7, advance: true });
    expect(typeDigit('14', '5', h23)).toEqual({ buffer: '5', value: 5, advance: true });
  });

  it('минуты: 6–9 — сразу дальше, 0–5 ждут', () => {
    expect(typeDigit('', '6', MINUTE_LIMITS)).toEqual({ buffer: '6', value: 6, advance: true });
    expect(typeDigit('', '5', MINUTE_LIMITS)).toEqual({ buffer: '5', value: 5, advance: false });
    expect(typeDigit('5', '9', MINUTE_LIMITS)).toEqual({ buffer: '59', value: 59, advance: true });
  });

  it('12 ч: ноль ещё не час, 13 начинает заново', () => {
    expect(typeDigit('', '0', h12)).toEqual({ buffer: '0', value: null, advance: false });
    expect(typeDigit('0', '5', h12)).toEqual({ buffer: '05', value: 5, advance: true });
    expect(typeDigit('1', '3', h12)).toEqual({ buffer: '3', value: 3, advance: true });
  });
});

describe('список вариантов', () => {
  it('каждые step минут в пределах min / max', () => {
    expect(timeOptions(30).length).toBe(48);
    expect(timeOptions(15).slice(0, 3)).toEqual(['00:00', '00:15', '00:30']);
    expect(timeOptions(30, '09:00', '11:00')).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
    ]);
  });

  it('ближайший вариант к значению', () => {
    const options = timeOptions(30, '09:00', '11:00');

    expect(closestOptionIndex(options, '10:10')).toBe(2);
    expect(closestOptionIndex(options, '10:20')).toBe(3);
    expect(closestOptionIndex(options, '23:00')).toBe(4);
    expect(closestOptionIndex(options, null)).toBe(0);
    expect(closestOptionIndex([], '10:00')).toBe(-1);
  });

  it('подпись по локали и циклу часов', () => {
    expect(createTimeFormatter('ru', 'h23')('09:05')).toBe('09:05');
    expect(createTimeFormatter('en-US', 'h12')('13:30')).toMatch(/^01:30\sPM$/);
  });
});
