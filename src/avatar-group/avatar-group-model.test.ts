import { describe, expect, it } from 'vitest';

import { hiddenNamesLabel, splitOverflow } from './avatar-group-model';

describe('splitOverflow', () => {
  it('без max видны все', () => {
    expect(splitOverflow([1, 2, 3])).toEqual({ visible: [1, 2, 3], hidden: [] });
  });

  it('max не меньше длины — «+N» не нужен', () => {
    expect(splitOverflow([1, 2, 3], 3)).toEqual({ visible: [1, 2, 3], hidden: [] });
  });

  it('лишние уходят в скрытые по порядку', () => {
    expect(splitOverflow([1, 2, 3, 4, 5], 2)).toEqual({ visible: [1, 2], hidden: [3, 4, 5] });
  });

  it('max = 0 — всё в «+N»', () => {
    expect(splitOverflow(['a', 'b'], 0)).toEqual({ visible: [], hidden: ['a', 'b'] });
  });
});

describe('hiddenNamesLabel', () => {
  it('короткий список — через запятую', () => {
    expect(hiddenNamesLabel(['Анна', 'Пётр'])).toBe('Анна, Пётр');
  });

  it('длинный обрезается с остатком', () => {
    expect(hiddenNamesLabel(['a', 'b', 'c', 'd'], 2)).toBe('a, b и ещё 2');
  });

  it('остаток формулируется снаружи — для другой локали', () => {
    expect(hiddenNamesLabel(['a', 'b', 'c'], 1, (count) => `+${count} more`)).toBe('a +2 more');
  });
});
