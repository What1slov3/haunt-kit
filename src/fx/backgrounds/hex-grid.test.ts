import { describe, expect, it } from 'vitest';

import { hexCells, hexCenter, hexDistance, pixelToHex, roundHex, waveIntensity } from './hex-grid';

describe('hex-grid', () => {
  it('центр клетки переводится обратно в ту же клетку', () => {
    const cells: [number, number][] = [
      [0, 0],
      [3, -1],
      [-2, 5],
      [7, 2],
    ];

    for (const [q, r] of cells) {
      const { x, y } = hexCenter(q, r, 18);

      expect(pixelToHex(x, y, 18)).toEqual({ q, r });
      // Чуть в сторону от центра — всё ещё та же клетка
      expect(pixelToHex(x + 5, y - 4, 18)).toEqual({ q, r });
    }
  });

  it('округление даёт целую клетку рядом с дробной', () => {
    const { q, r } = roundHex(1.4, -0.6);

    expect(Number.isInteger(q) && Number.isInteger(r)).toBe(true);
    expect(hexDistance({ q, r }, { q: 1, r: -1 })).toBeLessThanOrEqual(1);
  });

  it('расстояние в клетках', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(hexDistance({ q: -1, r: 3 }, { q: 2, r: -1 })).toBe(4);
  });

  it('клетки покрывают прямоугольник', () => {
    const cells = hexCells(200, 120, 18);
    const corners: [number, number][] = [
      [0, 0],
      [199, 119],
      [100, 60],
    ];

    for (const [x, y] of corners) {
      const hex = pixelToHex(x, y, 18);

      expect(cells.some((cell) => cell.q === hex.q && cell.r === hex.r)).toBe(true);
    }
  });

  it('волна: фронт идёт со скоростью и гаснет к концу жизни', () => {
    expect(waveIntensity(7, 0.5, 14)).toBeCloseTo(1 - 0.5 / 1.2);
    expect(waveIntensity(0, 0.5, 14)).toBe(0);
    expect(waveIntensity(7, 1.3, 14)).toBe(0);
    expect(waveIntensity(7, -1)).toBe(0);
  });
});
