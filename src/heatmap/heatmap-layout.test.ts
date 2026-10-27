import { describe, expect, it } from 'vitest';

import {
  defaultStart,
  heatLevel,
  heatmapLayout,
  maxInRange,
  moveHeatmapFocus,
  rowOf,
} from './heatmap-layout';
import { weekStartForLocale } from './week-start';

describe('heatmapLayout', () => {
  // 2026-10-01 — четверг
  it('столбцы — недели с понедельника, дни вне периода — null', () => {
    const { weeks } = heatmapLayout('2026-10-01', '2026-10-14', 1);

    expect(weeks).toHaveLength(3);
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks[2]).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', null, null, null, null]);
  });

  it('неделя с воскресенья сдвигает строки', () => {
    const { weeks } = heatmapLayout('2026-10-01', '2026-10-03', 0);

    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(rowOf('2026-10-04', 0)).toBe(0);
    expect(rowOf('2026-10-04', 1)).toBe(6);
  });

  it('подпись месяца — в столбце, где он начинается', () => {
    const { months } = heatmapLayout('2026-09-01', '2026-11-30', 1);

    expect(months.map((month) => month.month)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect(months[0]!.week).toBe(0);
    expect(months[1]!.week).toBe(4);
  });

  it('первый столбец подписан месяцем начала; тесная подпись уступает настоящему 1-му числу', () => {
    expect(heatmapLayout('2026-09-10', '2026-11-30', 1).months[0]).toEqual({
      week: 0,
      month: '2026-09-01',
    });

    const tight = heatmapLayout('2026-09-25', '2026-11-30', 1).months;

    expect(tight[0]).toEqual({ week: 1, month: '2026-10-01' });
  });

  it('пустой период', () => {
    expect(heatmapLayout('2026-10-02', '2026-10-01', 1)).toEqual({ weeks: [], months: [] });
  });

  it('год по умолчанию — 53 недели до конца включительно', () => {
    expect(defaultStart('2026-10-26')).toBe('2025-10-21');
    expect(
      heatmapLayout(defaultStart('2026-10-26'), '2026-10-26', 1).weeks.length,
    ).toBeGreaterThanOrEqual(53);
  });
});

describe('heatLevel', () => {
  it('ноль и пусто — 0, остальное — доли максимума', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(5, 10)).toBe(2);
    expect(heatLevel(10, 10)).toBe(4);
    expect(heatLevel(3, 0)).toBe(0);
  });

  it('максимум — только внутри периода', () => {
    expect(
      maxInRange(
        { '2026-01-01': 100, '2026-10-01': 7, '2026-10-02': 3 },
        '2026-09-01',
        '2026-10-31',
      ),
    ).toBe(7);
  });
});

describe('moveHeatmapFocus', () => {
  it('стрелки — день и неделя, у края стоим', () => {
    expect(moveHeatmapFocus('2026-10-10', 'ArrowDown', '2026-10-01', '2026-10-31')).toBe(
      '2026-10-11',
    );
    expect(moveHeatmapFocus('2026-10-10', 'ArrowRight', '2026-10-01', '2026-10-31')).toBe(
      '2026-10-17',
    );
    expect(moveHeatmapFocus('2026-10-03', 'ArrowLeft', '2026-10-01', '2026-10-31')).toBe(
      '2026-10-03',
    );
    expect(moveHeatmapFocus('2026-10-10', 'End', '2026-10-01', '2026-10-31')).toBe('2026-10-31');
    expect(moveHeatmapFocus('2026-10-10', 'a', '2026-10-01', '2026-10-31')).toBeNull();
  });
});

describe('weekStartForLocale', () => {
  it('по локали', () => {
    expect(weekStartForLocale('ru')).toBe(1);
    expect(weekStartForLocale('en-US')).toBe(0);
    expect(weekStartForLocale('en-GB')).toBe(1);
    expect(weekStartForLocale('не локаль')).toBe(1);
  });
});
