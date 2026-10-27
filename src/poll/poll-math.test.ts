import { describe, expect, it } from 'vitest';

import { pollResults, toggleChoice } from './poll-math';

const options = (...votes: number[]) => votes.map((value, i) => ({ id: `o${i}`, votes: value }));

describe('pollResults', () => {
  it('проценты от суммы голосов складываются ровно в 100', () => {
    const results = pollResults(options(1, 1, 1));

    expect(results.map((r) => r.percent)).toEqual([34, 33, 33]);
    expect(results.reduce((sum, r) => sum + r.percent, 0)).toBe(100);
  });

  it('остаток уходит вариантам с большей дробной частью', () => {
    expect(pollResults(options(2, 5, 6)).map((r) => r.percent)).toEqual([15, 39, 46]);
  });

  it('лидеры — все с наибольшим числом голосов', () => {
    expect(pollResults(options(3, 5, 5)).map((r) => r.leading)).toEqual([false, true, true]);
  });

  it('без голосов — нули и без лидера', () => {
    expect(pollResults(options(0, 0))).toEqual([
      { id: 'o0', votes: 0, percent: 0, leading: false },
      { id: 'o1', votes: 0, percent: 0, leading: false },
    ]);
  });

  it('при множественном выборе — доли от проголосовавших, сумма больше 100', () => {
    expect(pollResults(options(6, 4, 9), { voters: 10 }).map((r) => r.percent)).toEqual([
      60, 40, 90,
    ]);
  });

  it('отрицательные голоса считаются нулём', () => {
    expect(pollResults(options(-2, 2)).map((r) => r.percent)).toEqual([0, 100]);
  });
});

describe('toggleChoice', () => {
  it('один вариант — замена', () => {
    expect(toggleChoice(['a'], 'b')).toEqual(['b']);
  });

  it('несколько — переключение', () => {
    expect(toggleChoice(['a'], 'b', { multiple: true })).toEqual(['a', 'b']);
    expect(toggleChoice(['a', 'b'], 'a', { multiple: true })).toEqual(['b']);
  });

  it('сверх max не добавляет, но снять можно', () => {
    expect(toggleChoice(['a', 'b'], 'c', { multiple: true, max: 2 })).toEqual(['a', 'b']);
    expect(toggleChoice(['a', 'b'], 'b', { multiple: true, max: 2 })).toEqual(['a']);
  });
});
