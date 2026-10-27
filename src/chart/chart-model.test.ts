import { describe, expect, it } from 'vitest';

import {
  arcPath,
  barPath,
  barSlots,
  BAR_MAX,
  chartPalette,
  colorValue,
  donutSegments,
  endLabelsFit,
  foldTail,
  seriesColor,
  stackSeries,
  timeFormatOptions,
  totalAt,
  valueExtent,
  type ChartSeries,
} from './chart-model';

const series = (
  id: string,
  data: (number | null)[],
  color?: ChartSeries['color'],
): ChartSeries => ({
  id,
  label: id,
  data,
  color,
});

describe('цвета рядов', () => {
  it('единственный ряд — акцент, несколько — слоты по порядку', () => {
    expect(seriesColor(series('a', []), 0, 1)).toBe('accent');
    expect(seriesColor(series('a', []), 0, 3)).toBe(1);
    expect(seriesColor(series('c', []), 2, 3)).toBe(3);
  });

  it('свой цвет у ряда побеждает порядок — выжившие ряды не перекрашиваются', () => {
    expect(seriesColor(series('b', [], 2), 0, 1)).toBe(2);
  });

  it('после шестого — серый, а не новый оттенок', () => {
    expect(seriesColor(series('g', []), 6, 8)).toBe('neutral');
  });

  it('палитра — шесть цветов без повторов', () => {
    expect(new Set(chartPalette).size).toBe(6);
    expect(colorValue(3)).toBe('var(--chart-series-3)');
    expect(colorValue('danger')).toBe('var(--chart-danger)');
  });
});

describe('stackSeries', () => {
  it('положительные растут вверх, отрицательные — вниз своими стопками', () => {
    const stacks = stackSeries([series('a', [3, -2, null]), series('b', [4, -1, 5])]);

    expect(stacks[0]).toEqual([[0, 3], [0, -2], null]);
    expect(stacks[1]).toEqual([
      [3, 7],
      [-2, -3],
      [0, 5],
    ]);
  });

  it('размах стопки и сумма категории', () => {
    const list = [series('a', [3, -2]), series('b', [4, -1])];

    expect(valueExtent(list, { stacked: true })).toEqual({ min: -3, max: 7 });
    expect(totalAt(list, 0)).toBe(7);
  });

  it('размах от нуля и пустые данные', () => {
    expect(valueExtent([series('a', [5, 9])], { includeZero: true })).toEqual({ min: 0, max: 9 });
    expect(valueExtent([series('a', [null, null])])).toBeNull();
  });
});

describe('barSlots', () => {
  it('сгруппированные — рядом через 2 px, по центру полосы, не толще 24 px', () => {
    const slots = barSlots(200, 3, false);

    expect(slots.every((slot) => slot.width === BAR_MAX)).toBe(true);
    expect(slots[1]!.offset - slots[0]!.offset).toBe(BAR_MAX + 2);

    const group = slots.at(-1)!.offset + BAR_MAX - slots[0]!.offset;

    expect(slots[0]!.offset).toBeCloseTo((200 - group) / 2);
  });

  it('узкая полоса — столбцы тоньше, воздух остаётся', () => {
    const [slot] = barSlots(20, 1, false);

    expect(slot!.width).toBeLessThan(20);
  });

  it('сложенные — один столбец на всех', () => {
    const slots = barSlots(100, 3, true);

    expect(new Set(slots.map((slot) => slot.offset)).size).toBe(1);
  });
});

describe('barPath', () => {
  it('скруглён только конец со значением', () => {
    const up = barPath(0, 10, 100, 40);

    expect(up.startsWith('M0 100 L0 44 Q0 40 4 40')).toBe(true);
    expect(up.endsWith('L10 100 Z')).toBe(true);
  });

  it('отрицательный столбец скруглён снизу', () => {
    expect(barPath(0, 10, 50, 80)).toContain('Q0 80 4 80');
  });

  it('маленькое значение — радиус не больше высоты, ноль — без столбца', () => {
    expect(barPath(0, 10, 100, 98)).toContain('Q0 98 2 98');
    expect(barPath(0, 10, 100, 100)).toBe('');
  });
});

describe('кольцо', () => {
  it('доли и углы от 12 часов по часовой, нули пропускаются', () => {
    const segments = donutSegments([1, 0, 3, null]);

    expect(segments.map((segment) => segment.index)).toEqual([0, 2]);
    expect(segments[0]!.share).toBe(0.25);
    expect(segments[1]!.end).toBeCloseTo(Math.PI * 2);
  });

  it('пусто без положительных значений', () => {
    expect(donutSegments([0, null, -1])).toEqual([]);
  });

  it('сегмент — замкнутый контур, целое кольцо — две окружности', () => {
    expect(arcPath(50, 50, 40, 28, 0, Math.PI / 2)).toMatch(/^M[\d.]+ [\d.]+ A40 40 0 0 1 .* Z$/);
    expect(arcPath(50, 50, 40, 28, 0, Math.PI * 2).match(/Z/g)).toHaveLength(2);
  });

  it('хвост больше шести сворачивается в «прочее»', () => {
    const folded = foldTail(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      [8, 7, 6, 5, 4, 3, 2, 1],
      'Прочее',
    );

    expect(folded.categories).toEqual(['a', 'b', 'c', 'd', 'e', 'Прочее']);
    expect(folded.values.at(-1)).toBe(6);
    expect(folded.folded).toBe(3);
    expect(foldTail(['a'], [1], 'x').folded).toBe(0);
  });
});

describe('timeFormatOptions', () => {
  const at = (day: number, hour = 0) => new Date(2026, 9, day, hour).getTime();

  it('часы, дни, месяцы — по медианному шагу', () => {
    expect(timeFormatOptions([at(1, 0), at(1, 1), at(1, 2)])).toHaveProperty('hour');
    expect(timeFormatOptions([at(1), at(2), at(3), at(10)])).toEqual({
      day: 'numeric',
      month: 'short',
    });
    expect(
      timeFormatOptions([new Date(2026, 0, 1).getTime(), new Date(2026, 1, 1).getTime()]),
    ).toEqual({ month: 'short' });
  });

  it('год — только при переходе через год', () => {
    expect(
      timeFormatOptions([new Date(2025, 11, 1).getTime(), new Date(2026, 0, 1).getTime()]),
    ).toEqual({ month: 'short', year: 'numeric' });
  });
});

describe('endLabelsFit', () => {
  it('подписи концов — только если не налезают', () => {
    expect(endLabelsFit([10, 40, 80], 14)).toBe(true);
    expect(endLabelsFit([10, 18, 80], 14)).toBe(false);
  });
});
