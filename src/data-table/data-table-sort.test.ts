import { describe, expect, it } from 'vitest';

import { nextSort, sortRows, type SortValue } from './data-table-sort';

interface Row {
  id: string;
  value: SortValue;
}

function rows(...values: SortValue[]): Row[] {
  return values.map((value, index) => ({ id: `r${index}`, value }));
}

function ids(sorted: Row[]): string[] {
  return sorted.map((row) => row.id);
}

const byValue = (row: Row) => row.value;

describe('sortRows', () => {
  it('числа — по величине в обе стороны', () => {
    const data = rows(3, 10, 1);

    expect(ids(sortRows(data, byValue, 'asc'))).toEqual(['r2', 'r0', 'r1']);
    expect(ids(sortRows(data, byValue, 'desc'))).toEqual(['r1', 'r0', 'r2']);
  });

  it('строки — по алфавиту локали, числа внутри строки по значению', () => {
    const data = rows('канал 10', 'Ёлка', 'канал 2', 'аудит');

    expect(sortRows(data, byValue, 'asc').map((row) => row.value)).toEqual([
      'аудит',
      'Ёлка',
      'канал 2',
      'канал 10',
    ]);
  });

  it('даты — по времени', () => {
    const data = rows(new Date(2026, 5, 1), new Date(2025, 0, 1), new Date(2026, 0, 1));

    expect(ids(sortRows(data, byValue, 'asc'))).toEqual(['r1', 'r2', 'r0']);
  });

  it('стабильна: равные сохраняют исходный порядок и по убыванию', () => {
    const data = rows(1, 2, 1, 2, 1);

    expect(ids(sortRows(data, byValue, 'asc'))).toEqual(['r0', 'r2', 'r4', 'r1', 'r3']);
    expect(ids(sortRows(data, byValue, 'desc'))).toEqual(['r1', 'r3', 'r0', 'r2', 'r4']);
  });

  it('пустые — всегда в конце, в исходном порядке', () => {
    const data = rows(null, 2, undefined, 1, Number.NaN);

    expect(ids(sortRows(data, byValue, 'asc'))).toEqual(['r3', 'r1', 'r0', 'r2', 'r4']);
    expect(ids(sortRows(data, byValue, 'desc'))).toEqual(['r1', 'r3', 'r0', 'r2', 'r4']);
  });

  it('не меняет исходный массив', () => {
    const data = rows(2, 1);

    sortRows(data, byValue, 'asc');

    expect(ids(data)).toEqual(['r0', 'r1']);
  });
});

describe('nextSort', () => {
  it('цикл: нет → по возрастанию → по убыванию → нет', () => {
    const asc = nextSort(null, 'name');
    const desc = nextSort(asc, 'name');

    expect(asc).toEqual({ key: 'name', direction: 'asc' });
    expect(desc).toEqual({ key: 'name', direction: 'desc' });
    expect(nextSort(desc, 'name')).toBeNull();
  });

  it('другая колонка начинает с возрастания', () => {
    expect(nextSort({ key: 'name', direction: 'desc' }, 'date')).toEqual({
      key: 'date',
      direction: 'asc',
    });
  });
});
