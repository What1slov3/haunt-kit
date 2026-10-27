import { luminance } from '../../filtered-image/image-filters';

/*
 * Сортировка пикселей — глитч: в каждой строке (или столбце) ищутся отрезки подряд идущих пикселей с
 * яркостью в диапазоне [low, high], и пиксели внутри отрезка переставляются по яркости. Тени и блики
 * остаются на месте и держат рисунок, а средние тона «стекают» полосами.
 */

export interface PixelSortOptions {
  /** Нижняя граница сортируемой яркости 0…1 */
  low: number;
  /** Верхняя граница */
  high: number;
  /** По столбцам — полосы вертикальные, «стекают» вниз */
  vertical: boolean;
}

export function pixelSort(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  options: PixelSortOptions,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(source);
  const lines = options.vertical ? width : height;
  const length = options.vertical ? height : width;
  const index = (line: number, k: number) =>
    options.vertical ? k * width + line : line * width + k;
  const keys = new Float32Array(length);
  const order: number[] = [];
  const buffer = new Uint8ClampedArray(length * 4);

  for (let line = 0; line < lines; line++) {
    for (let k = 0; k < length; k++) {
      const p = index(line, k) * 4;

      keys[k] = luminance(source[p]!, source[p + 1]!, source[p + 2]!);
    }

    let start = 0;

    while (start < length) {
      const key = keys[start]!;

      if (key < options.low || key > options.high) {
        start++;
        continue;
      }

      let end = start;

      while (end < length && keys[end]! >= options.low && keys[end]! <= options.high) end++;

      // Отрезок [start, end): индексы по возрастанию яркости, затем пиксели в этом порядке
      order.length = 0;

      for (let k = start; k < end; k++) order.push(k);

      order.sort((a, b) => keys[a]! - keys[b]!);

      for (let k = 0; k < order.length; k++) {
        const from = index(line, order[k]!) * 4;

        buffer.set(source.subarray(from, from + 4), k * 4);
      }

      for (let k = 0; k < order.length; k++) {
        const to = index(line, start + k) * 4;

        out.set(buffer.subarray(k * 4, k * 4 + 4), to);
      }

      start = end;
    }
  }

  return out;
}
