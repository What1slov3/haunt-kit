import { describe, expect, it } from 'vitest';

import { charWidth, columnWidths, tableWidth, textWidth, truncateText } from './tui-table-layout';

describe('textWidth', () => {
  it('латиница и кириллица — по клетке', () => {
    expect(textWidth('haunt')).toBe(5);
    expect(textWidth('общий')).toBe(5);
  });

  it('иероглифы и эмодзи — по две, комбинирующие — ноль', () => {
    expect(textWidth('日本')).toBe(4);
    expect(textWidth('👻')).toBe(2);
    expect(charWidth('\u0301')).toBe(0);
    expect(textWidth('е\u0301')).toBe(1);
  });
});

describe('truncateText', () => {
  it('влезает — как есть', () => {
    expect(truncateText('general', 7)).toBe('general');
  });

  it('не влезает — многоточие в последней клетке', () => {
    expect(truncateText('announcements', 6)).toBe('annou…');
    expect(textWidth(truncateText('日本語テキスト', 5))).toBeLessThanOrEqual(5);
    expect(truncateText('abc', 0)).toBe('');
  });
});

describe('columnWidths', () => {
  const headers = ['канал', 'сообщений', 'id'];
  const rows = [
    ['general', '1204', '7f3a'],
    ['announcements', '18', 'c21'],
  ];

  it('по самой широкой ячейке или заголовку', () => {
    expect(columnWidths([{}, {}, {}], headers, rows)).toEqual([13, 9, 4]);
  });

  it('width — ровно, maxWidth — не шире', () => {
    expect(columnWidths([{ maxWidth: 8 }, { width: 5 }, {}], headers, rows)).toEqual([8, 5, 4]);
  });

  it('minWidth — не уже', () => {
    expect(columnWidths([{}, {}, { minWidth: 6 }], headers, rows)).toEqual([13, 9, 6]);
  });

  it('maxTotal — сужаются самые широкие, пока не влезут', () => {
    const widths = columnWidths([{}, {}, {}], headers, rows, 30);

    expect(tableWidth(widths)).toBe(30);
    expect(widths).toEqual([8, 8, 4]);
  });

  it('maxTotal не сужает колонку с width и ниже минимума', () => {
    const widths = columnWidths([{ width: 13 }, { minWidth: 9 }, {}], headers, rows, 20);

    expect(widths).toEqual([13, 9, 2]);
  });
});

describe('tableWidth', () => {
  it('рамка: три знака на колонку и один в конце', () => {
    expect(tableWidth([5, 3])).toBe(15);
  });
});
