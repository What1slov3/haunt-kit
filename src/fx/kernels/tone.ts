import { luminance, type Rgb } from '../../filtered-image/image-filters';

/*
 * Тональные ядра: яркость или цвет пикселя → новый цвет, без соседей. Карта градиента (duotone,
 * gradient-map, thermal), постеризация, порог, светодиодное табло. Чистые функции на массивах RGBA.
 */

/**
 * Тепловая палитра — научная шкала, а не цвет темы: «холодное» чёрное → фиолетовое → красное →
 * оранжевое → жёлтое → белое «горячее». Тема её не перекрашивает — так же, как не перекрашивает карту.
 */
export const THERMAL_RAMP: readonly Rgb[] = [
  [0, 0, 0],
  [32, 0, 96],
  [128, 0, 140],
  [210, 40, 60],
  [250, 130, 0],
  [255, 220, 40],
  [255, 255, 255],
];

/** Цвет на шкале в точке t ∈ [0, 1] — линейно между соседними цветами */
export function sampleRamp(
  ramp: readonly Rgb[],
  t: number,
  out: number[] | Uint8ClampedArray,
  at = 0,
) {
  const last = ramp.length - 1;
  const v = Math.min(Math.max(t, 0), 1) * last;
  const i = Math.min(Math.floor(v), last - 1);
  const f = v - i;
  const a = ramp[Math.max(i, 0)]!;
  const b = ramp[Math.min(i + 1, last)]!;

  out[at] = a[0] + (b[0] - a[0]) * f;
  out[at + 1] = a[1] + (b[1] - a[1]) * f;
  out[at + 2] = a[2] + (b[2] - a[2]) * f;
}

/** Карта градиента: яркость → цвет шкалы. Duotone — шкала из двух цветов, thermal — THERMAL_RAMP */
export function gradientMap(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: readonly Rgb[],
): Uint8ClampedArray {
  if (ramp.length < 2) throw new Error('gradientMap: в шкале нужно хотя бы два цвета');

  const out = new Uint8ClampedArray(width * height * 4);

  // Таблица на 256 уровней: яркость считается на кодированных байтах, так что ступеней больше не бывает
  const table = new Uint8ClampedArray(256 * 3);

  for (let level = 0; level < 256; level++) sampleRamp(ramp, level / 255, table, level * 3);

  for (let i = 0; i < out.length; i += 4) {
    const level = Math.round(luminance(source[i]!, source[i + 1]!, source[i + 2]!) * 255) * 3;

    out[i] = table[level]!;
    out[i + 1] = table[level + 1]!;
    out[i + 2] = table[level + 2]!;
    out[i + 3] = 255;
  }

  return out;
}

/** Постеризация: каждый канал — на `levels` равных ступенях (2 — восемь цветов, 4 — 64) */
export function posterize(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number,
): Uint8ClampedArray {
  const steps = Math.max(2, Math.round(levels)) - 1;
  const out = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < out.length; i += 4) {
    out[i] = (Math.round((source[i]! / 255) * steps) / steps) * 255;
    out[i + 1] = (Math.round((source[i + 1]! / 255) * steps) / steps) * 255;
    out[i + 2] = (Math.round((source[i + 2]! / 255) * steps) / steps) * 255;
    out[i + 3] = 255;
  }

  return out;
}

/** Средняя яркость кадра 0…1 — порог по умолчанию у threshold: половина площади краски, половина пусто */
export function meanLuminance(source: Uint8ClampedArray, width: number, height: number): number {
  let sum = 0;

  for (let i = 0; i < width * height * 4; i += 4) {
    sum += luminance(source[i]!, source[i + 1]!, source[i + 2]!);
  }

  return width * height ? sum / (width * height) : 0.5;
}

/** Чистое ч/б: яркость выше порога — «краска», ниже — «пусто» (цвета из шкалы краски темы) */
export function thresholdPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  empty: Rgb,
  ink: Rgb,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < out.length; i += 4) {
    const color = luminance(source[i]!, source[i + 1]!, source[i + 2]!) > threshold ? ink : empty;

    out[i] = color[0];
    out[i + 1] = color[1];
    out[i + 2] = color[2];
    out[i + 3] = 255;
  }

  return out;
}

export interface LedOptions {
  /** Цвет табло (dot-matrix) — яркость решает силу свечения; null — свой цвет пикселя (led) */
  ink: Rgb | null;
  /** Цвет выключенного диода — фон под точками */
  off: Rgb;
  /** Ступеней яркости: у табло их немного, иначе пропадает характер */
  levels: number;
  /** Насколько светится выключенный диод: 0…1 от цвета включённого, чтобы сетка была видна и в тени */
  floor?: number;
}

/**
 * Цвет каждого «диода» табло. Сами круги и ореол рисует холст (маска на ячейку), здесь — только цвет:
 * яркость квантуется на `levels` ступеней, выключенный диод слегка светится — сетка видна в тенях.
 */
export function ledPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  options: LedOptions,
): Uint8ClampedArray {
  const steps = Math.max(2, Math.round(options.levels)) - 1;
  const floor = options.floor ?? 0.12;
  const out = new Uint8ClampedArray(width * height * 4);
  const { ink, off } = options;

  for (let i = 0; i < out.length; i += 4) {
    const r = source[i]!;
    const g = source[i + 1]!;
    const b = source[i + 2]!;
    const level = Math.round(luminance(r, g, b) * steps) / steps;
    const lit = floor + (1 - floor) * level;

    if (ink) {
      out[i] = off[0] + (ink[0] - off[0]) * lit;
      out[i + 1] = off[1] + (ink[1] - off[1]) * lit;
      out[i + 2] = off[2] + (ink[2] - off[2]) * lit;
    } else {
      // Цветной диод: оттенок пикселя на полной насыщенности, яркость — ступенями
      const peak = Math.max(r, g, b, 1);

      out[i] = off[0] + ((r / peak) * 255 - off[0]) * lit;
      out[i + 1] = off[1] + ((g / peak) * 255 - off[1]) * lit;
      out[i + 2] = off[2] + ((b / peak) * 255 - off[2]) * lit;
    }

    out[i + 3] = 255;
  }

  return out;
}
