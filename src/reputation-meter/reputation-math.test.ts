import { describe, expect, it } from 'vitest';

import { historyDelta, meterSpan, tierOf } from './reputation-math';

describe('meterSpan', () => {
  it('от минимума, если ноль не на шкале', () => {
    expect(meterSpan(250, 0, 1000)).toEqual({ start: 0, end: 0.25, zero: null });
  });

  it('от нуля в сторону значения, если шкала через ноль', () => {
    expect(meterSpan(50, -100, 100)).toEqual({ start: 0.5, end: 0.75, zero: 0.5 });
    expect(meterSpan(-50, -100, 100)).toEqual({ start: 0.25, end: 0.5, zero: 0.5 });
  });

  it('значение за пределами прижимается к краю', () => {
    expect(meterSpan(5000, 0, 1000).end).toBe(1);
    expect(meterSpan(-500, -100, 100).start).toBe(0);
  });

  it('пустая шкала — без заливки', () => {
    expect(meterSpan(5, 10, 10)).toEqual({ start: 0, end: 0, zero: null });
  });
});

describe('tierOf', () => {
  const tiers = [
    { from: 500, label: 'Опора' },
    { from: 0, label: 'Новичок' },
    { from: 100, label: 'Свой' },
  ];

  it('текущая и следующая ступень', () => {
    expect(tierOf(250, tiers)).toEqual({
      tier: { from: 100, label: 'Свой' },
      next: { from: 500, label: 'Опора' },
    });
  });

  it('ниже первой — без ступени', () => {
    expect(tierOf(-5, tiers)).toEqual({ tier: null, next: { from: 0, label: 'Новичок' } });
  });

  it('на вершине — без следующей', () => {
    expect(tierOf(900, tiers).next).toBeNull();
  });
});

describe('historyDelta', () => {
  it('последнее минус первое', () => {
    expect(historyDelta([10, 14, 9, 22])).toBe(12);
    expect(historyDelta([5])).toBe(0);
  });
});
