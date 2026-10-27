import { describe, expect, it } from 'vitest';

import { createLimiter } from './limiter';

describe('createLimiter', () => {
  it('один и тот же звук — не чаще своего интервала, другой звук — можно', () => {
    const limiter = createLimiter({ maxVoices: 10, maxPerSecond: 100 });

    expect(limiter.take('hover', 0, 10, 70)).toBe(true);
    expect(limiter.take('hover', 30, 10, 70)).toBe('interval');
    expect(limiter.take('click', 30, 10, 40)).toBe(true);
    expect(limiter.take('hover', 80, 10, 70)).toBe(true);
  });

  it('не больше maxVoices одновременно; голос освобождается по концу звука', () => {
    const limiter = createLimiter({ maxVoices: 2, maxPerSecond: 100 });

    expect(limiter.take('a', 0, 100, 0)).toBe(true);
    expect(limiter.take('b', 10, 100, 0)).toBe(true);
    expect(limiter.take('c', 20, 100, 0)).toBe('voices');
    expect(limiter.take('c', 101, 100, 0)).toBe(true);
  });

  it('не больше maxPerSecond за скользящую секунду', () => {
    const limiter = createLimiter({ maxVoices: 100, maxPerSecond: 3 });

    for (let i = 0; i < 3; i++) expect(limiter.take(`s${i}`, i * 10, 1, 0)).toBe(true);

    expect(limiter.take('s4', 40, 1, 0)).toBe('rate');
    expect(limiter.take('s4', 1001, 1, 0)).toBe(true);
  });

  it('отказ не занимает интервал: после отказа по голосам звук можно повторить сразу', () => {
    const limiter = createLimiter({ maxVoices: 1, maxPerSecond: 100 });

    limiter.take('a', 0, 50, 0);

    expect(limiter.take('b', 10, 50, 1000)).toBe('voices');
    expect(limiter.take('b', 60, 50, 1000)).toBe(true);
  });

  it('остановленный звук освобождает голос и интервал сразу', () => {
    const limiter = createLimiter({ maxVoices: 1, maxPerSecond: 100 });

    limiter.take('motif', 0, 3000, 1000);

    expect(limiter.take('other', 100, 10, 0)).toBe('voices');

    limiter.release('motif', 200);

    expect(limiter.take('motif', 200, 3000, 1000)).toBe(true);
  });
});
