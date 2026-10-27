import { describe, expect, it } from 'vitest';

import { tickerParts } from './ticker-parts';

describe('tickerParts', () => {
  it('цифры катятся, остальное стоит', () => {
    expect(tickerParts('-12%')).toEqual([
      { key: 'p4', char: '-', digit: null },
      { key: 'p3', char: '1', digit: 1 },
      { key: 'p2', char: '2', digit: 2 },
      { key: 'p1', char: '%', digit: null },
    ]);
  });

  it('ключи — с конца: разряд единиц тот же при росте числа', () => {
    const before = tickerParts('999');
    const after = tickerParts('1 000');

    expect(before.at(-1)?.key).toBe(after.at(-1)?.key);
    expect(after[0]).toEqual({ key: 'p5', char: '1', digit: 1 });
  });

  it('неразрывный пробел разрядов — не цифра', () => {
    expect(tickerParts('1 240')[1]).toEqual({ key: 'p4', char: ' ', digit: null });
  });
});
