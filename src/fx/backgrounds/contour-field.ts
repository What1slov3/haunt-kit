import { isolines } from '../kernels/marching-squares';

import { fbm3, type Noise3 } from './noise';

/*
 * Плывущие горизонтали — ядро фона `contour` на CPU. Поле высот — фрактальный шум в узлах грубой
 * сетки (клетка ~24 px), изолинии — тот же marching squares, что у фильтра `contour`. Сетка грубая
 * нарочно: линейная интерполяция на рёбрах даёт гладкую линию, а узлов на кадр — пара тысяч.
 */

/** Поле высот 0…1 в узлах сетки cols × rows; `scale` — частота шума на узел */
export function sampleHeights(
  noise: Noise3,
  cols: number,
  rows: number,
  scale: number,
  time: number,
  out: Float32Array = new Float32Array(cols * rows),
): Float32Array {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      out[y * cols + x] = 0.5 + 0.5 * fbm3(noise, x * scale, y * scale, time, 3);
    }
  }

  return out;
}

/** `count` уровней внутри (0, 1), равномерно: края шкалы пусты, линии там дали бы мусор */
export function contourLevels(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
}

/** Отрезки всех уровней в координатах узлов; каждый пятый уровень — «индексная» горизонталь */
export function contourSegments(
  heights: Float32Array,
  cols: number,
  rows: number,
  levels: readonly number[],
): { level: number; index: boolean; segments: Float32Array }[] {
  return levels.map((level, i) => ({
    level,
    index: i % 5 === 2,
    segments: isolines(heights, cols, rows, level),
  }));
}
