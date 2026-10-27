/*
 * Чистые алгоритмы фильтра изображений: без canvas и DOM, на массивах RGBA. Поэтому их можно
 * проверить в jsdom (там нет canvas), а рисование (render-frame.ts) остаётся тонким слоем поверх.
 * Как это работает по шагам — README.md рядом.
 */

export type FilterMode = 'pixel' | 'dither' | 'ascii';

export type Rgb = readonly [number, number, number];

/**
 * Матрица Байера n×n (n — степень двойки), значения 0…n²−1, построчно.
 * Рекурсия: M(2n) = [[4M, 4M+2], [4M+3, 4M+1]] — каждый следующий порог как можно дальше от
 * предыдущих, поэтому при любой яркости точки распределены равномерно, без сгустков.
 */
export function bayerMatrix(size: number): number[] {
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new Error(`bayerMatrix: размер должен быть степенью двойки ≥ 2, пришло ${size}`);
  }

  let matrix = [0, 2, 3, 1];
  let n = 2;

  while (n < size) {
    const next = new Array<number>(n * 2 * n * 2);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const base = 4 * matrix[y * n + x]!;
        const row = y * 2 * n;

        next[row + x] = base;
        next[row + x + n] = base + 2;
        next[row + n * 2 * n + x] = base + 3;
        next[row + n * 2 * n + x + n] = base + 1;
      }
    }

    matrix = next;
    n *= 2;
  }

  return matrix;
}

/** 8×8 — 64 уровня порога: достаточно для плавных градиентов, а узор ещё читается как «пиксельный» */
export const BAYER_8 = bayerMatrix(8);

/**
 * Относительная яркость 0…1 по весам Rec. 709 прямо на гамма-кодированных sRGB-значениях.
 * Точная линейная яркость темнит средние тона, а глаз сравнивает именно кодированные — для
 * дизеринга и ASCII этот вариант выглядит естественнее и вдвое дешевле.
 */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Шкала «краски» от пустого к полному: первым — цвет, ближайший к фону страницы.
 *
 * Яркость исходника = количество краски. В тёмной теме краска светлая — выходит позитив; в светлой
 * краска тёмная — выходит негатив, как у дизеринговых картинок fumadocs.dev в светлой теме. Зато в
 * обеих темах тёмные места исходника (небо, тень, фон фото) сливаются с фоном страницы, и картинка
 * лежит на ней иллюстрацией, а не тёмным прямоугольником. Порядок цветов от темы не важен.
 */
export function inkRamp(palette: readonly Rgb[], background: Rgb): Rgb[] {
  const ramp = [...palette].sort((a, b) => luminance(...a) - luminance(...b));

  return luminance(...background) > 0.5 ? ramp.reverse() : ramp;
}

/**
 * Упорядоченный дизеринг по шкале краски (`inkRamp`): ramp[0] — пусто, последний — полная краска.
 *
 * Яркость пикселя L ∈ [0, 1] раскладывается между двумя соседними цветами шкалы: v = L·(k−1),
 * нижний цвет — floor(v), доля верхнего — дробная часть. Порог из матрицы Байера в этой клетке решает,
 * какой из двух взять: доля больше порога → верхний. На большой площади доля верхнего цвета и есть
 * исходная яркость, а сам узор регулярный, без шума и «червей» диффузии ошибки.
 */
export function ditherPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: readonly Rgb[],
  matrix: readonly number[] = BAYER_8,
): Uint8ClampedArray {
  const levels = ramp.length - 1;
  const size = Math.round(Math.sqrt(matrix.length));
  const cells = size * size;
  const out = new Uint8ClampedArray(width * height * 4);

  if (levels < 1) {
    throw new Error('ditherPixels: в палитре нужно хотя бы два цвета');
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const value = luminance(source[i]!, source[i + 1]!, source[i + 2]!) * levels;
      const lower = Math.min(Math.floor(value), levels - 1);
      // +0.5 — порог посередине своей ступени: при L = 0 и L = 1 узора нет, цвет чистый
      const threshold = (matrix[(y % size) * size + (x % size)]! + 0.5) / cells;
      const color = ramp[value - lower > threshold ? lower + 1 : lower]!;

      out[i] = color[0];
      out[i + 1] = color[1];
      out[i + 2] = color[2];
      out[i + 3] = 255;
    }
  }

  return out;
}

/** От пустого к плотному: каждый следующий символ закрашивает больше площади ячейки */
export const ASCII_RAMP = ' .:-=+*#%@';

export interface AsciiGrid {
  /** Строки символов, по строке на ряд ячеек */
  rows: string[];
  /** Плотность каждой ячейки 0…1 построчно — по ней рисующий слой задаёт прозрачность */
  density: Float32Array;
}

/**
 * Изображение из символов: яркость ячейки → индекс в наборе символов по плотности. Светлое место —
 * плотный символ в обеих темах, по тому же правилу «яркость = краска», что и у дизеринга (`inkRamp`).
 */
export function asciiGrid(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: string = ASCII_RAMP,
): AsciiGrid {
  const rows: string[] = [];
  const density = new Float32Array(width * height);
  const last = ramp.length - 1;

  for (let y = 0; y < height; y++) {
    let row = '';

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const value = luminance(source[i]!, source[i + 1]!, source[i + 2]!);

      density[y * width + x] = value;
      row += ramp[Math.round(value * last)];
    }

    rows.push(row);
  }

  return { rows, density };
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** Часть исходника, которая покрывает рамку без искажения пропорций — как `object-fit: cover` */
export function coverRect(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): SourceRect {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const sw = width / scale;
  const sh = height / scale;

  return { sx: (sourceWidth - sw) / 2, sy: (sourceHeight - sh) / 2, sw, sh };
}

/** Сколько ячеек помещается в рамку; неполная ячейка у края тоже считается — иначе край пустой */
export function gridSize(
  width: number,
  height: number,
  cellWidth: number,
  cellHeight = cellWidth,
): { cols: number; rows: number } {
  return {
    cols: Math.max(1, Math.ceil(width / cellWidth)),
    rows: Math.max(1, Math.ceil(height / cellHeight)),
  };
}
