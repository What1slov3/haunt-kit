import { describe, expect, it } from 'vitest';

import { ringGeometry } from './ring-geometry';

describe('ringGeometry', () => {
  it('радиус — по средней линии обода', () => {
    expect(ringGeometry(40, 4, 0.5).radius).toBe(18);
  });

  it('смещение — незаполненная часть окружности', () => {
    const { circumference, offset } = ringGeometry(40, 4, 0.25);

    expect(circumference).toBeCloseTo(2 * Math.PI * 18);
    expect(offset).toBeCloseTo(circumference * 0.75);
  });

  it('доля прижимается к 0…1, NaN — пусто', () => {
    const full = ringGeometry(40, 4, 1.5);

    expect(full.offset).toBe(0);
    expect(ringGeometry(40, 4, -1).offset).toBeCloseTo(full.circumference);
    expect(ringGeometry(40, 4, Number.NaN).offset).toBeCloseTo(full.circumference);
  });

  it('толщина больше размера — нулевой радиус, а не отрицательный', () => {
    expect(ringGeometry(4, 10, 0.5).radius).toBe(0);
  });
});
