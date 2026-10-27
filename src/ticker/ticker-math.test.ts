import { describe, expect, it } from 'vitest';

import { tickerDuration, tickerRepeats } from './ticker-math';

describe('tickerRepeats', () => {
  it('набор шире окна — один раз', () => {
    expect(tickerRepeats(300, 500)).toBe(1);
  });

  it('узкий набор повторяется до ширины окна', () => {
    expect(tickerRepeats(1000, 300)).toBe(4);
    expect(tickerRepeats(900, 300)).toBe(3);
  });

  it('до измерения — один раз', () => {
    expect(tickerRepeats(0, 0)).toBe(1);
    expect(tickerRepeats(800, 0)).toBe(1);
    expect(tickerRepeats(Number.NaN, 100)).toBe(1);
  });
});

describe('tickerDuration', () => {
  it('ширина группы на скорость', () => {
    expect(tickerDuration(1200, 40)).toBe(30);
  });

  it('не быстрее 2 с', () => {
    expect(tickerDuration(50, 100)).toBe(2);
  });

  it('без размеров или скорости — стоит', () => {
    expect(tickerDuration(0, 40)).toBe(0);
    expect(tickerDuration(500, 0)).toBe(0);
  });
});
