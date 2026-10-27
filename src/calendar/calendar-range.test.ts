import { describe, expect, it } from 'vitest';

import { weekday } from './calendar-date';
import {
  isSameRange,
  isWithinBounds,
  normalizeRange,
  previewRange,
  rangeBounds,
  rangePosition,
  visibleStartMonth,
} from './calendar-range';

describe('normalizeRange / isSameRange', () => {
  it('концы по порядку, какой бы ни кликнули первым', () => {
    expect(normalizeRange('2026-10-20', '2026-10-05')).toEqual({
      start: '2026-10-05',
      end: '2026-10-20',
    });
    expect(normalizeRange('2026-10-05', '2026-10-05')).toEqual({
      start: '2026-10-05',
      end: '2026-10-05',
    });
  });

  it('сравнение по значениям, null равен только null', () => {
    expect(
      isSameRange(
        { start: '2026-10-01', end: '2026-10-02' },
        normalizeRange('2026-10-02', '2026-10-01'),
      ),
    ).toBe(true);
    expect(isSameRange(null, null)).toBe(true);
    expect(isSameRange(null, { start: '2026-10-01', end: '2026-10-01' })).toBe(false);
  });
});

describe('rangePosition', () => {
  const range = { start: '2026-10-05', end: '2026-10-09' };

  it('концы, середина и снаружи', () => {
    expect(rangePosition('2026-10-05', range)).toBe('start');
    expect(rangePosition('2026-10-07', range)).toBe('middle');
    expect(rangePosition('2026-10-09', range)).toBe('end');
    expect(rangePosition('2026-10-04', range)).toBeNull();
    expect(rangePosition('2026-10-10', range)).toBeNull();
    expect(rangePosition('2026-10-07', null)).toBeNull();
  });

  it('диапазон из одного дня', () => {
    expect(rangePosition('2026-10-05', { start: '2026-10-05', end: '2026-10-05' })).toBe('single');
  });
});

describe('rangeBounds', () => {
  const busy = new Set(['2026-10-03', '2026-10-15']);
  const isBusy = (day: string) => busy.has(day);

  it('останавливается перед ближайшим выключенным днём с обеих сторон', () => {
    expect(rangeBounds('2026-10-10', isBusy, '2026-09-28', '2026-11-08')).toEqual({
      from: '2026-10-04',
      to: '2026-10-14',
    });
  });

  it('без выключенных дней в просмотренном окне — без границы', () => {
    expect(rangeBounds('2026-10-20', isBusy, '2026-10-16', '2026-10-31')).toEqual({});
  });

  it('выключенный день вплотную — граница на самом начале', () => {
    expect(rangeBounds('2026-10-16', isBusy, '2026-10-01', '2026-10-31')).toEqual({
      from: '2026-10-16',
    });
  });

  it('выходные режут период рабочей неделей', () => {
    const weekend = (day: string) => [0, 6].includes(weekday(day));

    // 2026-10-14 — среда
    expect(rangeBounds('2026-10-14', weekend, '2026-10-01', '2026-10-31')).toEqual({
      from: '2026-10-12',
      to: '2026-10-16',
    });
  });

  it('isWithinBounds — включительно, пустые границы не мешают', () => {
    const bounds = { from: '2026-10-04', to: '2026-10-14' };

    expect(isWithinBounds('2026-10-04', bounds)).toBe(true);
    expect(isWithinBounds('2026-10-14', bounds)).toBe(true);
    expect(isWithinBounds('2026-10-15', bounds)).toBe(false);
    expect(isWithinBounds('2020-01-01', {})).toBe(true);
  });
});

describe('previewRange', () => {
  it('тянется от начала к курсору в любую сторону', () => {
    expect(previewRange('2026-10-10', '2026-10-12', {})).toEqual({
      start: '2026-10-10',
      end: '2026-10-12',
    });
    expect(previewRange('2026-10-10', '2026-10-07', {})).toEqual({
      start: '2026-10-07',
      end: '2026-10-10',
    });
  });

  it('за край не выходит', () => {
    const bounds = { from: '2026-10-04', to: '2026-10-14' };

    expect(previewRange('2026-10-10', '2026-10-20', bounds)).toEqual({
      start: '2026-10-10',
      end: '2026-10-14',
    });
    expect(previewRange('2026-10-10', '2026-10-01', bounds)).toEqual({
      start: '2026-10-04',
      end: '2026-10-10',
    });
  });
});

describe('visibleStartMonth', () => {
  it('фокус внутри окна — окно стоит', () => {
    expect(visibleStartMonth('2026-10-01', '2026-11-30', 2)).toBe('2026-10-01');
    expect(visibleStartMonth('2026-10-01', '2026-10-01', 2)).toBe('2026-10-01');
  });

  it('фокус ушёл вправо — последний месяц окна становится месяцем фокуса', () => {
    expect(visibleStartMonth('2026-10-01', '2026-12-01', 2)).toBe('2026-11-01');
    expect(visibleStartMonth('2026-10-01', '2027-03-31', 2)).toBe('2027-02-01');
  });

  it('фокус ушёл влево — первым становится месяц фокуса', () => {
    expect(visibleStartMonth('2026-10-01', '2026-09-30', 2)).toBe('2026-09-01');
  });

  it('один месяц — всегда месяц фокуса', () => {
    expect(visibleStartMonth('2026-10-01', '2026-11-15', 1)).toBe('2026-11-01');
    expect(visibleStartMonth('2026-10-01', '2026-10-15', 1)).toBe('2026-10-01');
  });

  it('начало окна приводится к первому числу', () => {
    expect(visibleStartMonth('2026-10-17', '2026-10-20', 2)).toBe('2026-10-01');
  });
});
