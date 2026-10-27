import { describe, expect, it } from 'vitest';

import { cellAt, columnLabel, gridLabels, rowLabel } from './grid-labels';

describe('columnLabel', () => {
  it('A…Z, затем AA, AZ, BA', () => {
    expect(columnLabel(0)).toBe('A');
    expect(columnLabel(25)).toBe('Z');
    expect(columnLabel(26)).toBe('AA');
    expect(columnLabel(51)).toBe('AZ');
    expect(columnLabel(52)).toBe('BA');
    expect(columnLabel(701)).toBe('ZZ');
    expect(columnLabel(702)).toBe('AAA');
  });
});

describe('rowLabel', () => {
  it('с единицы и ведущим нулём', () => {
    expect(rowLabel(0)).toBe('01');
    expect(rowLabel(9)).toBe('10');
    expect(rowLabel(122)).toBe('123');
  });
});

describe('gridLabels', () => {
  it('только целые ячейки', () => {
    expect(gridLabels(100, 70, 32)).toEqual({ columns: ['A', 'B', 'C'], rows: ['01', '02'] });
  });

  it('без размеров — пусто', () => {
    expect(gridLabels(0, 0, 32)).toEqual({ columns: [], rows: [] });
    expect(gridLabels(100, 100, 0)).toEqual({ columns: [], rows: [] });
  });
});

describe('cellAt', () => {
  it('ячейка под точкой', () => {
    expect(cellAt(0, 0, 32)).toBe('A-01');
    expect(cellAt(70, 100, 32)).toBe('C-04');
  });

  it('за краем — нет ячейки', () => {
    expect(cellAt(-1, 10, 32)).toBeNull();
  });
});
