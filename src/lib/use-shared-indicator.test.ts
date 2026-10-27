import { describe, expect, it } from 'vitest';

import { invertRect } from './use-shared-indicator';

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height }) as DOMRectReadOnly;

describe('invertRect', () => {
  it('сдвигает и растягивает новый индикатор в прямоугольник старого', () => {
    expect(invertRect(rect(10, 0, 40, 2), rect(70, 0, 80, 2))).toBe(
      'translate(-60px, 0px) scale(0.5, 1)',
    );
  });

  it('тот же прямоугольник — анимировать нечего', () => {
    expect(invertRect(rect(10, 20, 40, 28), rect(10.2, 20, 40, 28))).toBeNull();
  });

  it('нулевой размер нового не делит на ноль', () => {
    expect(invertRect(rect(0, 0, 40, 28), rect(0, 32, 0, 0))).toBe(
      'translate(0px, -32px) scale(1, 1)',
    );
  });
});
