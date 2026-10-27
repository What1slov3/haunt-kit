import { describe, expect, it } from 'vitest';

import {
  asciiGrid,
  ASCII_RAMP,
  bayerMatrix,
  BAYER_8,
  coverRect,
  ditherPixels,
  gridSize,
  inkRamp,
  luminance,
  type Rgb,
} from './image-filters';

/** Сплошная заливка width×height одним серым */
function gray(width: number, height: number, value: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    data.set([value, value, value, 255], i);
  }

  return data;
}

const black: Rgb = [0, 0, 0];
const white: Rgb = [255, 255, 255];

describe('bayerMatrix', () => {
  it('2×2 — классическая [[0, 2], [3, 1]]', () => {
    expect(bayerMatrix(2)).toEqual([0, 2, 3, 1]);
  });

  it('8×8 содержит каждый порог 0…63 ровно один раз', () => {
    expect([...BAYER_8].sort((a, b) => a - b)).toEqual(Array.from({ length: 64 }, (_, i) => i));
  });

  it('4×4 совпадает с эталонной матрицей', () => {
    expect(bayerMatrix(4)).toEqual([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
  });

  it('не степень двойки — ошибка', () => {
    expect(() => bayerMatrix(6)).toThrow();
  });
});

describe('ditherPixels', () => {
  it('чёрное и белое остаются чистыми, без узора', () => {
    const dark = ditherPixels(gray(8, 8, 0), 8, 8, [black, white]);
    const light = ditherPixels(gray(8, 8, 255), 8, 8, [black, white]);

    expect(dark.every((value, i) => (i % 4 === 3 ? value === 255 : value === 0))).toBe(true);
    expect(light.every((value) => value === 255)).toBe(true);
  });

  it('доля светлых точек повторяет яркость серого', () => {
    const out = ditherPixels(gray(8, 8, 64), 8, 8, [black, white]);
    let lit = 0;

    for (let i = 0; i < out.length; i += 4) if (out[i] === 255) lit++;

    // 64 / 255 ≈ 25 % → 16 точек из 64
    expect(lit).toBe(16);
  });

  it('меньше двух цветов — ошибка', () => {
    expect(() => ditherPixels(gray(1, 1, 0), 1, 1, [black])).toThrow();
  });
});

describe('inkRamp', () => {
  const mid: Rgb = [128, 128, 128];

  it('на тёмном фоне шкала идёт от тёмного к светлому', () => {
    expect(inkRamp([white, mid, black], black)).toEqual([black, mid, white]);
  });

  it('на светлом фоне — от светлого к тёмному: пустое место сливается с фоном', () => {
    expect(inkRamp([black, white, mid], white)).toEqual([white, mid, black]);
  });
});

describe('asciiGrid', () => {
  it('светлое — плотный символ, тёмное — пробел', () => {
    const light = asciiGrid(gray(3, 1, 255), 3, 1);
    const dark = asciiGrid(gray(2, 2, 0), 2, 2);

    expect(light.rows).toEqual([ASCII_RAMP.at(-1)!.repeat(3)]);
    expect(light.density[0]).toBeCloseTo(1);
    expect(dark.rows).toEqual(['  ', '  ']);
  });
});

describe('геометрия', () => {
  it('coverRect обрезает широкий исходник по бокам', () => {
    expect(coverRect(200, 100, 100, 100)).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
  });

  it('gridSize считает неполную ячейку у края', () => {
    expect(gridSize(10, 9, 4)).toEqual({ cols: 3, rows: 3 });
  });

  it('luminance — веса Rec. 709', () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(1);
    expect(luminance(0, 255, 0)).toBeCloseTo(0.7152);
  });
});
