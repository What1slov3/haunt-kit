import { describe, expect, it } from 'vitest';

import { flipDelta, relativePoint } from './flip';

describe('relativePoint', () => {
  it('позиция относительно контейнера', () => {
    expect(relativePoint({ left: 130, top: 250 }, { left: 100, top: 200 })).toEqual({
      x: 30,
      y: 50,
    });
  });
});

describe('flipDelta', () => {
  it('элемент уехал вниз — играет из старого места', () => {
    expect(flipDelta({ x: 0, y: 0 }, { x: 0, y: 40 })).toEqual({ x: 0, y: -40 });
  });

  it('новый элемент — без перелёта', () => {
    expect(flipDelta(undefined, { x: 0, y: 40 })).toBeNull();
  });

  it('не сдвинулся (меньше полпикселя) — без анимации', () => {
    expect(flipDelta({ x: 0, y: 10 }, { x: 0.2, y: 10.3 })).toBeNull();
  });

  it('прерванная анимация — продолжает с видимого места, без скачка', () => {
    // Был в y = 0, ехал в 40 и прошёл четверть (видим в 10: сдвиг −30 от раскладки 40); теперь снова в 0
    expect(flipDelta({ x: 0, y: 40 }, { x: 0, y: 0 }, { x: 0, y: -30 })).toEqual({ x: 0, y: 10 });
  });
});
