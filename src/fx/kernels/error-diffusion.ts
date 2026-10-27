import { luminance, type Rgb } from '../../filtered-image/image-filters';

/*
 * Дизеринг диффузией ошибки: пиксель берёт ближайший уровень шкалы краски, а разницу (ошибку) отдаёт
 * ещё не обработанным соседям. В отличие от Байера узор не регулярный — «зернистый», как у печати газеты
 * или экрана первых Mac. Цена — последовательность: каждый пиксель зависит от предыдущих, поэтому только
 * CPU, без шейдера.
 */

/** Соседи и доли ошибки: [dx, dy, вес] */
type Kernel = readonly (readonly [number, number, number])[];

/**
 * Флойд — Стейнберг: вся ошибка уходит четырём соседям (7, 3, 5, 1 шестнадцатых) — тона точные,
 * но на ровных заливках бегут «черви». Проход змейкой (чётные строки слева направо, нечётные —
 * справа налево) их ломает.
 */
const FLOYD: Kernel = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16],
];

/**
 * Аткинсон (Apple, MacPaint): по 1/8 шести соседям — раздаётся только 6/8 ошибки. Светлые и тёмные места
 * «выгорают» в чистый цвет, контраст выше, узор чище — классический вид экрана первых Mac.
 */
const ATKINSON: Kernel = [
  [1, 0, 1 / 8],
  [2, 0, 1 / 8],
  [-1, 1, 1 / 8],
  [0, 1, 1 / 8],
  [1, 1, 1 / 8],
  [0, 2, 1 / 8],
];

export type DiffusionKernel = 'floyd' | 'atkinson';

const kernels: Record<DiffusionKernel, Kernel> = { floyd: FLOYD, atkinson: ATKINSON };

/**
 * Дизеринг по шкале краски (`inkRamp`): ramp[0] — пусто, последний — полная краска. Работает с
 * яркостью: уровень шкалы — ближайший к яркости с накопленной ошибкой, цвет — цвет этого уровня.
 */
export function diffuseError(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: readonly Rgb[],
  kernel: DiffusionKernel,
): Uint8ClampedArray {
  const levels = ramp.length - 1;

  if (levels < 1) throw new Error('diffuseError: в палитре нужно хотя бы два цвета');

  const weights = kernels[kernel];
  const serpentine = kernel === 'floyd';
  const values = new Float32Array(width * height);
  const out = new Uint8ClampedArray(width * height * 4);

  for (let p = 0; p < values.length; p++) {
    values[p] = luminance(source[p * 4]!, source[p * 4 + 1]!, source[p * 4 + 2]!);
  }

  for (let y = 0; y < height; y++) {
    const reverse = serpentine && y % 2 === 1;

    for (let step = 0; step < width; step++) {
      const x = reverse ? width - 1 - step : step;
      const p = y * width + x;
      const value = values[p]!;
      const level = Math.min(levels, Math.max(0, Math.round(value * levels)));
      const error = value - level / levels;
      const color = ramp[level]!;

      out[p * 4] = color[0];
      out[p * 4 + 1] = color[1];
      out[p * 4 + 2] = color[2];
      out[p * 4 + 3] = 255;

      for (const [dx, dy, weight] of weights) {
        // Змейкой ошибка идёт в сторону прохода: на обратной строке соседи зеркальны
        const nx = x + (reverse ? -dx : dx);
        const ny = y + dy;

        if (nx < 0 || nx >= width || ny >= height) continue;

        values[ny * width + nx]! += error * weight;
      }
    }
  }

  return out;
}
