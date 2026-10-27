import { BAYER_8, luminance } from '../../filtered-image/image-filters';

/*
 * Изображение символами Брайля: знак U+2800…U+28FF — это сетка 2×4 точки, каждая точка — свой бит.
 * Знакоместо даёт восемь «пикселей» вместо одного у ASCII — в восемь раз детальнее, и всё ещё чистый
 * текст моно-шрифта (TUI). Точка ставится по яркости с порогом Байера: так передаются полутона, а не
 * только силуэт.
 */

export const BRAILLE_BASE = 0x2800;

/**
 * Биты точек по Unicode: столбец слева — 1, 2, 3 сверху вниз и 7 внизу, справа — 4, 5, 6 и 8.
 * Нижний ряд (7, 8) добавили позже шеститочечного Брайля, поэтому у него старшие биты.
 * Индекс — [ряд][столбец].
 */
const DOT_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;

/** Знак по точкам: dots[ряд][столбец], 4 ряда × 2 столбца */
export function brailleChar(dots: readonly (readonly boolean[])[]): string {
  let bits = 0;

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      if (dots[row]?.[col]) bits |= DOT_BITS[row]![col]!;
    }
  }

  return String.fromCharCode(BRAILLE_BASE + bits);
}

/**
 * Строки Брайля из сетки точек: `source` — исходник, уменьшенный до точки (ширина = 2 × столбцов
 * знаков, высота = 4 × строк). Точка горит, если её яркость выше порога Байера в этой клетке.
 * Ниже `blackPoint` — пусто: иначе почти чёрный фон фото покрывался бы редкой сеткой точек Байера.
 */
export function brailleRows(
  source: Uint8ClampedArray,
  dotsWide: number,
  dotsHigh: number,
  blackPoint = 0.06,
): string[] {
  const cols = Math.ceil(dotsWide / 2);
  const rows = Math.ceil(dotsHigh / 4);
  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    let line = '';

    for (let col = 0; col < cols; col++) {
      let bits = 0;

      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const x = col * 2 + dx;
          const y = row * 4 + dy;

          if (x >= dotsWide || y >= dotsHigh) continue;

          const i = (y * dotsWide + x) * 4;
          const value =
            (luminance(source[i]!, source[i + 1]!, source[i + 2]!) - blackPoint) / (1 - blackPoint);
          const threshold = (BAYER_8[(y % 8) * 8 + (x % 8)]! + 0.5) / 64;

          if (value > threshold) bits |= DOT_BITS[dy]![dx]!;
        }
      }

      line += String.fromCharCode(BRAILLE_BASE + bits);
    }

    lines.push(line);
  }

  return lines;
}
