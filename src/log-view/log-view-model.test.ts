import { describe, expect, it } from 'vitest';

import { formatLogTime, isNearBottom, visibleLines } from './log-view-model';

describe('isNearBottom', () => {
  it('у края — да, с допуском в пару пикселей', () => {
    expect(isNearBottom({ scrollTop: 600, scrollHeight: 800, clientHeight: 200 })).toBe(true);
    expect(isNearBottom({ scrollTop: 594.4, scrollHeight: 800, clientHeight: 200 })).toBe(true);
  });

  it('прокрутили вверх — нет', () => {
    expect(isNearBottom({ scrollTop: 300, scrollHeight: 800, clientHeight: 200 })).toBe(false);
  });

  it('содержимое короче окна — всегда у края', () => {
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 120, clientHeight: 200 })).toBe(true);
  });
});

describe('visibleLines', () => {
  const lines = [1, 2, 3, 4, 5];

  it('без лимита — все', () => {
    expect(visibleLines(lines)).toBe(lines);
  });

  it('лимит оставляет последние', () => {
    expect(visibleLines(lines, 2)).toEqual([4, 5]);
  });

  it('лимит больше длины — все', () => {
    expect(visibleLines(lines, 10)).toBe(lines);
  });
});

describe('formatLogTime', () => {
  it('часы, минуты, секунды в 24-часовом формате', () => {
    expect(formatLogTime(new Date(2026, 9, 26, 9, 5, 7))).toBe('09:05:07');
    expect(formatLogTime(new Date(2026, 9, 26, 21, 5, 7), 'en')).toBe('21:05:07');
  });
});
