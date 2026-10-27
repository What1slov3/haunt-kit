import { describe, expect, it } from 'vitest';

import { stagger, staggerDelay } from './stagger';

describe('staggerDelay', () => {
  it('индекс × шаг', () => {
    expect(staggerDelay(3, { step: 40 })).toBe(120);
  });

  it('не растёт после max и не бывает отрицательной', () => {
    expect(staggerDelay(100, { step: 30, max: 10 })).toBe(300);
    expect(staggerDelay(-2)).toBe(0);
  });
});

describe('stagger', () => {
  it('только индекс, если шаг и потолок не заданы', () => {
    expect(stagger(2)).toEqual({ '--stagger-index': 2 });
  });

  it('шаг — в мс, потолок — числом', () => {
    expect(stagger(1, { step: 25, max: 8 })).toEqual({
      '--stagger-index': 1,
      '--stagger-step': '25ms',
      '--stagger-max': 8,
    });
  });
});
