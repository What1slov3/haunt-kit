import { describe, expect, it } from 'vitest';

import { isolines, luminanceField } from './marching-squares';
import { grays } from './test-helpers';

// Поле 2×2 построчно: a b / d c
describe('isolines', () => {
  it('один угол выше уровня — один отрезок, концы на серединах рёбер', () => {
    expect([...isolines(Float32Array.from([1, 0, 0, 0]), 2, 2, 0.5)]).toEqual([0, 0.5, 0.5, 0]);
  });

  it('конец отрезка там, где интерполяция даёт уровень', () => {
    // Левый столбец выше целиком — линия сверху вниз через x = 0.25
    expect([...isolines(Float32Array.from([1, 0, 1, 0]), 2, 2, 0.75)]).toEqual([0.25, 0, 0.25, 1]);
  });

  it('всё выше или всё ниже — линий нет', () => {
    expect(isolines(Float32Array.from([1, 1, 1, 1]), 2, 2, 0.5)).toHaveLength(0);
    expect(isolines(Float32Array.from([0, 0, 0, 0]), 2, 2, 0.5)).toHaveLength(0);
  });

  it('седло даёт два отрезка', () => {
    expect(isolines(Float32Array.from([1, 0, 0, 1]), 2, 2, 0.5)).toHaveLength(8);
  });
});

describe('luminanceField', () => {
  it('яркость 0…1', () => {
    expect([...luminanceField(grays([0, 255]), 2, 1)]).toEqual([0, 1]);
  });
});
