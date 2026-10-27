import { describe, expect, it } from 'vitest';

import { groupLines, splitReveal } from './split-text';

describe('splitReveal', () => {
  it('слова и пробелы по очереди, пробелы — как есть', () => {
    expect(splitReveal('Привет,  мир').map((token) => [token.type, token.text])).toEqual([
      ['word', 'Привет,'],
      ['space', '  '],
      ['word', 'мир'],
    ]);
  });

  it('номера слов и сквозные номера символов', () => {
    const words = splitReveal('ab cde f').filter((token) => token.type === 'word');

    expect(words.map((token) => [token.word, token.charStart])).toEqual([
      [0, 0],
      [1, 2],
      [2, 5],
    ]);
  });

  it('пробелы по краям не дают пустых слов', () => {
    expect(splitReveal(' a ').map((token) => token.type)).toEqual(['space', 'word', 'space']);
  });
});

describe('groupLines', () => {
  it('одна высота — одна строка, новая высота — следующая', () => {
    expect(groupLines([0, 0, 0, 20, 20, 40])).toEqual([0, 0, 0, 1, 1, 2]);
  });

  it('разница в пару пикселей — та же строка', () => {
    expect(groupLines([10, 11, 12, 30])).toEqual([0, 0, 0, 1]);
  });

  it('пустой список', () => {
    expect(groupLines([])).toEqual([]);
  });
});
