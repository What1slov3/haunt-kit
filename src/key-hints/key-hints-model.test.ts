import { describe, expect, it } from 'vitest';

import {
  hintLabels,
  letterFromCode,
  matchHints,
  placeHints,
  readingOrder,
} from './key-hints-model';

const isPrefixFree = (labels: string[]) =>
  labels.every((a, i) => labels.every((b, j) => i === j || !b.startsWith(a)));

describe('hintLabels', () => {
  it('хватает букв — по одной', () => {
    expect(hintLabels(3, 'abc')).toEqual(['a', 'b', 'c']);
  });

  it('не хватает — короткие первыми, ни одна не префикс другой', () => {
    expect(hintLabels(3, 'ab')).toEqual(['b', 'aa', 'ab']);
    expect(hintLabels(4, 'ab')).toEqual(['aa', 'ab', 'ba', 'bb']);
  });

  it('много элементов — всё однозначно и уникально', () => {
    const labels = hintLabels(200);

    expect(new Set(labels).size).toBe(200);
    expect(isPrefixFree(labels)).toBe(true);
    expect(Math.max(...labels.map((label) => label.length))).toBe(3);
  });

  it('повторы в алфавите не размножают метки', () => {
    expect(hintLabels(2, 'aab')).toEqual(['a', 'b']);
  });

  it('пусто и одна буква', () => {
    expect(hintLabels(0)).toEqual([]);
    expect(hintLabels(3, '')).toEqual([]);
    expect(hintLabels(1, 'a')).toEqual(['a']);
    expect(hintLabels(2, 'a')).toEqual([]);
  });
});

describe('matchHints', () => {
  const labels = ['s', 'da', 'dd', 'dk'];

  it('префикс — кандидаты, целиком — точное', () => {
    expect(matchHints(labels, 'd')).toEqual({ exact: null, candidates: [1, 2, 3] });
    expect(matchHints(labels, 'dk')).toEqual({ exact: 3, candidates: [3] });
    expect(matchHints(labels, '')).toEqual({ exact: null, candidates: [0, 1, 2, 3] });
    expect(matchHints(labels, 'x')).toEqual({ exact: null, candidates: [] });
  });
});

describe('readingOrder', () => {
  it('строки сверху вниз, в строке слева направо, с допуском по высоте', () => {
    const rects = [
      { left: 200, top: 10, width: 20, height: 20 },
      { left: 10, top: 100, width: 20, height: 20 },
      { left: 50, top: 14, width: 20, height: 28 },
    ];

    expect(readingOrder(rects)).toEqual([2, 0, 1]);
  });
});

describe('placeHints', () => {
  const options = {
    viewport: { width: 400, height: 300 },
    labelWidth: (length: number) => 8 + length * 8,
    labelHeight: 16,
  };

  it('у левого верхнего угла элемента', () => {
    expect(placeHints([{ left: 40, top: 50, width: 30, height: 30 }], ['a'], options)).toEqual([
      { x: 40, y: 50 },
    ]);
  });

  it('внутри окна', () => {
    expect(placeHints([{ left: 395, top: -20, width: 30, height: 30 }], ['ab'], options)).toEqual([
      { x: 374, y: 2 },
    ]);
  });

  it('налезающая метка сдвигается вправо', () => {
    const rects = [
      { left: 10, top: 10, width: 10, height: 10 },
      { left: 14, top: 12, width: 10, height: 10 },
    ];

    expect(placeHints(rects, ['a', 's'], options)).toEqual([
      { x: 10, y: 10 },
      { x: 27, y: 12 },
    ]);
  });
});

describe('letterFromCode', () => {
  it('буква по физической клавише', () => {
    expect(letterFromCode('KeyF')).toBe('f');
    expect(letterFromCode('Digit1')).toBeNull();
    expect(letterFromCode('Escape')).toBeNull();
  });
});
