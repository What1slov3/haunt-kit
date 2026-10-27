export { coverRect } from '../../filtered-image/image-filters';

/*
 * Переходы между картинками — чистые функции, грузятся через import() при первом переходе.
 * Маски мягкие: у каждой клетки грубой сетки свой порог 0…1, а альфа нарастает не скачком, а по полосе
 * `band` вокруг порога. Сетка растягивается со сглаживанием, поэтому край выходит размытым, без клеток.
 * Пороги считаются один раз на переход, кадр — только плавная ступень от прогресса.
 */

export type TransitionEffect = 'fade' | 'focus' | 'reveal' | 'wipe';

/** Эффекты на маске; fade и focus — прозрачность, масштаб и размытие всего кадра */
export type MaskEffect = Extract<TransitionEffect, 'reveal' | 'wipe'>;

export const isMaskEffect = (effect: TransitionEffect): effect is MaskEffect =>
  effect === 'reveal' || effect === 'wipe';

/** Ширина мягкого края в долях прогресса: шире — туманнее граница */
export const MASK_BAND: Record<MaskEffect, number> = { reveal: 0.35, wipe: 0.22 };

/** Клеток маски по длинной стороне: на грубой сетке растяжение даёт гранёные пятна в начале перехода */
export const MASK_CELLS = 160;

/** Хэш целых координат → 0…1: детерминированный шум без таблиц и Math.random — кадр повторяем */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

/** Плавный шум значений: хэш в узлах решётки, между ними — интерполяция с плавной ступенью */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * Пороги клеток:
 * - reveal — расстояние от центра, сбитое плавным шумом: картинка расходится от середины, как чернила
 *   по мокрой бумаге;
 * - wipe — диагональ слева сверху направо вниз с лёгкой волной шума: шторка без линейки.
 * Оба растянуты на 0…1, иначе переход «стоит» в начале и в конце.
 */
export function transitionThresholds(
  effect: MaskEffect,
  cols: number,
  rows: number,
  seed = 1,
): Float32Array {
  const out = new Float32Array(cols * rows);
  const long = Math.max(cols, rows);
  // Пятно шума — около четверти длинной стороны: крупные мягкие лепестки, не рябь
  const scale = long / 4;
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const noise = valueNoise(x / scale, y / scale, seed);
      let value: number;

      if (effect === 'reveal') {
        // Расстояние в клетках, а не в долях: на широкой рамке круг остаётся кругом
        const dx = (x + 0.5 - cols / 2) / (long / 2);
        const dy = (y + 0.5 - rows / 2) / (long / 2);

        value = Math.hypot(dx, dy) * 0.65 + noise * 0.35;
      } else {
        value = ((x + 0.5) / cols) * 0.7 + ((y + 0.5) / rows) * 0.3 + (noise - 0.5) * 0.12;
      }

      out[y * cols + x] = value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }

  if (max > min) {
    for (let i = 0; i < out.length; i++) out[i] = (out[i]! - min) / (max - min);
  }

  return out;
}

/** Плавная ступень 0…1 */
export function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);

  return x * x * (3 - 2 * x);
}

/**
 * Маска кадра (RGBA для putImageData): альфа клетки растёт по полосе `band` вокруг её порога.
 * Прогресс растянут на ширину полосы — в 0 не видно ничего, в 1 видно всё. Возвращает долю видимого.
 */
export function fillMask(
  thresholds: Float32Array,
  progress: number,
  band: number,
  out: Uint8ClampedArray,
): number {
  const front = progress * (1 + band);
  let total = 0;

  for (let i = 0; i < thresholds.length; i++) {
    const alpha = smoothstep((front - thresholds[i]!) / band);

    out[i * 4 + 3] = Math.round(alpha * 255);
    total += alpha;
  }

  return thresholds.length ? total / thresholds.length : 1;
}

/** Плавное начало и конец перехода: без рывка в первый и последний кадр */
export function easeInOut(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);

  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** Быстрый старт и долгое мягкое приземление — для масштаба и размытия */
export function easeOut(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);

  return 1 - (1 - x) ** 3;
}
